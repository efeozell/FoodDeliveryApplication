import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantQueryDto } from 'src/dto/restraunt-query.dto';
import { CurrentUser } from 'src/auth/decarators/current-user.decorator';
import { User } from 'src/entity/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'restaurants',
  version: '1',
})
export class RestaurantsController {
  constructor(private readonly restaurantService: RestaurantsService) {}

  @Get()
  async getRestaurants(
    @CurrentUser() user: User,
    @Query() query: RestaurantQueryDto,
  ) {
    const result = await this.restaurantService.getRestaurants(user, query);

    return {
      statusCode: 200,
      data: {
        restaurants: result.data.map((r) => ({
          id: r.id,
          name: r.name,
          cuisine: r.cuisine,
          city: r.city,
          district: r.district,
          address: r.address,
          rating: r.rating,
          reviewCount: r.reviewCount,
          deliveryTime: r.deliveryTime,
          minimumOrder: r.minOrderAmount,
          deliveryFee: r.deliveryFee,
          image: r.image,
          isOpen: r.isOpen,
        })),
        pagination: result.pagination,
      },
    };
  }

  @Get('/:id/menu')
  async getRestaurantMenu(@Param('id') id: string) {
    const menu = await this.restaurantService.getRestaurantMenu(id);
    return menu;
  }

  @Get('/:id')
  async getRestaurantById(@Param('id') id: string) {
    const restaurant = await this.restaurantService.getRestaurantById(id);

    return restaurant;
  }
}
