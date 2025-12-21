import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RegisterDto } from 'src/dto/register.dto';
import { User } from 'src/entity/user.entity';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { UpdateUserDto } from 'src/dto/update.user.dto';
import { Order } from 'src/entity/order.entity';
import { OrderQueryDto } from 'src/dto/order-query.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

interface PaginatedOrders {
  orders: Order[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async createUser(createUserDto: RegisterDto): Promise<User> {
    const { email, password, name, address, role } = createUserDto;
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Bu mail kullaniyor!');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepo.create({
      email,
      password: hashedPassword,
      name,
      role,
      address,
    });

    const savedUser = await this.userRepo.save(user);

    const { password: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword as User;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async me(user: User) {
    const userResult = await this.findById(user.id);
    if (!userResult) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    return {
      statusCode: 200,
      data: {
        id: userResult.id,
        email: userResult.email,
        name: userResult.name,
        role: userResult.role,
        address: userResult.address,
        createdAt: userResult.createdAt,
        updatedAt: userResult.updatedAt,
      },
    };
  }

  async updateUser(user: User, updateData: UpdateUserDto) {
    try {
      const existingUser = await this.findById(user.id);
      if (!existingUser) {
        throw new NotFoundException('Kullanici bulunamadi');
      }

      Object.assign(existingUser, updateData);
      const updatedUser = await this.userRepo.save(existingUser);

      const { password: _, ...userWithoutPassword } = updatedUser;
      return {
        statusCode: 200,
        message: 'Kullanici guncellendi',
        data: {
          id: userWithoutPassword.id,
          email: userWithoutPassword.email,
          name: userWithoutPassword.name,
          role: userWithoutPassword.role,
          address: userWithoutPassword.address,
          createdAt: userWithoutPassword.createdAt,
          updatedAt: userWithoutPassword.updatedAt,
        },
      };
    } catch (error) {
      console.log('Error in updateUser: ', error);
      throw new InternalServerErrorException('Kullanici guncellenemedi');
    }
  }

  async findUserOrders(
    user: User,
    queryDto: OrderQueryDto,
  ): Promise<PaginatedOrders> {
    const { page = 1, limit = 10, status, sort } = queryDto;

    // Cache key'ini query parametreleriyle birlikte olustur
    const cacheKey = `user:${user.id}:orders:page:${page}:limit:${limit}:status:${status ?? 'all'}:sort:${sort ?? 'createdAt:DESC'}`;

    try {
      const cachedData = await this.redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData) as PaginatedOrders;
      }
    } catch (error) {
      console.log('Redis get errot: ', error);
    }

    const queryBuilder = this.orderRepo
      .createQueryBuilder('order') //order tablosunda bir query builder baslat
      .leftJoinAndSelect('order.restaurant', 'restaurant') //order tablosuyla restaurant tablosunu birlestir
      .leftJoinAndSelect('order.orderItems', 'items') //order tablosuyla items tablosunu birlestir
      .where('order.userId = :userId', { userId: user.id }); //daha sonra oder.userId ile eslesenleri getir

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status }); //eger status query'si varsa status'a gore filtrele diyoruz
    }

    const [sortField, sortOrder] = (sort || 'createdAt:DESC').split(':');
    const order = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    //Sadece bu alanlara izin veriyoruz url'den istenmeyen alanlar gelirse default olarak createdAt'a gore sirala
    const allowedSortFields = ['createdAt', 'totalPrice', 'status'];
    if (allowedSortFields.includes(sortField)) {
      queryBuilder.orderBy(`order.${sortField}`, order);
    } else {
      queryBuilder.orderBy('order.createdAt', 'DESC');
    }

    //Veritabaninda 1000 tane veri olabilir ama biz her sayfa icin 10 tane gosteriyoruz
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    //getManyAndCount: Bu metot veritabanına aslında iki soru sorar (tek seferde):
    // "Bana filtrelediğim, sıraladığım o 10 tane siparişi ver." (orders dizisi)
    // "Peki sayfalama yapmasaydım, toplamda kaç tane böyle sipariş vardı?" (totalItems sayısı)
    const [orders, totalItems] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    const result: PaginatedOrders = {
      orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
      },
    };

    // Tum sonucu (orders + pagination) cache'e at
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 300); //5 dakika cachele

    return result;
  }
}
