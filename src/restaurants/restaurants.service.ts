import {
  Injectable,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RestaurantQueryDto } from 'src/dto/restraunt-query.dto';
import { Restaurant } from 'src/entity/restaurant.entity';
import { Category } from 'src/entity/category.entity';
import { User } from 'src/entity/user.entity';
import { Brackets, Repository } from 'typeorm';

@UseGuards(JwtAuthGuard)
@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {}

  async getRestaurants(user: User, restaurantQueryDto: RestaurantQueryDto) {
    try {
      const {
        page = 1,
        limit = 10,
        city,
        cuisine,
        minRating,
        search,
      } = restaurantQueryDto;

      const queryBuilder = this.restaurantRepo
        .createQueryBuilder('restaurant')
        .where('restaurant.isOpen = :isOpen', { isOpen: true });

      if (city) {
        queryBuilder.andWhere('restaurant.city = :city', { city });
      }

      if (cuisine) {
        queryBuilder.andWhere('restaurant.cuisine = :cuisine', { cuisine });
      }

      if (minRating) {
        queryBuilder.andWhere('restaurant.rating >= :minRating', { minRating });
      }

      if (search) {
        queryBuilder.andWhere(
          new Brackets((qb) => {
            qb.where('restaurant.name ILIKE :search', {
              search: `%${search}%`,
            })
              .orWhere('restaurant.description ILIKE :search', {
                search: `%${search}`,
              })
              .orWhere('restaurant.address ILIKE :search', {
                search: `%${search}%`,
              });
          }),
        );
      }

      queryBuilder.orderBy('restaurant.rating', 'DESC');

      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      const [restaurants, total] = await queryBuilder.getManyAndCount();

      const totalPages = Math.ceil(total / limit);

      return {
        data: restaurants,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      console.log('Error in getRestaurants: ', error);
      throw new InternalServerErrorException(
        'Restoranlar getirilirken bir hata!',
      );
    }
  }

  async getRestaurantById(id: string) {
    try {
      const restaurant = await this.restaurantRepo.findOne({
        where: { id },
      });
      if (!restaurant) {
        throw new InternalServerErrorException('Restoran bulunamadi');
      }

      return {
        statusCode: 200,
        data: {
          id: restaurant.id,
          name: restaurant.name,
          cuisine: restaurant.cuisine,
          city: restaurant.city,
          district: restaurant.district,
          address: restaurant.address,
          phone: restaurant.phone,
          rating: restaurant.rating,
          reviewCount: restaurant.reviewCount,
          deliveryTime: restaurant.deliveryTime,
          minimumOrder: restaurant.minOrderAmount,
          deliveryFee: restaurant.deliveryFee,
          image: restaurant.image,
          isOpen: restaurant.isOpen,
        },
      };
    } catch (error) {
      console.log('Error in getRestaurantById: ', error);
      throw new InternalServerErrorException('Restoran getirilirken bir hata!');
    }
  }

  async getRestaurantMenu(id: string) {
    try {
      const restaurant = await this.restaurantRepo.findOne({
        where: { id },
        select: ['id', 'name'],
      });

      if (!restaurant) {
        throw new InternalServerErrorException('Restoran bulunamadi');
      }

      // Kategorileri ve içindeki menu item'ları getir
      const categories = await this.restaurantRepo.manager
        .createQueryBuilder()
        .select('category')
        .from('categories', 'category')
        .leftJoinAndSelect('category.menuItems', 'menuItem')
        .where('category.restaurantId = :restaurantId', {
          restaurantId: id,
        })
        .getMany();

      return {
        statusCode: 200,
        data: {
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
          },
          categories: categories.map((category: any) => ({
            id: category.id,
            name: category.name,
            items: category.menuItems.map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              price: Number(item.price),
              image: item.imageUrl,
              isAvailable: item.isAvaiable,
              inStock: item.isAvaiable,
            })),
          })),
        },
      };
    } catch (error) {
      console.log('Error in getRestaurantMenu: ', error);
      throw new InternalServerErrorException('Menu getirilirken bir hata!');
    }
  }
}
