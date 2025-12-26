import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RestaurantQueryDto } from 'src/dto/restraunt-query.dto';
import { Restaurant } from 'src/entity/restaurant.entity';
import { Category } from 'src/entity/category.entity';
import { User } from 'src/entity/user.entity';
import { Brackets, Repository } from 'typeorm';
import { MenuItem } from 'src/entity/menu_items.entity';
import { CreateRestaurantDto } from 'src/dto/create-restaurant.dto';
import { UpdateRestaurantDto } from 'src/dto/update-restaurant.dto';
import { CreateMenuItemsDto } from 'src/dto/create-menu-items.dto';
import { SearchDto, SearchType } from 'src/dto/search.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@UseGuards(JwtAuthGuard)
@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
    @InjectRedis() private readonly redis: Redis,
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
        throw new NotFoundException('Restoran bulunamadi');
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

      const cacheKey = `restaurant_menu_${id}`;
      const cachedMenu = await this.redis.get(cacheKey);

      if (cachedMenu) {
        return JSON.parse(cachedMenu) as {
          statusCode: number;
          data: {
            restaurant: { id: string; name: string };
            categories: Array<{
              id: string;
              name: string;
              items: Array<{
                id: string;
                name: string;
                description: string;
                price: number;
                image: string;
                isAvailable: boolean;
                inStock: boolean;
              }>;
            }>;
          };
        };
      }

      if (!restaurant) {
        throw new NotFoundException('Restoran bulunamadi');
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

      await this.redis.set(
        cacheKey,
        JSON.stringify({
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
        }),
        'EX',
        3600, // 1 saatlik önbellekleme
      );

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

  async getMenuItemDetails(itemId: string) {
    try {
      const menuItem = await this.menuItemRepo
        .createQueryBuilder('menuItem')
        .leftJoinAndSelect('menuItem.category', 'category')
        .leftJoinAndSelect('menuItem.restaurant', 'restaurant')
        .where('menuItem.id = :itemId', { itemId })
        .getOne();

      if (!menuItem) {
        throw new NotFoundException('Menu item bulunamadi');
      }

      return {
        statusCode: 200,
        data: {
          id: menuItem.id,
          name: menuItem.name,
          description: menuItem.description,
          price: Number(menuItem.price),
          image: menuItem.imageUrl,
          isAvailable: menuItem.isAvaiable,
          restaurant: {
            id: menuItem.restaurant.id,
            name: menuItem.restaurant.name,
          },
          category: {
            id: menuItem.category.id,
            name: menuItem.category.name,
          },
        },
      };
    } catch (error) {
      console.log('Error in getMenuItemDetails: ', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Menu item getirilirken bir hata!',
      );
    }
  }

  async createRestaurant(data: CreateRestaurantDto) {
    try {
      const newRestaurant = this.restaurantRepo.create({
        ...data,
        ownerId: data.ownerId,
        deliveryFee: Number(data.deliveryFee),
      });

      return await this.restaurantRepo.save(newRestaurant);
    } catch (error) {
      console.log('Error in createRestaurant: ', error);
      throw new InternalServerErrorException(
        'Restoran oluşturulurken bir hata oluştu!',
      );
    }
  }

  async saveRestaurant(restaurant: Restaurant) {
    try {
      return await this.restaurantRepo.save(restaurant);
    } catch (error) {
      console.log('Error in saveRestaurant: ', error);
      throw new InternalServerErrorException(
        'Restoran kaydedilirken bir hata oluştu!',
      );
    }
  }

  async updateRestaurant(id: string, data: UpdateRestaurantDto) {
    try {
      const isRestaurantExist = await this.restaurantRepo.findOne({
        where: { id },
      });

      if (!isRestaurantExist) {
        throw new NotFoundException('Restoran bulunamadi');
      }

      const updatedRestaurant = this.restaurantRepo.merge(isRestaurantExist, {
        ...data,
        deliveryFee: data.deliveryFee ? Number(data.deliveryFee) : undefined,
      });

      return await this.restaurantRepo.save(updatedRestaurant);
    } catch (error) {
      console.log('Error in updareRestaurant: ', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Restoran güncellenirken bir hata oluştu!',
      );
    }
  }

  async deleteRestaurant(id: string) {
    try {
      const isRestaurantExist = await this.restaurantRepo.findOne({
        where: { id },
      });

      if (!isRestaurantExist) {
        throw new NotFoundException('Restoran bulunamadi');
      }

      await this.restaurantRepo.remove(isRestaurantExist);
    } catch (error) {
      console.log('Error in deleteRestaurant: ', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Restoran silinirken bir hata oluştu!',
      );
    }
  }

  async addMenuItemsByRestaurantId(
    id: string,
    data: CreateMenuItemsDto,
    imageUrl?: string,
  ) {
    try {
      const isRestaurantExist = await this.restaurantRepo.findOne({
        where: { id },
      });

      if (!isRestaurantExist) {
        throw new NotFoundException('Restoran bulunamadi');
      }

      const category = await this.restaurantRepo.manager.findOne(Category, {
        where: { id: data.categoryId, restaurant: { id } },
      });

      if (!category) {
        throw new NotFoundException('Kategori bulunamadi');
      }

      const newMenuItem = this.menuItemRepo.create({
        restaurant: isRestaurantExist,
        category: category,
        ...data,
        imageUrl,
      });
      const savedMenuItem = await this.menuItemRepo.save(newMenuItem);

      return savedMenuItem;
    } catch (error) {
      console.log('Error in addMenuItemsByRestaurantId: ', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Menu item eklenirken bir hata oluştu!',
      );
    }
  }

  async generalSearch(searchTerm: SearchDto): Promise<{
    restaurant?: Restaurant[];
    menuItem?: MenuItem[];
  }> {
    try {
      const { q, type = 'all', city } = searchTerm;
      const results: { restaurant?: Restaurant[]; menuItem?: MenuItem[] } = {};

      if (type === SearchType.ALL || type === SearchType.RESTAURANT) {
        results.restaurant = await this.searchRestaurants(q, city);
      }

      if (type === SearchType.ALL || type === SearchType.MENU_ITEM) {
        results.menuItem = await this.searchMenuItems(q, city);
      }

      return results;
    } catch (error) {
      console.log('Error in generalSearch: ', error);
      throw new InternalServerErrorException(
        'Genel arama sırasında bir hata oluştu!',
      );
    }
  }

  private async searchRestaurants(q?: string, city?: string) {
    const queryBuilder = this.restaurantRepo.createQueryBuilder('restaurant');

    // Arama terimi varsa isimde ara
    if (q) {
      queryBuilder.where('restaurant.name ILIKE :q', { q: `%${q}%` });
    }

    // Şehir filtresi varsa ekle
    if (city) {
      if (q) {
        queryBuilder.andWhere('restaurant.city = :city', { city });
      } else {
        queryBuilder.where('restaurant.city = :city', { city });
      }
    }

    // Hiçbir filtre yoksa tüm restoranları getir
    return await queryBuilder.take(10).getMany();
  }

  private async searchMenuItems(q?: string, city?: string) {
    const queryBuilder = this.menuItemRepo
      .createQueryBuilder('menuItem')
      .leftJoinAndSelect('menuItem.restaurant', 'restaurant');

    // Arama terimi varsa isim veya açıklamada ara
    if (q) {
      queryBuilder.where(
        '(menuItem.name ILIKE :q OR menuItem.description ILIKE :q)',
        { q: `%${q}%` },
      );
    }

    // Şehir filtresi varsa ekle
    if (city) {
      if (q) {
        queryBuilder.andWhere('restaurant.city = :city', { city });
      } else {
        queryBuilder.where('restaurant.city = :city', { city });
      }
    }

    return await queryBuilder.take(10).getMany();
  }
}
