import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decarators/current-user.decorator';
import { User } from 'src/entity/user.entity';
import { AddItemToCartDto } from 'src/dto/add-item-to-cart.dto';

@Controller({ path: 'cart', version: '1' })
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCartItems(@CurrentUser() user: User) {
    return await this.cartService.getCartItemsByUserId(user.id);
  }

  @Post('/items')
  async addItemToCart(
    @CurrentUser() user: User,
    @Body() data: AddItemToCartDto,
    @Query('clearCart') clearCart?: string,
  ) {
    return await this.cartService.addItemToCart(user.id, data, clearCart);
  }

  @Post('test-cart')
  testCart() {
    throw new NotFoundException('Menu item not found');
  }

  @Patch('/items/:itemId')
  async removeItemFromCart(
    @CurrentUser() user: User,
    @Body() quantity: number,
    @Param('itemId') itemId: string,
  ) {
    return await this.cartService.updateCartItemQuantity(
      user.id,
      itemId,
      quantity,
    );
  }

  @Delete('/items/:itemId')
  async deleteMenuItemFromCart(
    @Param('itemId') itemId: string,
    @CurrentUser() user: User,
  ) {
    return await this.cartService.deleteMenuItemFromCart(user.id, itemId);
  }

  @Delete('/cart')
  async clearCart(@CurrentUser() user: User) {
    return await this.cartService.clearCart(user.id);
  }
}
