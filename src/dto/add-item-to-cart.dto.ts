import { IsString } from 'class-validator';

export class AddItemToCartDto {
  @IsString()
  menuItemId: string;

  @IsString()
  quantity: number;
}
