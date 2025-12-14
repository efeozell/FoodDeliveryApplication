import { Optional } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export enum SearchType {
  RESTAURANT = 'restaurant',
  MENU_ITEM = 'menu_item',
  ALL = 'all',
}

export class SearchDto {
  @Optional()
  @IsString()
  q?: string;

  @Optional()
  @IsString()
  type?: SearchType = SearchType.RESTAURANT;

  @Optional()
  @IsString()
  city?: string;
}
