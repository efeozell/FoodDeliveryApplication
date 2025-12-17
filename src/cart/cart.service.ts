import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AddItemToCartDto } from 'src/dto/add-item-to-cart.dto';
import { CartItem } from 'src/entity/cart-item.entity';
import { MenuItem } from 'src/entity/menu_items.entity';
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

  async addItemToCart(userId: string, data: AddItemToCartDto) {
    const existingCartItem = await this.cartItemRepo
      .createQueryBuilder('cart_item')
      .leftJoinAndSelect('cart_item.restaurant', 'restaurant')
      .leftJoinAndSelect('cart_item.menuItem', 'menuItem')
      .where('cart_item.userId = :userId', { userId })
      .getOne();
    //Eger kullaniciya ait bir sepet varse ve eger bu sepetteki urun eklenecek urunun
    if (existingCartItem) {
      const menuItem = await this.menuItemRepo.findOne({
        where: { id: data.menuItemId },
        relations: ['restaurant'],
      });

      if (!menuItem) {
        throw new NotFoundException('Menu item not found');
      }

      if (existingCartItem.restaurant.id !== menuItem?.restaurant.id) {
        throw new BadRequestException(
          'Sepetinizde farkli bir restorana ait bir urun varken bu restorandan urun ekleyemezsiniz.',
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
        restaurant: menuItem.restaurant,
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

    // Handle empty cart case
    const menuItem = await this.menuItemRepo.findOne({
      where: { id: data.menuItemId },
      relations: ['restaurant'],
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    const newCartItem = this.cartItemRepo.create({
      ...data,
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
}
