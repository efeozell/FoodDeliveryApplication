# 🍔 E-Food Delivery Platform Backend (YemekSepeti Clone)

## 🚀 Proje Adı & Amacı
**Nx Monorepo ve NestJS** kullanılarak geliştirilmiş, mikroservis mimarisine sahip, ölçeklenebilir ve yüksek erişilebilir (High Availability) yemek sipariş altyapısı. Bu proje; kullanıcıların sepet yönetiminden ödeme işlemlerine kadar olan tüm sipariş yaşam döngüsünü **ACID prensiplerine** sadık kalarak, veri tutarsızlığı (Race Condition) yaşatmadan yönetmeyi amaçlar.

---

## 💻 Tech Stack
<p align="left">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=ts,nodejs,nestjs,postgresql,redis,kafka,rabbitmq,docker,git" alt="Tech Stack" />
  </a>
</p>

* **Core:** TypeScript, Node.js, NestJS, Nx Monorepo
* **Database & Cache:** PostgreSQL (TypeORM), Redis
* **Message Brokers:** Kafka, RabbitMQ
* **DevOps:** Docker, Docker Compose

---

## 🌟 Mimari ve Çözülen Zorluklar (Engineering Highlights)

Bu proje sadece basit CRUD işlemlerinden ibaret değildir; gerçek dünya (Production) senaryolarında karşılaşılan kritik problemlere mühendislik çözümleri getirilmiştir:

* 🛡️ **ACID Transactions & Finansal Tutarlılık:** Sipariş oluşturma esnasında stoktan düşme ve kredi kartından bakiye çekme işlemleri tek bir veritabanı Transaction'ı içine alınmıştır. Herhangi bir adımda hata olursa tüm işlemler **Rollback** edilerek veri tutarsızlığının önüne geçilmiştir (Max 2sn SLA).
* 🔒 **Distributed Lock (Redis):** Özellikle indirim kampanyalarında aynı anda butona basılmasıyla oluşan mükerrer siparişleri ve **Double-Spending** (çifte harcama) problemini engellemek için Redis tabanlı dağıtık kilit mekanizması (Distributed Lock) kurgulandı.
* 🔌 **Adapter Design Pattern (Ödeme Geçidi):** Stripe, Iyzico gibi farklı sanal POS sağlayıcılarının sisteme kolayca entegre edilebilmesi ve kodun bağımlılıktan kurtulması (Loose Coupling) için Adapter Design Pattern uygulandı.
* 📨 **Event-Driven İletişim:** Mikroservisler arası asenkron iletişim için Kafka/RabbitMQ kullanıldı. Sipariş onaylandığında bildirim, kurye ve restoran servisleri asenkron olarak tetiklenerek ana akışın bloklanması (Bottleneck) engellendi.
* ⚡ **Caching Stratejisi:** Read-heavy (çok okunan) "Restoran ve Menü" listeleme endpoint'lerinde yanıt süresini < 200ms altında tutmak için Redis Cache entegre edildi.

---

## 🗺️ Sistem Diyagramı

<img width="1917" height="447" alt="image" src="https://github.com/user-attachments/assets/7dfd3ad9-c0b0-458b-a25d-da577a9baa9f" />

Authentication Flow Diagram (Kimlik Doğrulama Akışı)
<img width="1066" height="1030" alt="image" src="https://github.com/user-attachments/assets/db489cba-bd6a-4c35-8cbb-a0ac96701db2" />

System Architecture Overview (Sistem Mimarisi Genel Bakış)
<img width="1063" height="683" alt="image" src="https://github.com/user-attachments/assets/d2fd70cb-9987-432a-8151-afcca27c2b81" />

## Proje Özeti

**YemekYemek** bir NestJS tabanlı yemek sipariş platformudur. Temel özellikleri:

### Teknoloji Stack
- **Backend Framework**: NestJS (Node.js)
- **Database**: PostgreSQL + TypeORM
- **Cache**: Redis
- **Authentication**: JWT + Passport
- **Payment**: Iyzico Payment Gateway
- **File Storage**: AWS S3
- **Logging**: Winston + Logstash

### Ana Modüller
1. **AuthModule**: Kullanıcı kaydı, giriş ve JWT yönetimi
2. **UserModule**: Kullanıcı profil yönetimi
3. **RestaurantsModule**: Restoran ve menü yönetimi
4. **CartModule**: Alışveriş sepeti işlemleri
5. **OrderModule**: Sipariş oluşturma ve takibi

### Kullanıcı Rolleri
- **ADMIN**: Sistem yöneticisi
- **RESTAURANT_OWNER**: Restoran sahibi
- **CUSTOMER**: Müşteri

### Temel İş Akışı
1. Kullanıcı kayıt olur/giriş yapar
2. Restoranları arar ve menüleri görüntüler
3. Ürünleri sepete ekler
4. Sipariş oluşturur ve Iyzico ile ödeme yapar
5. Sipariş durumunu takip eder
6. Restoran sahibi siparişi onaylar ve durumunu günceller


---
