import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from 'src/entity/cart-item.entity';
import { MenuItem } from 'src/entity/menu_items.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem, MenuItem])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
