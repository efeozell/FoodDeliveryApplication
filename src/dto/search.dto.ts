import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum SearchType {
  RESTAURANT = 'restaurant',
  MENU_ITEM = 'menu_item',
  ALL = 'all',
}

export class SearchDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.RESTAURANT;

  @IsOptional()
  @IsString()
  city?: string;
}
