import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantQueryDto } from 'src/dto/restraunt-query.dto';
import { CurrentUser } from 'src/auth/decarators/current-user.decorator';
import { User, UserRole } from 'src/entity/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decarators/roles.decorator';
import { CreateRestaurantDto } from 'src/dto/create-restaurant.dto';
import { UpdateRestaurantDto } from 'src/dto/update-restaurant.dto';
import { CreateMenuItemsDto } from 'src/dto/create-menu-items.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { SearchDto } from 'src/dto/search.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({
  path: 'restaurants',
  version: '1',
})
export class RestaurantsController {
  constructor(private readonly restaurantService: RestaurantsService) {}

  @Roles(UserRole.ADMIN)
  @Post('/create')
  async createRestaurant(@Body() createRestaurantDto: CreateRestaurantDto) {
    const restaurant =
      await this.restaurantService.createRestaurant(createRestaurantDto);

    return {
      statusCode: 201,
      data: {
        restaurant,
      },
    };
  }

  @Roles(UserRole.ADMIN)
  @Post('/:id/menu-items')
  @UseInterceptors(FileInterceptor('image'))
  async addMenuItems(
    @Param('id') id: string,
    @Body() createMenuItemsDto: CreateMenuItemsDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|gif)$/,
        })
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 2 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    const menuItem = await this.restaurantService.addMenuItemsByRestaurantId(
      id,
      createMenuItemsDto,
      file,
    );

    return {
      statusCode: 201,
      data: {
        menuItem,
      },
    };
  }

  @Roles(UserRole.ADMIN)
  @Patch('/update/:id')
  async updateRestaurant(
    @Param('id') id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    const restaurant = await this.restaurantService.updateRestaurant(
      id,
      updateRestaurantDto,
    );

    return restaurant;
  }

  @Roles(UserRole.ADMIN)
  @Delete('/delete/:id')
  async deleteRestaurant(@Param('id') id: string) {
    await this.restaurantService.deleteRestaurant(id);

    return {
      statusCode: 200,
      message: 'Restoran başarıyla silindi',
    };
  }

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

  @Get('/search')
  async generalSearch(@Query() searchTerm: SearchDto) {
    const results = await this.restaurantService.generalSearch(searchTerm);
    return {
      statusCode: 200,
      data: results,
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

  @Get('/menu-items/:id')
  async getMenuItemDetails(@Param('id') id: string) {
    const menuItem = await this.restaurantService.getMenuItemDetails(id);
    return menuItem;
  }
}
