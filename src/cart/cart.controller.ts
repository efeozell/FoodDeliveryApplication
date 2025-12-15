import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
  ) {
    return await this.cartService.addItemToCart(user.id, data);
  }
}
