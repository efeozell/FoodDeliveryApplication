import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entity/user.entity';
import { Restaurant } from '../entity/restaurant.entity';
import { Category } from '../entity/category.entity';
import { MenuItem } from '../entity/menu_items.entity';
import { Order, OrderStatus } from '../entity/order.entity';
import { OrderItem } from '../entity/order-item.entity';

async function seed() {
  // Database bağlantısı
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USERNAME || 'myuser',
    password: process.env.DB_PASSWORD || 'mypassword',
    database: process.env.DB_NAME || 'delivery_app',
    entities: [User, Restaurant, Category, MenuItem, Order, OrderItem],
    synchronize: true, // Şemayı otomatik güncelle
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database bağlantısı başarılı');

    // Veritabanını temizle (cascade delete için sıralama önemli)
    console.log('🗑️  Mevcut veriler temizleniyor...');
    await dataSource.query('TRUNCATE TABLE order_items CASCADE');
    await dataSource.query('TRUNCATE TABLE orders CASCADE');
    await dataSource.query('TRUNCATE TABLE menu_item CASCADE');
    await dataSource.query('TRUNCATE TABLE categories CASCADE');
    await dataSource.query('TRUNCATE TABLE restaurants CASCADE');
    await dataSource.query('TRUNCATE TABLE users CASCADE');
    console.log('✅ Veritabanı temizlendi');

    // Kullanıcılar oluştur
    console.log('👤 Kullanıcılar oluşturuluyor...');
    const userRepo = dataSource.getRepository(User);
    const users: User[] = [];

    // Admin kullanıcı
    users.push(
      userRepo.create({
        email: 'admin@yemekyemek.com',
        password: await bcrypt.hash('admin123', 10),
        name: 'Admin User',
        role: UserRole.ADMIN,
        address: 'İstanbul, Türkiye',
      }),
    );

    // Normal kullanıcılar
    const testEmails = [
      'user1@test.com',
      'user2@test.com',
      'user3@test.com',
      'user4@test.com',
      'user5@test.com',
    ];

    // İlk 5 kullanıcı sabit email'lerle
    for (let i = 0; i < testEmails.length; i++) {
      users.push(
        userRepo.create({
          email: testEmails[i],
          password: await bcrypt.hash('password123', 10),
          name: `Test User ${i + 1}`,
          role: UserRole.CUSTOMER,
          address: `${faker.location.city()}, ${faker.location.streetAddress()}`,
        }),
      );
    }

    // Geri kalan 15 kullanıcı rastgele
    for (let i = 0; i < 15; i++) {
      users.push(
        userRepo.create({
          email: faker.internet.email(),
          password: await bcrypt.hash('password123', 10),
          name: faker.person.fullName(),
          role: UserRole.CUSTOMER,
          address: `${faker.location.city()}, ${faker.location.streetAddress()}`,
        }),
      );
    }

    await userRepo.save(users);
    console.log(`✅ ${users.length} kullanıcı oluşturuldu`);
    console.log('\n📧 Test için kullanıcı bilgileri:');
    console.log('Admin: admin@yemekyemek.com / admin123');
    console.log('Müşteriler (şifre hepsi: password123):');
    users
      .filter((u) => u.role === UserRole.CUSTOMER)
      .slice(0, 5)
      .forEach((u) => console.log(`  - ${u.email}`));

    // Restoranlar oluştur
    console.log('🍽️  Restoranlar oluşturuluyor...');
    const restaurantRepo = dataSource.getRepository(Restaurant);
    const restaurants: Restaurant[] = [];

    const cuisines = [
      'Türk',
      'İtalyan',
      'Çin',
      'Meksika',
      'Hint',
      'Japon',
      'Fast Food',
      'Amerikan',
      'Deniz Ürünleri',
      'Vegan',
    ];
    const cities = [
      'İstanbul',
      'Ankara',
      'İzmir',
      'Bursa',
      'Antalya',
      'Adana',
      'Gaziantep',
    ];
    const istanbulDistricts = [
      'Kadıköy',
      'Beşiktaş',
      'Şişli',
      'Üsküdar',
      'Beyoğlu',
      'Fatih',
      'Sarıyer',
      'Bakırköy',
    ];

    for (let i = 0; i < 15; i++) {
      const city = faker.helpers.arrayElement(cities);
      const district =
        city === 'İstanbul'
          ? faker.helpers.arrayElement(istanbulDistricts)
          : faker.location.city();

      restaurants.push(
        restaurantRepo.create({
          name: faker.company.name() + ' Restaurant',
          cuisine: faker.helpers.arrayElement(cuisines),
          address: `${faker.location.streetAddress()}, ${district}, ${city}`,
          city: city,
          district: district,
          phone: `05${faker.string.numeric(9)}`, // Türk telefon formatı 05XXXXXXXXX
          minOrderAmount: parseFloat(
            faker.number
              .float({ min: 30, max: 100, fractionDigits: 2 })
              .toFixed(2),
          ),
          rating: parseFloat(
            faker.number
              .float({ min: 3.0, max: 5.0, fractionDigits: 2 })
              .toFixed(2),
          ),
          reviewCount: faker.number.int({ min: 10, max: 500 }),
          deliveryTime: faker.number.int({ min: 15, max: 60 }), // dakika
          deliveryFee: parseFloat(
            faker.number
              .float({ min: 0, max: 20, fractionDigits: 2 })
              .toFixed(2),
          ),
          image: faker.image.urlLoremFlickr({ category: 'food,restaurant' }),
          isOpen: faker.datatype.boolean({ probability: 0.8 }), // %80 açık
        }),
      );
    }

    await restaurantRepo.save(restaurants);
    console.log(`✅ ${restaurants.length} restoran oluşturuldu`);

    // Kategoriler ve Menü Öğeleri oluştur
    console.log('📋 Kategoriler ve menü öğeleri oluşturuluyor...');
    const categoryRepo = dataSource.getRepository(Category);
    const menuItemRepo = dataSource.getRepository(MenuItem);

    const categoryNames = [
      'Burgerler',
      'Pizzalar',
      'İçecekler',
      'Tatlılar',
      'Salatalar',
      'Ana Yemekler',
      'Başlangıçlar',
      'Yan Ürünler',
    ];

    for (const restaurant of restaurants) {
      // Her restoran için 3-5 kategori
      const numCategories = faker.number.int({ min: 3, max: 5 });
      const restaurantCategories = faker.helpers.arrayElements(
        categoryNames,
        numCategories,
      );

      for (const catName of restaurantCategories) {
        const category = await categoryRepo.save(
          categoryRepo.create({
            name: catName,
            restaurant: restaurant,
          }),
        );

        // Her kategori için 4-8 menü öğesi
        const numItems = faker.number.int({ min: 4, max: 8 });
        for (let i = 0; i < numItems; i++) {
          await menuItemRepo.save(
            menuItemRepo.create({
              name: faker.commerce.productName(),
              description: faker.commerce.productDescription(),
              price: parseFloat(
                faker.commerce.price({ min: 20, max: 200, dec: 2 }),
              ),
              category: category,
              restaurant: restaurant,
              isAvaiable: faker.datatype.boolean({ probability: 0.9 }),
            }),
          );
        }
      }
    }

    console.log('✅ Kategoriler ve menü öğeleri oluşturuldu');

    // Siparişler oluştur
    console.log('📦 Siparişler oluşturuluyor...');
    const orderRepo = dataSource.getRepository(Order);
    const orderItemRepo = dataSource.getRepository(OrderItem);

    // Tüm menü itemlerini al
    const allMenuItems = await menuItemRepo.find({
      relations: ['restaurant', 'category'],
    });

    const orderStatuses = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.ON_THE_WAY,
      OrderStatus.DELIVIRED,
      OrderStatus.CANCELLED,
    ];

    let totalOrders = 0;

    // Her kullanıcı için 1-4 sipariş oluştur
    for (const user of users) {
      const numOrders = faker.number.int({ min: 1, max: 4 });

      for (let i = 0; i < numOrders; i++) {
        // Rastgele bir restoran seç
        const randomRestaurant = faker.helpers.arrayElement(restaurants);

        // Bu restorana ait menü itemlerini filtrele
        const restaurantMenuItems = allMenuItems.filter(
          (item) => item.restaurant.id === randomRestaurant.id,
        );

        if (restaurantMenuItems.length === 0) continue;

        // 1-5 arası menü öğesi seç
        const numItems = faker.number.int({ min: 1, max: 5 });
        const selectedItems = faker.helpers.arrayElements(
          restaurantMenuItems,
          Math.min(numItems, restaurantMenuItems.length),
        );

        // Sipariş oluştur
        const order = orderRepo.create({
          userId: user.id,
          restaurantId: randomRestaurant.id,
          status: faker.helpers.arrayElement(orderStatuses),
          deliveryAddress: user.address || faker.location.streetAddress(),
          note: faker.datatype.boolean({ probability: 0.3 })
            ? faker.lorem.sentence()
            : undefined,
          totalAmount: 0, // Hesaplanacak
        });

        const savedOrder = await orderRepo.save(order);

        // Sipariş itemlerini oluştur
        let orderTotal = 0;
        for (const menuItem of selectedItems) {
          const quantity = faker.number.int({ min: 1, max: 3 });
          const itemPrice = parseFloat(menuItem.price.toString());
          const itemTotal = itemPrice * quantity;
          orderTotal += itemTotal;

          await orderItemRepo.save(
            orderItemRepo.create({
              orderId: savedOrder.id,
              name: menuItem.name,
              quantity: quantity,
              price: itemPrice,
              totalPrice: itemTotal,
            }),
          );
        }

        // Toplam tutarı güncelle
        savedOrder.totalAmount = orderTotal;
        await orderRepo.save(savedOrder);

        totalOrders++;
      }
    }

    console.log(`✅ ${totalOrders} sipariş oluşturuldu`);

    console.log('\n🎉 Seed işlemi başarıyla tamamlandı!');
    console.log(`
📊 Özet:
- ${users.length} kullanıcı
- ${restaurants.length} restoran
- Kategoriler ve menü öğeleri
- ${totalOrders} sipariş
    `);

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

// Çalıştır
seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
