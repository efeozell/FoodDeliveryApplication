import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
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
import { SearchDto } from 'src/dto/search.dto';
import { S3Service } from 'src/common/services/s3/s3.service';
import { UploadImage } from 'src/common/decorators/upload.decorator';
import { ImageFilePipe } from 'src/common/pipes/image-validation.pipe';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({
  path: 'restaurants',
  version: '1',
})
export class RestaurantsController {
  constructor(
    private readonly restaurantService: RestaurantsService,
    private readonly s3Service: S3Service,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post('/create')
  @UploadImage('file')
  async createRestaurant(
    @Body() createRestaurantDto: CreateRestaurantDto,
    @UploadedFile(ImageFilePipe(2)) file: Express.Multer.File,
  ) {
    const restaurant =
      await this.restaurantService.createRestaurant(createRestaurantDto);

    if (file) {
      const uploadResult = await this.s3Service.uploadFile(file);
      restaurant.image = uploadResult.url;
      await this.restaurantService.saveRestaurant(restaurant);
    }

    return {
      statusCode: 201,
      data: {
        restaurant,
      },
    };
  }

  @Roles(UserRole.ADMIN)
  @Post('/:id/menu-items')
  @UploadImage('image')
  async addMenuItems(
    @Param('id') id: string,
    @Body() createMenuItemsDto: CreateMenuItemsDto,
    @UploadedFile(ImageFilePipe(2)) file: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;

    if (file) {
      const uploadResult = await this.s3Service.uploadFile(file);
      imageUrl = uploadResult.url;
    }

    const menuItem = await this.restaurantService.addMenuItemsByRestaurantId(
      id,
      createMenuItemsDto,
      imageUrl,
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
  @UploadImage('updateRestaurantImage')
  async updateRestaurant(
    @Param('id') id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
    @UploadedFile(ImageFilePipe(2)) file: Express.Multer.File,
  ) {
    const restaurant = await this.restaurantService.updateRestaurant(
      id,
      updateRestaurantDto,
    );

    if (file) {
      const uploadResult = await this.s3Service.uploadFile(file);
      restaurant.image = uploadResult.url;
      await this.restaurantService.saveRestaurant(restaurant);
    }

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

  @Get('/menu-items/:id')
  async getMenuItemDetails(@Param('id') id: string) {
    const menuItem = await this.restaurantService.getMenuItemDetails(id);
    return menuItem;
  }

  @Get('/:id')
  async getRestaurantById(@Param('id') id: string) {
    const restaurant = await this.restaurantService.getRestaurantById(id);

    return restaurant;
  }
}
