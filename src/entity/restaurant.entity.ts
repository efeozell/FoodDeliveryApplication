import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Category } from './category.entity';
import { MenuItem } from './menu_items.entity';
import { Order } from './order.entity';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: false })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  minOrderAmount: number;

  @Column({ default: true })
  isOpen: boolean;

  @Column({ nullable: false })
  cuisine: string;

  @Column({ nullable: false })
  city: string;

  @Column({ nullable: false })
  district: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: false })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'int', nullable: false })
  deliveryTime: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  phone: string;

  //Bir restorant'in birden fazla menuItem'i olabilir
  @OneToMany(() => MenuItem, (menuItem) => menuItem.restaurant)
  menuItems: MenuItem[];

  //Bir restorant'in birden fazla kategorisi olabilir
  @OneToMany(() => Category, (category) => category.restaurant)
  categories: Category[];

  @OneToMany(() => Order, (order) => order.restaurant)
  orders: Order[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
