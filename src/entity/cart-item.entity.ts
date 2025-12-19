import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { MenuItem } from './menu_items.entity';
import { Restaurant } from './restaurant.entity';

@Entity('cart_items')
@Unique(['user', 'menuItem'])
@Check('"quantity" > 0')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user: User;

  @Column({ type: 'uuid' })
  menuItemId: string;

  @ManyToOne(() => MenuItem, {
    onDelete: 'CASCADE',
    nullable: false,
    eager: true,
  })
  menuItem: MenuItem;

  @ManyToOne(() => Restaurant, {
    onDelete: 'CASCADE',
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
