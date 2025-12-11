import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class RestaurantQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;

  @IsOptional()
  city?: string;

  @IsOptional()
  cuisine?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minRating?: number;

  @IsOptional()
  search?: string;
}
