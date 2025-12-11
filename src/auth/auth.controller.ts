import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from 'src/dto/register.dto';
import { ConfigService } from '@nestjs/config';
import { type Request, type Response } from 'express';
import { LoginDto } from 'src/dto/login.dto';
import { RefreshTokenDto } from 'src/dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    const newUser = await this.authService.register(registerDto);
    return newUser;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Access token'ı cookie'ye kaydet
    response.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 dakika
    });

    // Refresh token'ı cookie'ye kaydet (daha uzun süre)
    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
    });

    const { access_token, refresh_token, ...userWithoutTokens } = result;
    return userWithoutTokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refresh_token;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
    return { message: 'Cikis yapildi' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async refreshToken(
    @Req() request: Request,
    @Body() refreshTokenDto?: RefreshTokenDto,
    @Res({ passthrough: true }) response?: Response,
  ) {
    // Cookie'den veya body'den refresh token al
    const token: string =
      request.cookies?.refresh_token || refreshTokenDto?.refresh_token;

    if (!token) {
      throw new Error('Refresh token bulunamadi');
    }

    const result = await this.authService.refreshToken(token);

    // Yeni token'ları cookie'lere kaydet
    response?.cookie('access_token', result.data.access_token, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 dakika
    });

    response?.cookie('refresh_token', result.data.refresh_token, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
    });

    return result;
  }
}
