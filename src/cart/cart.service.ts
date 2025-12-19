import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CurrentUser } from 'src/auth/decarators/current-user.decorator';
import { AddItemToCartDto } from 'src/dto/add-item-to-cart.dto';
import { CartItem } from 'src/entity/cart-item.entity';
import { MenuItem } from 'src/entity/menu_items.entity';
import { User } from 'src/entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
  ) {}

  async getCartItemsByUserId(userId: string) {
    const cartItems = await this.cartItemRepo
      .createQueryBuilder('cart_item')
      .leftJoinAndSelect('cart_item.menuItem', 'menu_item')
      .leftJoinAndSelect('cart_item.restaurant', 'restaurant')
      .where('cart_item.userId = :userId', { userId })
      .getMany();

    const itemsCount = cartItems.length;
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (item.menuItem?.price ?? 0) * item.quantity;
    }, 0);

    // Sepet boşsa deliveryFee 0, değilse ilk ürünün restoranından al
    const deliveryFee =
      cartItems.length > 0 ? (cartItems[0].restaurant?.deliveryFee ?? 0) : 0;

    const returnData = {
      statusCode: 200,
      data:
        cartItems === null || cartItems === undefined || cartItems.length === 0
          ? []
          : {
              cartItems,
            },
      itemsCount,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
    };

    return returnData;
  }

  async addItemToCart(
    userId: string,
    data: AddItemToCartDto,
    clearCart?: string,
  ) {
    const existingCartItem = await this.cartItemRepo
      .createQueryBuilder('cart_item')
      .leftJoinAndSelect('cart_item.restaurant', 'restaurant')
      .leftJoinAndSelect('cart_item.menuItem', 'menuItem')
      .where('cart_item.userId = :userId', { userId })
      .getOne();
    //Eger kullaniciya ait bir sepet varse ve eger bu sepetteki urun eklenecek urun ile ayni restorana ait
    //degilse hata eger aitse sepete yeni bir urun olarak ekleniyor eger ayni urunsa adet guncelleniyor

    //Query'den gelen clearCart parametresi true ise kullanici sepeti temizlenir ve eklemek istedigi farkli restaronn urunu eklenir
    if (clearCart && clearCart === 'true') {
      await this.cartItemRepo
        .createQueryBuilder()
        .delete()
        .where('userId = :userId', { userId })
        .execute();
    }

    if (existingCartItem) {
      const menuItem = await this.menuItemRepo.findOne({
        where: { id: data.menuItemId },
        relations: ['restaurant'],
      });

      if (!menuItem) {
        throw new NotFoundException('Menu item not found');
      }

      if (existingCartItem.restaurant.id !== menuItem?.restaurant.id) {
        //Buraya hata firlaticaz frontende tarafinda kullaniciya sepetteki urunleri silmek istediginize emin misiniz diye sorulucak eger bize tekrardan POST /cart/items?clearCart=true istek tekrar edilirse sepet temizlenip yeni urun eklenecek.
        throw new BadRequestException(
          'Sepetinizde farkli bir restorana ait bir urun varken bu restorandan urun ekleyemezsiniz.Kullaniciya sepeti temizleyip yenu urunu eklemek istediginize emin misiniz diye sorunuz. Eger emin ise istegi /cart/items?clearCart=true seklinde tekrar gonderiniz.',
        );
      }

      if (data.menuItemId === existingCartItem.menuItem.id) {
        existingCartItem.quantity += data.quantity;
        return {
          message: 'Urunun adedi guncellendi',
          cartItem: await this.cartItemRepo.save(existingCartItem),
        };
      }

      const newCartItem = this.cartItemRepo.create({
        ...data,
        userId,
        restaurant: menuItem.restaurant,
        menuItemId: menuItem.id,
      });
      await this.cartItemRepo.save(newCartItem);
      return {
        statusCode: 201,
        message: 'Urun sepete eklendi',
        data: {
          restaurant: {
            id: menuItem.restaurant.id,
            name: menuItem.restaurant.name,
          },
          items: [
            {
              id: newCartItem.id,
              menuItemId: {
                id: menuItem.id,
                name: menuItem.name,
                price: menuItem.price,
              },
              quantity: newCartItem.quantity,
              itemTotal: menuItem.price * newCartItem.quantity,
            },
          ],
          total: menuItem.price * newCartItem.quantity,
        },
      };
    }

    //Eger sepet yoksa yeni sepet olusturup urunu kaydediyoruz
    const menuItem = await this.menuItemRepo.findOne({
      where: { id: data.menuItemId },
      relations: ['restaurant'],
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    const newCartItem = this.cartItemRepo.create({
      ...data,
      userId,
      restaurant: menuItem.restaurant,
    });
    const savedCartItem = await this.cartItemRepo.save(newCartItem);

    const itemTotal = menuItem.price * data.quantity;
    const total = itemTotal;

    return {
      statusCode: 201,
      message: 'Urun sepete eklendi',
      data: {
        restaurant: {
          id: menuItem.restaurant.id,
          name: menuItem.restaurant.name,
        },
        items: [
          {
            id: savedCartItem.id,
            menuItemId: {
              id: menuItem.id,
              name: menuItem.name,
              price: menuItem.price,
            },
            quantity: savedCartItem.quantity,
            itemTotal: itemTotal,
          },
        ],
        total: total,
      },
    };
  }

  async updateCartItemQuantity(
    userId: string,
    cartItemId: string,
    quantity: number,
  ) {
    const cartItem = await this.cartItemRepo.findOne({
      where: { id: cartItemId, userId },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity < 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    if (quantity == 0) {
      await this.cartItemRepo.remove(cartItem);
    }

    cartItem.quantity += 1;

    const savedData = await this.cartItemRepo.save(cartItem);

    return {
      statusCode: 200,
      message: 'Cart item quantity updated',
      data: {
        savedData,
      },
    };
  }

  async deleteMenuItemFromCart(userId: string, cartItemId: string) {
    const cartItem = await this.cartItemRepo.findOne({
      where: { id: cartItemId, userId },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepo
      .createQueryBuilder()
      .delete()
      .where('id = :id', { id: cartItem.id })
      .execute();

    return {
      statusCode: 200,
      message: 'Cart item deleted successfully',
    };
  }

  async clearCart(userId: string) {
    await this.cartItemRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId })
      .execute();

    return {
      statusCode: 200,
      message: 'Sepetiniz basariyla temizlendi',
    };
  }
}
