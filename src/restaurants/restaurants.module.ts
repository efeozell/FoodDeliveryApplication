import { Module } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from 'src/entity/restaurant.entity';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/user/user.module';
import { MenuItem } from 'src/entity/menu_items.entity';
import { S3Service } from 'src/common/services/s3/s3.service';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, MenuItem]), UserModule],
  providers: [RestaurantsService, S3Service],
  controllers: [RestaurantsController],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
