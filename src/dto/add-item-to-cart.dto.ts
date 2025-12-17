import { IsInt, IsString, Min } from 'class-validator';

export class AddItemToCartDto {
  @IsString()
  menuItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
