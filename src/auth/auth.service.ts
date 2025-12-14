import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { LoginDto } from 'src/dto/login.dto';
import { RegisterDto } from 'src/dto/register.dto';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      const user = await this.userService.createUser(registerDto);

      return {
        statusCode: 201,
        message: 'Kullanici basariyla olusturuldu',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            address: user.address,
          },
        },
      };
    } catch (error) {
      return {
        statusCode: 400,
        message: 'Kullanici olusturulurken hata olustu',
        error: error,
        path: '/api/v1/auth/register',
      };
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.userService.findByEmail(loginDto.email);

      const dummyHash = this.configService.get<string>('DUMMY_HASH') || '';
      const targetPassword = user ? user.password : dummyHash;

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        targetPassword,
      );

      if (!user || !isPasswordValid) {
        throw new UnauthorizedException('Email veya sifre hatali!');
      }

      const accessToken = this.generateAccessToken(
        user.id,
        user.email,
        user.role,
      );
      const refreshToken = await this.generateRefreshToken(user.id);

      return {
        statusCode: 200,
        message: 'Giris basarili',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Giriş işlemi sırasında beklenmedik bir hata oluştu.',
      );
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      // Redis'ten refresh token'ı kontrol et
      const userId = await this.redis.get(`refresh_token:${refreshToken}`);

      if (!userId) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // User bilgilerini al
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Yeni token'lar oluştur
      const newAccessToken = this.generateAccessToken(
        user.id,
        user.email,
        user.role,
      );
      const newRefreshToken = await this.generateRefreshToken(user.id);

      // Eski refresh token'ı sil (rotation)
      await this.redis.del(`refresh_token:${refreshToken}`);

      return {
        statusCode: 200,
        message: 'Token yenilendi',
        data: {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  async logout(refreshToken: string) {
    try {
      // Redis'ten refresh token'ı sil
      await this.redis.del(`refresh_token:${refreshToken}`);
      return {
        statusCode: 200,
        message: 'Logout basarili',
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: 'Logout sirasinda hata olustu',
      };
    }
  }

  private generateAccessToken(
    userId: string,
    email: string,
    role: string,
  ): string {
    const payload = {
      sub: userId,
      email,
      role,
    };
    return this.jwtService.sign(payload);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    // Rastgele güvenli bir refresh token oluştur
    const refreshToken = randomBytes(64).toString('hex');

    // Redis TTL değerini .env'den al (saniye cinsinden, default 7 gün)
    const ttl =
      this.configService.get<number>('REFRESH_TOKEN_REDIS_TTL') || 604800;

    // Redis'e kaydet ve expire time ayarla
    await this.redis.setex(`refresh_token:${refreshToken}`, ttl, userId);

    return refreshToken;
  }
}
