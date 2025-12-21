import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Ip,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import type { Request, Response } from 'express';
import { CurrentUser } from 'src/auth/decarators/current-user.decorator';
import { User } from 'src/entity/user.entity';
import { CartService } from 'src/cart/cart.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller({
  path: 'order',
  version: '1',
})
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly cartService: CartService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createOrder(
    @CurrentUser() user: User,
    @Body() createOrder: any,
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    const cartData = await this.cartService.getCartItemsByUserId(user.id);

    if (
      !cartData.data ||
      cartData.itemsCount === 0 ||
      Array.isArray(cartData.data)
    ) {
      throw new BadRequestException('Sepetiniz bos');
    }

    if (!cartData.data.cartItems || cartData.data.cartItems.length === 0) {
      throw new BadRequestException('Sepette urun bulunamadi');
    }

    const firstCartItem = cartData.data.cartItems[0];

    if (!firstCartItem.menuItem) {
      throw new BadRequestException('Menu item bilgisi eksik');
    }

    if (!firstCartItem.menuItem.restaurant) {
      throw new BadRequestException('Restaurant bilgisi eksik');
    }

    const restaurantId = firstCartItem.menuItem.restaurant.id;

    const orderData = {
      subtotalAmount: cartData.subtotal,
      deliveryFee: cartData.deliveryFee,
      city: createOrder.city,
      data: {
        cartItems: cartData.data.cartItems,
        restaurantId: restaurantId,
        deliveryAddress: createOrder.deliveryAddress,
        note: createOrder.note || '',
      },
    };

    const result = await this.orderService.createOrderAndPaymentForm(
      user,
      orderData,
      ip,
    );

    // HTML formunu direkt döndür
    return res.status(200).send(result.htmlContent);
  }

  @Post('callback')
  @HttpCode(200)
  async handleIyzicoCallback(@Body() body: any, @Res() res: Response) {
    if (!body.token) {
      throw new BadRequestException('Token bulunamadi');
    }

    try {
      const result = await this.orderService.completePayment(body.token);

      return res.redirect(
        `http://localhost:3000/test-mock/success?orderId=${result.orderId}`,
      );
    } catch (error) {
      return res.redirect(
        `http://localhost:3000/test-mock/success?orderId=${error.message}`,
      );
    }
  }
}
