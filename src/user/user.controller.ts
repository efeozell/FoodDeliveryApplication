import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decarators/current-user.decorator';
import { UpdateUserDto } from 'src/dto/update.user.dto';
import { User } from 'src/entity/user.entity';
import { OrderQueryDto } from 'src/dto/order-query.dto';

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'users',
  version: '1',
})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUser() user) {
    return this.userService.me(user);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateMe(@CurrentUser() user: User, @Body() updateData: UpdateUserDto) {
    try {
      return await this.userService.updateUser(user, updateData);
    } catch (error) {
      console.log('Error in updateUser controller: ', error);
      throw new InternalServerErrorException('Kullanici guncellenemedi');
    }
  }

  @Get('me/orders')
  @HttpCode(HttpStatus.OK)
  async getMyOrders(@CurrentUser() user: User, @Query() query: OrderQueryDto) {
    const result = await this.userService.findUserOrders(user, query);

    return {
      statusCode: 200,
      data: {
        orders: result.orders.map((order) => ({
          id: order.id,
          restaurant: {
            id: order.restaurant.id,
            name: order.restaurant.name,
          },
          items: order.orderItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price.toString()),
            totalPrice: parseFloat(item.totalPrice.toString()),
          })),
          totalAmount: parseFloat(order.totalAmount.toString()),
          status: order.status,
          deliveryAddress: order.deliveryAddress,
          createdAt: order.createdAt,
          deliveredAt: order.deliveredAt,
        })),
        pagination: result.pagination,
      },
    };
  }
}
