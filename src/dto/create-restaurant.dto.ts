import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  cuisine: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  deliveryFee: number;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  minOrderAmount: number;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  deliveryTime: number;
}
