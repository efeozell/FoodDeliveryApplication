import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsString()
  @IsNotEmpty()
  cuisine?: string;

  @IsString()
  @IsNotEmpty()
  district?: string;

  @IsString()
  @IsNotEmpty()
  address?: string;

  @IsString()
  @IsNotEmpty()
  phone?: string;

  @IsString()
  image?: string;

  @IsNumber()
  @IsNotEmpty()
  deliveryFee?: number;

  @IsNumber()
  @IsNotEmpty()
  minOrderAmount?: number;

  @IsNumber()
  @IsNotEmpty()
  deliveryTime?: number;
}
