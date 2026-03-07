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



*(Yukarıdaki şema sistemin event-driven yapısını ve servisler arası iletişimi özetlemektedir.)*

---
