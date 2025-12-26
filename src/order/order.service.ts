import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from 'src/entity/order.entity';
import { User, UserRole } from 'src/entity/user.entity';
import { IyzicoService } from 'src/iyzico-service/iyzico-service.service';
import { Repository } from 'typeorm';
import Iyzipay = require('iyzipay');
import { request } from 'http';
import { ConfigService } from '@nestjs/config';
import { CartItem } from 'src/entity/cart-item.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(CartItem) private cartItemRepo: Repository<CartItem>,
    private iyzicoService: IyzicoService,
    private configService: ConfigService,
  ) {}

  //Sepet verilerini alip siparisi startPaymentProcess ile baslatir ve html icerigi dondurur
  async createOrderAndPaymentForm(user: User, data: any, ip: string) {
    // Önce basketItems'ı oluştur (Iyzico için)
    const basketItemsForIyzico = [
      ...data.data.cartItems.map((item) => ({
        id: item.menuItem.id.toString(),
        name: item.menuItem.name,
        category1: item.menuItem.category?.name || 'Yemek',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: Number(item.menuItem.price * item.quantity).toFixed(2),
      })),
      // Teslimat ücretini ekle
      {
        id: 'DELIVERY',
        name: 'Teslimat Ucreti',
        category1: 'Teslimat',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: Number(data.deliveryFee).toFixed(2),
      },
    ];

    // totalAmount'u basketItems toplamından hesapla (yuvarlama tutarlılığı için)
    const totalAmount = basketItemsForIyzico.reduce(
      (sum: number, item) => sum + parseFloat(item.price as string),
      0,
    );

    const order = this.orderRepo.create({
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      status: OrderStatus.PENDING,
      ipAdress: ip,
      basketItems: data.data.cartItems,
      user: { id: user.id },
      restaurant: { id: data.data.restaurantId },
      deliveryAddress: data.data.deliveryAddress,
      orderItems: data.data.cartItems.map((item) => ({
        name: item.menuItem.name,
        menuItem: { id: item.menuItem.id },
        quantity: item.quantity,
        price: Number(item.menuItem.price),
        totalPrice: Number((item.menuItem.price * item.quantity).toFixed(2)),
      })),
      note: data.data.note,
    });

    const savedOrder = await this.orderRepo.save(order);

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: savedOrder.id.toString(),
      price: totalAmount.toFixed(2),
      paidPrice: totalAmount.toFixed(2),
      currency: Iyzipay.CURRENCY.TRY,
      basketId: savedOrder.id.toString(),
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: this.configService.getOrThrow<string>('CALLBACK_URL') || '',
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: {
        id: user.id.toString(),
        name: user.name,
        surname: user.name.split(' ')[1] || user.name,
        gsmNumber: user.email,
        email: user.email,
        //TODO: Development ortaminda olusturuldugu icin sabit degerler kullanildi
        // -gsmNumber, -identityNumver, lastLoginDate
        identityNumber: '11111111111',
        lastLoginDate: '2024-01-01 12:00:00',
        registrationAddress: user.address || 'N/A',
        ip: ip,
        city: data.city,
        country: 'Turkey',
      },
      shippingAddress: {
        contactName: user.name,
        city: data.city,
        country: 'Turkey',
        address: data.data.deliveryAddress,
      },
      billingAddress: {
        contactName: user.name,
        city: data.city,
        country: 'Turkey',
        address: data.data.deliveryAddress,
      },
      basketItems: basketItemsForIyzico,
    };

    console.log(request);

    const result = await this.iyzicoService.startPaymentProcess(request);

    if (result.status !== 'success') {
      throw new BadRequestException(`Iyzico hatasi: ${result.errorMessage}`);
    }

    return {
      htmlContent: result.checkoutFormContent,
      orderId: savedOrder.id,
    };
  }

  //Odeme tamamlandiktan sonra gelen token ile odeme sonucunu alir ve siparisi gunceller kontrol eder.
  async completePayment(token: string) {
    const result = await this.iyzicoService.getPaymentResult(token);

    if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
      throw new BadRequestException('Odeme basarisiz veya onaylanmadi');
    }

    const orderId = result.conversationId || result.basketId;

    const order = await this.orderRepo.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Siparis bulunamadi');
    }

    if (order.status === OrderStatus.PAID) {
      return { orderId: order.id };
    }

    // Tutarları karşılaştır - floating point tolerance ile (0.01 TL)
    const paidAmount = parseFloat(parseFloat(result.paidPrice).toFixed(2));
    const orderAmount = parseFloat(
      parseFloat(order.totalAmount.toString()).toFixed(2),
    );

    const difference = Math.abs(paidAmount - orderAmount);
    if (difference > 0.01) {
      throw new BadRequestException(
        `Tutar uyusmazligi - Beklenen: ${orderAmount} TL, Gelen: ${paidAmount} TL`,
      );
    }

    // Ödeme başarılı, order'ı güncelle
    // Kullanıcının sepetini temizle
    await this.orderRepo.manager.transaction(async (manager) => {
      order.status = OrderStatus.PAID;
      order.iyzicoPaymentId = result.paymentId;
      await manager.save(order);

      await manager.delete(CartItem, { userId: order.userId });
    });

    return { orderId: order.id };
  }

  async getOrderDetails(userId: User, orderId: string) {
    const order = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.id = :orderId', { orderId })
      .andWhere('order.userId = :userId', { userId: userId.id })
      .leftJoinAndSelect('order.restaurant', 'restaurant')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .getOne();

    if (!order) {
      throw new NotFoundException('Siparis bulunamadi');
    }

    return {
      statusCode: 200,
      data: {
        id: order.id,
        restaurant: {
          id: order.restaurantId,
          name: order.restaurant?.name || 'N/A',
          phone: order.restaurant?.phone || 'N/A',
          address: order.restaurant?.address || 'N/A',
        },
      },
      items: order.orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice,
      })),
      subtotal: order.totalAmount,
      deliveryFee: order.restaurant?.deliveryFee ?? 0,
      total: order.totalAmount + (order.restaurant.deliveryFee ?? 0),
      status: order.status,
      deliveryAddress: order.deliveryAddress,
      note: order.note,
      devileredAt: order.deliveredAt || null,
      createdAt: order.createdAt,
    };
  }

  async updateOrderStatus(userId: User, orderId: string, status: OrderStatus) {
    const order = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.id = :orderId', { orderId })
      .leftJoinAndSelect('order.restaurant', 'restaurant')
      .getOne();

    if (!order) {
      throw new NotFoundException('Siparis bulunamadi');
    }

    if (
      userId.role !== UserRole.RESTAURANT_OWNER &&
      userId.role !== UserRole.ADMIN
    ) {
      throw new UnauthorizedException('Yetkiniz yok');
    }

    //Gelen istekdeki kullanicinin restoran sahibi olup olmadigini kontrol etmemiz gerekiyor. Bunu yapmak icin,
    //order kaydindan restoranId'yi alip kullanicinin sahip oldugu restoranlarla karsilastirmamiz lazim.

    if (userId.role === UserRole.RESTAURANT_OWNER) {
      if (order.restaurantId !== order.restaurant.id) {
        throw new UnauthorizedException('Bu siparisi guncelleme yetkiniz yok');
      }
    }

    //eger status DELIVERED ise deliveredAt tarihini de guncelle
    if (status === OrderStatus.DELIVIRED) {
      order.deliveredAt = new Date();
    }

    order.status = status;
    await this.orderRepo.save(order);

    return { message: 'Siparis durumu guncellendi', orderId: order.id };
  }

  async cancelOrder(user: User, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId: user.id },
    });

    if (
      !order ||
      order.status === OrderStatus.DELIVIRED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException('Siparis iptal edilemez');
    }

    //TODO: Eger odeme yapildiysa iade islemi gerceklestirilmeli

    order.status = OrderStatus.CANCELLED;

    await this.orderRepo.save(order);

    return { message: 'Siparis iptal edildi', orderId: order.id };
  }
}
