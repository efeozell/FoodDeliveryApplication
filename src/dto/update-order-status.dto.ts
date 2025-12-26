import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from 'src/entity/order.entity';

export class UpdateOrderStatusDto {
  @IsNotEmpty()
  @IsEnum(OrderStatus, {
    message: 'Gecersiz siparis durumu',
  })
  status: OrderStatus;
}
