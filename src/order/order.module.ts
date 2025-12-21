import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { IyzicoService } from 'src/iyzico-service/iyzico-service.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/entity/order.entity';
import { CartModule } from 'src/cart/cart.module';
import { CartItem } from 'src/entity/cart-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, CartItem]), CartModule],
  providers: [OrderService, IyzicoService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
