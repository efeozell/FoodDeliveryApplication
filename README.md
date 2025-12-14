# YemekSepeti Clone - Backend API Documentation

## 📋 Proje Genel Bakış

Bu proje, **YemekSepeti benzeri** bir online yemek sipariş platformunun NestJS ile geliştirilmiş backend API'sidir.

**Amaç:** Kullanıcıların farklı restoranlardan menüleri inceleyip sepet oluşturabildiği, restoranların ürün yönetimini yapabildiği ve sipariş yaşam döngüsünün (hazırlanıyor, yolda, teslim edildi vb.) yönetildiği **ölçeklenebilir** bir backend sistemi kurmak.

**Çözülen Problem:** Çoklu restoran ve menü karmaşasını organize etmek, sipariş anındaki veri tutarlılığını (fiyat değişimi, stok kontrolü vb.) garanti altına almak.

**Temel Değer Önerisi:** Hızlı, tutarlı ve güvenilir bir sipariş işleme altyapısı sunmak.

---

## 🎯 Core Technical Requirements

| Domain      | Frontend Beklentisi                            | Teknik Gereksinim                               | Performans Hedefi              | SLA                        |
| ----------- | ---------------------------------------------- | ----------------------------------------------- | ------------------------------ | -------------------------- |
| **Sipariş** | Kullanıcı sepeti onaylayıp sipariş verebilmeli | ACID uyumluluğu (Para düşerse sipariş oluşmalı) | Tek transaction içinde max 2sn | %99.9 Sipariş başarı oranı |
| **Menü**    | Restoranlar ürün ekleyip güncelleyebilmeli     | Read-Heavy yapı, Cache gerekli                  | Liste response < 200ms         | Resim upload max 2MB       |
| **Arama**   | Kullanıcı restoran/yemeğe göre arama yapmalı   | Indexing stratejisi, hızlı sonuç                | Case-insensitive arama         | Response < 300ms           |
| **Auth**    | JWT ile güvenli giriş                          | Token süresi ve refresh mekanizması             | Stateless authentication       | Token geçerliliği 15dk     |

---

## 🔐 1. Kimlik Doğrulama (Authentication & Authorization)

### Frontend'in Beklentisi:

JWT tabanlı **stateless authentication** sistemi. Frontend, kullanıcının giriş yapması sonrasında aldığı token'ı tüm isteklerde `Authorization` header'ında gönderecek. Token süresi dolduğunda refresh token ile yeni bir access token alabilmeli.

---

### 1.1. POST `/api/v1/auth/register` - Kullanıcı Kaydı

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Ahmet Yılmaz",
  "address": "İstanbul, Kadıköy, Moda Caddesi No:15"
}
```

**Frontend'in Beklentisi:**

- `email`: Geçerli email formatı (validation yapılmalı)
- `password`: Minimum 6 karakter (hash'lenerek saklanmalı - bcrypt)
- `name`: Kullanıcının tam adı
- `address`: Teslimat adresi (opsiyonel kayıt sırasında, sonradan eklenebilir)
- **ÖNEMLİ:** `role` alanı **kesinlikle client tarafından gönderilmemeli**. Backend tüm yeni kullanıcılara otomatik olarak `CUSTOMER` rolü atamalı. Admin rolü sadece veritabanı üzerinden manuel olarak verilebilir.

**Response (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Kullanıcı başarıyla oluşturuldu",
  "data": {
    "user": {
      "id": "uuid-123-456",
      "email": "user@example.com",
      "name": "Ahmet Yılmaz",
      "role": "CUSTOMER",
      "createdAt": "2025-12-07T10:30:00.000Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  }
}
```

**Hata Durumları:**

- `409 Conflict`: Email zaten kullanılıyor

```json
{
  "statusCode": 409,
  "message": "Bu email adresi zaten kayıtlı",
  "error": "Conflict",
  "timestamp": "2025-12-07T10:30:00.000Z",
  "path": "/api/v1/auth/register"
}
```

---

### 1.2. POST `/api/v1/auth/login` - Kullanıcı Girişi

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Giriş başarılı",
  "data": {
    "user": {
      "id": "uuid-123-456",
      "email": "user@example.com",
      "name": "Ahmet Yılmaz",
      "role": "CUSTOMER",
      "address": "İstanbul, Kadıköy, Moda Caddesi No:15"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  }
}
```

**Frontend'in Beklentisi:**

- `access_token`: 15 dakika geçerli, tüm korumalı endpoint'lere gönderilecek
- `refresh_token`: 7 gün geçerli, sadece token yenileme için kullanılacak
- `expires_in`: Token'ın kaç saniye sonra geçersiz olacağı (900 = 15 dakika)

**Hata Durumları:**

- `401 Unauthorized`: Email veya şifre hatalı

```json
{
  "statusCode": 401,
  "message": "Email veya şifre hatalı",
  "error": "Unauthorized",
  "timestamp": "2025-12-07T10:30:00.000Z",
  "path": "/api/v1/auth/login"
}
```

---

### 1.3. POST `/api/v1/auth/refresh` - Token Yenileme

**Request:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  }
}
```

**Frontend'in Beklentisi:**

- Access token süresi dolduğunda (401 alındığında), otomatik olarak bu endpoint'e istek atılmalı
- Yeni token alındıktan sonra, önceki başarısız istek tekrarlanmalı
- Refresh token da geçersizse, kullanıcı logout edilip login sayfasına yönlendirilmeli

---

### 1.4. POST `/api/v1/auth/logout` - Çıkış

**Request Header:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Başarıyla çıkış yapıldı"
}
```

**Frontend'in Beklentisi:**

- Token'ları localStorage/sessionStorage'dan temizlemeli
- Kullanıcıyı login sayfasına yönlendirmeli

---

### 🔒 Token Kullanımı - Genel Kurallar

**Tüm korumalı endpoint'lere istek yaparken:**

```http
GET /api/v1/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Frontend Token Yönetimi Akışı:**

1. Login sonrası `access_token` ve `refresh_token`'ı sakla
2. Her API isteğinde `Authorization: Bearer <access_token>` header'ını ekle
3. Eğer `401 Unauthorized` dönerse:
   - Refresh token ile yeni access token al (`POST /auth/refresh`)
   - Başarısız olan isteği yeni token ile tekrarla
   - Refresh de başarısız olursa logout yap

---

## 👤 2. Kullanıcı (User) Profili

### 2.1. GET `/api/v1/users/me` - Profil Bilgisi

**Request Header:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "id": "uuid-123-456",
    "email": "user@example.com",
    "name": "Ahmet Yılmaz",
    "role": "CUSTOMER",
    "address": "İstanbul, Kadıköy, Moda Caddesi No:15",
    "createdAt": "2025-12-07T10:30:00.000Z",
    "updatedAt": "2025-12-07T10:30:00.000Z"
  }
}
```

**Frontend'in Beklentisi:**

- Password döndürülmemeli (güvenlik)
- Kullanıcının tüm public bilgileri döndürülmeli

---

### 2.2. PATCH `/api/v1/users/me` - Profil Güncelleme

**Request:**

```json
{
  "name": "Ahmet Mehmet Yılmaz",
  "address": "İstanbul, Beşiktaş, Barbaros Bulvarı No:42"
}
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Profil başarıyla güncellendi",
  "data": {
    "id": "uuid-123-456",
    "email": "user@example.com",
    "name": "Ahmet Mehmet Yılmaz",
    "role": "CUSTOMER",
    "address": "İstanbul, Beşiktaş, Barbaros Bulvarı No:42",
    "updatedAt": "2025-12-07T11:00:00.000Z"
  }
}
```

**Frontend'in Beklentisi:**

- Email değiştirilemez (veya ayrı bir doğrulama akışı gerekir)
- Role değiştirilemez (güvenlik)
- Sadece name ve address güncellenebilir

---

### 2.3. GET `/api/v1/users/me/orders` - Sipariş Geçmişi

**Query Parameters:**

- `page` (default: 1): Sayfa numarası
- `limit` (default: 10): Sayfa başına kayıt
- `status` (optional): Durum filtreleme (`preparing`, `delivered`, vb.)
- `sort` (default: `createdAt:desc`): Sıralama

**Request:**

```http
GET /api/v1/users/me/orders?page=1&limit=10&sort=createdAt:desc
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "orders": [
      {
        "id": "order-uuid-789",
        "restaurant": {
          "id": "rest-uuid-456",
          "name": "Burger King",
          "image": "https://api.example.com/uploads/restaurants/burger-king.jpg"
        },
        "items": [
          {
            "name": "Whopper Menü",
            "quantity": 2,
            "price": 189.9,
            "totalPrice": 379.8
          }
        ],
        "totalAmount": 379.8,
        "status": "delivered",
        "deliveryAddress": "İstanbul, Kadıköy, Moda Caddesi No:15",
        "createdAt": "2025-12-06T18:30:00.000Z",
        "deliveredAt": "2025-12-06T19:15:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 47,
      "itemsPerPage": 10
    }
  }
}
```

**Frontend'in Beklentisi:**

- Sayfalandırma (pagination) mutlaka olmalı
- Her sipariş için restoran bilgisi, ürün listesi, toplam tutar ve durum bilgisi dönülmeli
- Siparişler varsayılan olarak en yeniden en eskiye sıralı olmalı

---

## 🍔 3. Restoran ve Menü Yönetimi

### **Performans Hedefleri:**

- ✅ Liste response < 200ms
- ✅ Cache kullanımı (Redis önerilir)
- ✅ Resim upload max 2MB
- ✅ Read-Heavy yapı için optimizasyon

---

✅ TAMAMLANDI

### 3.1. GET `/api/v1/restaurants` - Restoran Listesi

**Query Parameters:**

- `page` (default: 1)
- `limit` (default: 20)
- `city` (optional): Şehir filtresi
- `cuisine` (optional): Mutfak türü (Italian, Turkish, Chinese, vb.)
- `minRating` (optional): Minimum puan (0-5)
- `search` (optional): Restoran adında arama

**Request:**

```http
GET /api/v1/restaurants?page=1&limit=20&city=Istanbul&minRating=4.0
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "restaurants": [
      {
        "id": "rest-uuid-123",
        "name": "Burger King",
        "cuisine": "Fast Food",
        "city": "Istanbul",
        "district": "Kadıköy",
        "address": "Moda Caddesi No:42",
        "rating": 4.5,
        "reviewCount": 1250,
        "deliveryTime": "30-40 dk",
        "minimumOrder": 50.0,
        "deliveryFee": 15.0,
        "image": "https://api.example.com/uploads/restaurants/burger-king.jpg",
        "isOpen": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 12,
      "totalItems": 234,
      "itemsPerPage": 20
    }
  }
}
```

**Frontend'in Beklentisi:**

- Resim URL'leri tam path olmalı (CDN veya server base URL + dosya yolu)
- `isOpen`: Restoranın şu an açık olup olmadığı (çalışma saatlerine göre)
- `deliveryTime`: Tahmini teslimat süresi (string formatında)
- `minimumOrder` ve `deliveryFee`: Number formatında (TL cinsinden)
- **Performans:** Response süresi < 200ms (Cache kullanılmalı)

---

✅ TAMAMLANDI

### 3.2. GET `/api/v1/restaurants/:id` - Restoran Detayı

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "id": "rest-uuid-123",
    "name": "Burger King",
    "cuisine": "Fast Food",
    "city": "Istanbul",
    "district": "Kadıköy",
    "address": "Moda Caddesi No:42",
    "phone": "+90 216 555 00 00",
    "rating": 4.5,
    "reviewCount": 1250,
    "deliveryTime": "30-40 dk",
    "minimumOrder": 50.0,
    "deliveryFee": 15.0,
    "image": "https://api.example.com/uploads/restaurants/burger-king.jpg",
    "coverImage": "https://api.example.com/uploads/restaurants/burger-king-cover.jpg",
    "isOpen": true,
    "openingHours": {
      "monday": "10:00-23:00",
      "tuesday": "10:00-23:00",
      "wednesday": "10:00-23:00",
      "thursday": "10:00-23:00",
      "friday": "10:00-00:00",
      "saturday": "10:00-00:00",
      "sunday": "10:00-23:00"
    }
  }
}
```

---

✅ TAMAMLANDI

### 3.3. GET `/api/v1/restaurants/:id/menu` - Restoran Menüsü

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "restaurant": {
      "id": "rest-uuid-123",
      "name": "Burger King"
    },
    "categories": [
      {
        "id": "cat-uuid-456",
        "name": "Burgerler",
        "items": [
          {
            "id": "item-uuid-789",
            "name": "Whopper Menü",
            "description": "270g sığır eti, domates, marul, turşu, soğan, mayonez",
            "price": 189.9,
            "originalPrice": 199.9,
            "image": "https://api.example.com/uploads/menu-items/whopper.jpg",
            "isAvailable": true,
            "inStock": true,
            "preparationTime": "15-20 dk"
          }
        ]
      },
      {
        "id": "cat-uuid-457",
        "name": "İçecekler",
        "items": [
          {
            "id": "item-uuid-790",
            "name": "Coca Cola 330ml",
            "description": "Soğuk servis içecek",
            "price": 25.0,
            "image": "https://api.example.com/uploads/menu-items/cola.jpg",
            "isAvailable": true,
            "inStock": true,
            "preparationTime": "0 dk"
          }
        ]
      }
    ]
  }
}
```

**Frontend'in Beklentisi:**

- Menü **kategorilere** göre gruplandırılmış olmalı
- Her ürün için:
  - `price`: Güncel fiyat (number)
  - `originalPrice`: İndirim varsa eski fiyat (optional)
  - `isAvailable`: Ürün satışta mı (boolean)
  - `inStock`: Stokta var mı (boolean)
  - `image`: Tam URL
- **Cache:** Bu endpoint mutlaka cache'lenmeli (Redis, 5-10 dakika TTL)
- **Performans:** < 200ms response time

---

✅ TAMAMLANDI

### 3.4. GET `/api/v1/menu-items/:id` - Menü Öğesi Detayı

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "id": "item-uuid-789",
    "name": "Whopper Menü",
    "description": "270g sığır eti, domates, marul, turşu, soğan, mayonez",
    "price": 189.9,
    "originalPrice": 199.9,
    "image": "https://api.example.com/uploads/menu-items/whopper.jpg",
    "images": [
      "https://api.example.com/uploads/menu-items/whopper-1.jpg",
      "https://api.example.com/uploads/menu-items/whopper-2.jpg"
    ],
    "isAvailable": true,
    "inStock": true,
    "preparationTime": "15-20 dk",
    "restaurant": {
      "id": "rest-uuid-123",
      "name": "Burger King"
    },
    "category": {
      "id": "cat-uuid-456",
      "name": "Burgerler"
    },
    "nutritionalInfo": {
      "calories": 680,
      "protein": 28,
      "carbs": 52,
      "fat": 40
    }
  }
}
```

---

✅ TAMAMLANDI

### 3.5. Restoran Yönetimi (Admin/Restoran Sahibi)

**Rol Gereksinimi:** `ADMIN` veya `RESTAURANT_OWNER`

#### POST `/api/v1/restaurants` - Restoran Oluştur

**Request:**

```json
{
  "name": "Yeni Restoran",
  "cuisine": "Italian",
  "city": "Istanbul",
  "district": "Beşiktaş",
  "address": "Barbaros Bulvarı No:100",
  "phone": "+90 212 555 00 00",
  "minimumOrder": 75.0,
  "deliveryFee": 20.0
}
```

**Response (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Restoran başarıyla oluşturuldu",
  "data": {
    "id": "rest-uuid-new",
    "name": "Yeni Restoran",
    "...": "..."
  }
}
```

---

✅ TAMAMLANDI

#### PATCH `/api/v1/restaurants/:id` - Restoran Güncelle

**Request:**

```json
{
  "minimumOrder": 100.0,
  "deliveryFee": 25.0
}
```

---

✅ TAMAMLANDI

#### DELETE `/api/v1/restaurants/:id` - Restoran Sil

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Restoran başarıyla silindi"
}
```

---

//TODO: Burada kaldik
//Bu endpoint tamamlandi ama bazi onlemler eklenicek
✅ TAMAMLANDI

#### POST `/api/v1/restaurants/:id/menu-items` - Menü Öğesi Ekle

**Request (multipart/form-data):**

```
name: "Margherita Pizza"
description: "Domates sosu, mozzarella, fesleğen"
price: 150.00
categoryId: "cat-uuid-123"
image: [File]
```

**Frontend'in Beklentisi:**

- Resim upload için `multipart/form-data` kullanılmalı
- Max dosya boyutu: 2MB
- İzin verilen formatlar: jpg, jpeg, png, webp

---

## 🔍 4. Arama (Search)

### **Performans Hedefi:** Response < 300ms, Case-insensitive

✅ TAMAMLANDI

### 4.1. GET `/api/v1/search` - Genel Arama

**Query Parameters:**

- `q` (required): Arama terimi
- `type` (optional): `restaurant` | `menu-item` | `all` (default: all)
- `city` (optional): Şehir filtresi

**Request:**

```http
GET /api/v1/search?q=burger&type=all&city=Istanbul
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "restaurants": [
      {
        "id": "rest-uuid-123",
        "name": "Burger King",
        "cuisine": "Fast Food",
        "rating": 4.5,
        "image": "https://api.example.com/uploads/restaurants/burger-king.jpg"
      }
    ],
    "menuItems": [
      {
        "id": "item-uuid-789",
        "name": "Whopper Burger",
        "price": 189.9,
        "image": "https://api.example.com/uploads/menu-items/whopper.jpg",
        "restaurant": {
          "id": "rest-uuid-123",
          "name": "Burger King"
        }
      }
    ]
  }
}
```

**Frontend'in Beklentisi:**

- **Fuzzy Search:** Yazım hatalarına toleranslı arama (örn: "burgr" → "burger")
- **Case-insensitive:** Büyük/küçük harf duyarsız
- **Hızlı:** < 300ms response time
- **Full-text search:** PostgreSQL Full-Text Search veya Elasticsearch kullanımı önerilir
- Hem restoran isimlerinde hem menü öğelerinde arama yapılmalı

---

## 🛒 5. Sepet (Cart) Yönetimi

### Frontend'in Beklentisi:

- Sepet kullanıcıya özel olmalı (token ile ilişkilendirilmiş)
- Aynı sepette **sadece bir restoranın** ürünleri olabilir
- Farklı restorandan ürün eklenirse mevcut sepet temizlenmeli (veya kullanıcıya onay sorulmalı)

---

### 5.1. GET `/api/v1/cart` - Sepeti Görüntüle

**Request Header:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "restaurant": {
      "id": "rest-uuid-123",
      "name": "Burger King",
      "deliveryFee": 15.0,
      "minimumOrder": 50.0
    },
    "items": [
      {
        "id": "cart-item-uuid-1",
        "menuItem": {
          "id": "item-uuid-789",
          "name": "Whopper Menü",
          "price": 189.9,
          "image": "https://api.example.com/uploads/menu-items/whopper.jpg",
          "isAvailable": true,
          "inStock": true
        },
        "quantity": 2,
        "itemTotal": 379.8
      }
    ],
    "subtotal": 379.8,
    "deliveryFee": 15.0,
    "total": 394.8,
    "itemCount": 2
  }
}
```

**Frontend'in Beklentisi:**

- `subtotal`: Ürünlerin toplam fiyatı
- `deliveryFee`: Teslimat ücreti
- `total`: Genel toplam (subtotal + deliveryFee)
- Her ürün için **güncel fiyat** ve **stok durumu** gösterilmeli
- Eğer ürün stokta yoksa veya kaldırılmışsa, frontend'e bilgi verilmeli

---

### 5.2. POST `/api/v1/cart/items` - Sepete Ürün Ekle

**Request:**

```json
{
  "menuItemId": "item-uuid-789",
  "quantity": 2
}
```

**Response (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Ürün sepete eklendi",
  "data": {
    "restaurant": {
      "id": "rest-uuid-123",
      "name": "Burger King"
    },
    "items": [
      {
        "id": "cart-item-uuid-1",
        "menuItem": {
          "id": "item-uuid-789",
          "name": "Whopper Menü",
          "price": 189.9
        },
        "quantity": 2,
        "itemTotal": 379.8
      }
    ],
    "total": 394.8
  }
}
```

**Hata Durumları:**

**409 Conflict - Farklı Restoran:**

```json
{
  "statusCode": 409,
  "message": "Sepetinizde başka bir restorana ait ürünler var. Devam ederseniz sepet temizlenecek.",
  "error": "Conflict",
  "data": {
    "currentRestaurant": {
      "id": "rest-uuid-123",
      "name": "Burger King"
    },
    "newRestaurant": {
      "id": "rest-uuid-456",
      "name": "Pizza Hut"
    }
  }
}
```

**Frontend Akışı:**

1. Kullanıcıya "Sepetinizdeki ürünler silinecek, devam etmek istiyor musunuz?" onayı göster
2. Onaylarsa: `POST /cart/items?clearCart=true` ile isteği tekrarla

**404 Not Found - Ürün Stokta Yok:**

```json
{
  "statusCode": 404,
  "message": "Bu ürün şu anda stokta bulunmuyor",
  "error": "Not Found"
}
```

---

### 5.3. PATCH `/api/v1/cart/items/:itemId` - Sepet Ürünü Güncelle

**Request:**

```json
{
  "quantity": 3
}
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Sepet güncellendi",
  "data": {
    "items": [...],
    "total": 584.70
  }
}
```

---

### 5.4. DELETE `/api/v1/cart/items/:itemId` - Sepetten Ürün Sil

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Ürün sepetten kaldırıldı"
}
```

---

### 5.5. DELETE `/api/v1/cart` - Sepeti Temizle

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Sepet temizlendi"
}
```

---

## 📦 6. Sipariş (Order) Yaşam Döngüsü - KRİTİK BÖLÜM

### **Teknik Gereksinimler:**

- ✅ **ACID Uyumluluğu:** Para çekildiyse sipariş MUTLAKA oluşmalı, sipariş oluştuysa para MUTLAKA çekilmeli
- ✅ **Transaction Süresi:** Max 2 saniye
- ✅ **Başarı Oranı:** %99.9 SLA
- ✅ **Stok Tutarlılığı:** Sipariş anında fiyat ve stok kontrolü

---

### 6.1. POST `/api/v1/orders` - Sipariş Oluştur

**Request:**

```json
{
  "deliveryAddress": "İstanbul, Kadıköy, Moda Caddesi No:15",
  "paymentMethod": "credit_card",
  "note": "Kapıya bırakabilirsiniz"
}
```

**Frontend'in Beklentisi:**

- Sepetteki ürünler otomatik olarak alınacak (cart'tan)
- `deliveryAddress`: Teslimat adresi (kullanıcının profil adresinden farklı olabilir)
- `paymentMethod`: `credit_card`, `cash`, `wallet`
- `note`: İsteğe bağlı sipariş notu

---

**Backend İşlem Akışı (ACID Transaction):**

```typescript
BEGIN TRANSACTION;

1. Sepeti kontrol et (boş mu?)
2. Ürün fiyatlarını ve stok durumlarını yeniden doğrula
   - Fiyat değiştiyse → 409 Conflict dön
   - Stok yoksa → 409 Conflict dön
3. Ödeme işlemini gerçekleştir (Payment Gateway)
   - Başarısızsa → ROLLBACK, 402 Payment Required dön
4. Sipariş kaydını oluştur (orders tablosu)
5. Sipariş detaylarını kaydet (order_items tablosu)
6. Sepeti temizle
7. COMMIT TRANSACTION;

Response 201 Created
```

---

**Response (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Sipariş başarıyla oluşturuldu",
  "data": {
    "id": "order-uuid-999",
    "orderNumber": "ORD-20251207-1234",
    "restaurant": {
      "id": "rest-uuid-123",
      "name": "Burger King",
      "phone": "+90 216 555 00 00"
    },
    "items": [
      {
        "name": "Whopper Menü",
        "quantity": 2,
        "price": 189.9,
        "totalPrice": 379.8
      }
    ],
    "subtotal": 379.8,
    "deliveryFee": 15.0,
    "total": 394.8,
    "status": "received",
    "paymentMethod": "credit_card",
    "deliveryAddress": "İstanbul, Kadıköy, Moda Caddesi No:15",
    "estimatedDeliveryTime": "30-40 dk",
    "createdAt": "2025-12-07T12:00:00.000Z"
  }
}
```

**Frontend'in Beklentisi:**

- `orderNumber`: Kullanıcıya gösterilecek sipariş numarası
- `status`: `received` (sipariş alındı)
- `estimatedDeliveryTime`: Tahmini teslimat süresi
- **Sepet otomatik temizlenmeli**
- Kullanıcı sipariş detay sayfasına yönlendirilmeli

---

**Hata Durumları:**

**409 Conflict - Fiyat Değişti:**

```json
{
  "statusCode": 409,
  "message": "Sepetinizdeki bazı ürünlerin fiyatı değişti",
  "error": "Conflict",
  "data": {
    "priceChanges": [
      {
        "itemName": "Whopper Menü",
        "oldPrice": 189.9,
        "newPrice": 199.9
      }
    ]
  }
}
```

**Frontend Akışı:**

1. Kullanıcıya "Fiyatlar güncellendi, sepetinizi kontrol edin" mesajı göster
2. Sepeti yeniden yükle (GET /cart)
3. Kullanıcı onaylarsa tekrar sipariş oluştur

---

**409 Conflict - Stok Yok:**

```json
{
  "statusCode": 409,
  "message": "Sepetinizdeki bazı ürünler stokta kalmadı",
  "error": "Conflict",
  "data": {
    "unavailableItems": [
      {
        "itemId": "item-uuid-789",
        "itemName": "Whopper Menü"
      }
    ]
  }
}
```

---

**402 Payment Required - Ödeme Başarısız:**

```json
{
  "statusCode": 402,
  "message": "Ödeme işlemi başarısız oldu",
  "error": "Payment Required",
  "data": {
    "reason": "Yetersiz bakiye"
  }
}
```

---

### 6.2. GET `/api/v1/orders/:id` - Sipariş Detayı

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "data": {
    "id": "order-uuid-999",
    "orderNumber": "ORD-20251207-1234",
    "restaurant": {
      "id": "rest-uuid-123",
      "name": "Burger King",
      "phone": "+90 216 555 00 00",
      "address": "Kadıköy, İstanbul"
    },
    "items": [
      {
        "name": "Whopper Menü",
        "quantity": 2,
        "price": 189.9,
        "totalPrice": 379.8
      }
    ],
    "subtotal": 379.8,
    "deliveryFee": 15.0,
    "total": 394.8,
    "status": "on-the-way",
    "statusHistory": [
      {
        "status": "received",
        "timestamp": "2025-12-07T12:00:00.000Z"
      },
      {
        "status": "preparing",
        "timestamp": "2025-12-07T12:05:00.000Z"
      },
      {
        "status": "on-the-way",
        "timestamp": "2025-12-07T12:30:00.000Z"
      }
    ],
    "paymentMethod": "credit_card",
    "deliveryAddress": "İstanbul, Kadıköy, Moda Caddesi No:15",
    "estimatedDeliveryTime": "12:45",
    "createdAt": "2025-12-07T12:00:00.000Z"
  }
}
```

**Frontend'in Beklentisi:**

- `statusHistory`: Sipariş durumlarının geçmişi (timeline gösterimi için)
- Gerçek zamanlı güncelleme için **WebSocket** veya **Polling** kullanılabilir

---

### 6.3. Sipariş Durum Yönetimi

**Sipariş Durumları (Status Enum):**

```typescript
enum OrderStatus {
  RECEIVED = 'received', // Sipariş alındı
  CONFIRMED = 'confirmed', // Restoran onayladı
  PREPARING = 'preparing', // Hazırlanıyor
  READY = 'ready', // Hazır (kuryeye verilmeyi bekliyor)
  ON_THE_WAY = 'on-the-way', // Yolda
  DELIVERED = 'delivered', // Teslim edildi
  CANCELLED = 'cancelled', // İptal edildi
}
```

---

### 6.4. PATCH `/api/v1/orders/:id/status` - Durum Güncelle (Admin/Restoran)

**Rol Gereksinimi:** `ADMIN` veya `RESTAURANT_OWNER`

**Request:**

```json
{
  "status": "preparing"
}
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Sipariş durumu güncellendi",
  "data": {
    "id": "order-uuid-999",
    "status": "preparing",
    "updatedAt": "2025-12-07T12:05:00.000Z"
  }
}
```

**Frontend'in Beklentisi:**

- Sadece yetkili kullanıcılar (restoran sahibi/admin) durum güncelleyebilir
- Durum değişikliği loglanmalı (statusHistory)

---

### 6.5. POST `/api/v1/orders/:id/cancel` - Sipariş İptal Et

**Request:**

```json
{
  "reason": "Adresim değişti"
}
```

**Response (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Sipariş iptal edildi",
  "data": {
    "id": "order-uuid-999",
    "status": "cancelled",
    "refundAmount": 394.8,
    "refundStatus": "pending"
  }
}
```

**Frontend'in Beklentisi:**

- İptal sadece belirli durumlarda yapılabilir (`received`, `confirmed`)
- Hazırlandıktan sonra iptal edilemez
- Para iadesi otomatik başlatılmalı

---

## ⚠️ 7. Hata Yönetimi (Error Handling)

### Frontend'in Beklentisi:

Tüm hatalar **tutarlı** bir JSON formatında dönülmelidir:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2025-12-07T12:00:00.000Z",
  "path": "/api/v1/orders",
  "details": [
    {
      "field": "deliveryAddress",
      "message": "Teslimat adresi boş olamaz"
    }
  ]
}
```

---

### HTTP Durum Kodları:

| Kod   | Anlamı                | Kullanım                                  |
| ----- | --------------------- | ----------------------------------------- |
| `200` | OK                    | Başarılı GET, PATCH, DELETE               |
| `201` | Created               | Başarılı POST (kaynak oluşturuldu)        |
| `204` | No Content            | Başarılı DELETE (response body yok)       |
| `400` | Bad Request           | Validasyon hatası, hatalı istek           |
| `401` | Unauthorized          | Token yok veya geçersiz                   |
| `403` | Forbidden             | Yetkisiz işlem (rol eksikliği)            |
| `404` | Not Found             | Kaynak bulunamadı                         |
| `409` | Conflict              | Stok yok, fiyat değişti, email kullanımda |
| `422` | Unprocessable Entity  | İşlenemeyen veri (business logic hatası)  |
| `429` | Too Many Requests     | Rate limiting                             |
| `500` | Internal Server Error | Sunucu hatası                             |
| `503` | Service Unavailable   | Servis geçici olarak kullanılamıyor       |

---

### Örnek Hata Mesajları:

**Validation Error (400):**

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email formatı geçersiz"
    },
    {
      "field": "password",
      "message": "Şifre en az 6 karakter olmalı"
    }
  ]
}
```

**Unauthorized (401):**

```json
{
  "statusCode": 401,
  "message": "Token geçersiz veya süresi dolmuş",
  "error": "Unauthorized"
}
```

**Forbidden (403):**

```json
{
  "statusCode": 403,
  "message": "Bu işlem için yetkiniz yok",
  "error": "Forbidden"
}
```

**Conflict (409):**

```json
{
  "statusCode": 409,
  "message": "Bu email adresi zaten kayıtlı",
  "error": "Conflict"
}
```

---

## 🛠️ 8. Genel Teknik Beklentiler & Standartlar

### 8.1. API Tasarımı

- ✅ **RESTful Conventions:** Resource-based URL'ler
- ✅ **Versioning:** `/api/v1/...` prefix kullanımı
- ✅ **HTTP Methods:** GET (okuma), POST (oluşturma), PATCH (güncelleme), DELETE (silme)
- ✅ **Naming:** Plural kullanımı (`/restaurants`, `/orders`)

---

### 8.2. Request/Response Formatı

**Request Header:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
Accept: application/json
```

**Response Format:**

```json
{
  "statusCode": 200,
  "message": "İşlem başarılı",
  "data": {
    ...
  }
}
```

---

### 8.3. Sayfalandırma (Pagination)

Tüm liste endpoint'lerinde:

**Query Parameters:**

```
page=1
limit=20
```

**Response:**

```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 200,
    "itemsPerPage": 20
  }
}
```

---

### 8.4. Sıralama (Sorting)

**Query Parameter:**

```
sort=createdAt:desc
sort=price:asc
```

---

### 8.5. Filtreleme (Filtering)

**Query Parameters:**

```
?city=Istanbul&minRating=4.0&cuisine=Italian
```

---

### 8.6. CORS (Cross-Origin Resource Sharing)

Frontend domain'ine izin verilmeli:

```typescript
// NestJS CORS Config
app.enableCors({
  origin: ['http://localhost:3000', 'https://frontend.example.com'],
  credentials: true,
});
```

---

### 8.7. Rate Limiting

**Beklenen Davranış:**

- Kullanıcı başına max 100 istek/dakika
- Aşılırsa: `429 Too Many Requests`

```json
{
  "statusCode": 429,
  "message": "Çok fazla istek gönderdiniz, lütfen 60 saniye sonra tekrar deneyin",
  "error": "Too Many Requests",
  "retryAfter": 60
}
```

---

### 8.8. API Dokümantasyonu

**Swagger/OpenAPI:**

- Tüm endpoint'ler otomatik dokümante edilmeli
- Erişim: `https://api.example.com/api/docs`

**Beklenen İçerik:**

- Endpoint açıklaması
- Request/Response örnek JSON'ları
- Hata kodları ve açıklamaları
- Authentication gereksinimleri

---

### 8.9. Güvenlik

- ✅ **Password Hashing:** bcrypt (salt rounds: 10)
- ✅ **JWT Secret:** Güçlü, ortam değişkeninde saklanmalı
- ✅ **Input Validation:** Tüm inputlar server-side validate edilmeli
- ✅ **SQL Injection:** ORM kullanımı (TypeORM)
- ✅ **XSS Prevention:** Input sanitization
- ✅ **HTTPS:** Production'da zorunlu

---

### 8.10. Performans

| Metrik              | Hedef               |
| ------------------- | ------------------- |
| Auth endpoint'leri  | < 500ms             |
| Menü listeleme      | < 200ms (Cache ile) |
| Arama               | < 300ms             |
| Sipariş oluşturma   | < 2000ms            |
| Genel GET istekleri | < 300ms             |

---

### 8.11. Loglama

**Beklenen Log Seviyeleri:**

- `INFO`: Başarılı işlemler
- `WARN`: Potansiyel problemler (stok azalıyor, fiyat değişti)
- `ERROR`: Hatalar, exception'lar
- `DEBUG`: Geliştirme amaçlı detaylı loglar

**Loglanması Gerekenler:**

- Tüm API istekleri (method, path, status, duration)
- Hata detayları
- Sipariş işlemleri (audit log)
- Ödeme işlemleri

---

## 🚀 9. Deployment & Environment

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=secretpassword
DB_NAME=yemekyemek

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=2097152

# Cache (Redis)
REDIS_HOST=localhost
REDIS_PORT=6379

# Payment Gateway
PAYMENT_API_KEY=xxx
PAYMENT_API_SECRET=yyy
```

---

## 📊 10. Database Schema (Özet)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password VARCHAR,
  name VARCHAR,
  role ENUM('CUSTOMER', 'ADMIN', 'RESTAURANT_OWNER'),
  address TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Restaurants
CREATE TABLE restaurants (
  id UUID PRIMARY KEY,
  name VARCHAR,
  cuisine VARCHAR,
  city VARCHAR,
  district VARCHAR,
  address TEXT,
  phone VARCHAR,
  rating DECIMAL,
  delivery_time VARCHAR,
  minimum_order DECIMAL,
  delivery_fee DECIMAL,
  is_open BOOLEAN,
  created_at TIMESTAMP
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  name VARCHAR
);

-- Menu Items
CREATE TABLE menu_items (
  id UUID PRIMARY KEY,
  category_id UUID REFERENCES categories(id),
  name VARCHAR,
  description TEXT,
  price DECIMAL,
  image_url VARCHAR,
  is_available BOOLEAN,
  in_stock BOOLEAN
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  order_number VARCHAR UNIQUE,
  status ENUM('received', 'preparing', 'on-the-way', 'delivered', 'cancelled'),
  subtotal DECIMAL,
  delivery_fee DECIMAL,
  total DECIMAL,
  payment_method VARCHAR,
  delivery_address TEXT,
  created_at TIMESTAMP
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  menu_item_snapshot JSONB, -- Fiyat ve isim snapshot'ı
  quantity INT,
  price DECIMAL,
  total_price DECIMAL
);
```

---

## 🔗 11. Endpoint Özeti (Quick Reference)

### Authentication

- `POST /api/v1/auth/register` - Kayıt ol
- `POST /api/v1/auth/login` - Giriş yap
- `POST /api/v1/auth/refresh` - Token yenile
- `POST /api/v1/auth/logout` - Çıkış yap

### User

- `GET /api/v1/users/me` - Profil bilgisi
- `PATCH /api/v1/users/me` - Profil güncelle
- `GET /api/v1/users/me/orders` - Sipariş geçmişi

### Restaurants

- `GET /api/v1/restaurants` - Restoran listesi
- `GET /api/v1/restaurants/:id` - Restoran detay
- `GET /api/v1/restaurants/:id/menu` - Menü listesi
- `POST /api/v1/restaurants` - Restoran oluştur (Admin)
- `PATCH /api/v1/restaurants/:id` - Restoran güncelle (Admin)
- `DELETE /api/v1/restaurants/:id` - Restoran sil (Admin)

### Menu Items

- `GET /api/v1/menu-items/:id` - Menü öğesi detay
- `POST /api/v1/restaurants/:id/menu-items` - Menü öğesi ekle (Admin)
- `PATCH /api/v1/menu-items/:id` - Menü öğesi güncelle (Admin)
- `DELETE /api/v1/menu-items/:id` - Menü öğesi sil (Admin)

### Search

- `GET /api/v1/search?q=<query>` - Genel arama

### Cart

- `GET /api/v1/cart` - Sepeti görüntüle
- `POST /api/v1/cart/items` - Sepete ürün ekle
- `PATCH /api/v1/cart/items/:id` - Sepet ürünü güncelle
- `DELETE /api/v1/cart/items/:id` - Sepetten ürün sil
- `DELETE /api/v1/cart` - Sepeti temizle

### Orders

- `POST /api/v1/orders` - Sipariş oluştur
- `GET /api/v1/orders/:id` - Sipariş detay
- `PATCH /api/v1/orders/:id/status` - Durum güncelle (Admin)
- `POST /api/v1/orders/:id/cancel` - Sipariş iptal et

---

## 📝 12. Frontend Developer'ın Son Notları

**Backend ekibinden beklentilerim:**

1. ✅ **Tutarlı Response Formatı:** Her endpoint aynı yapıda response dönmeli
2. ✅ **Net Hata Mesajları:** Kullanıcıya gösterilebilir hata mesajları
3. ✅ **Performans:** Belirtilen SLA'lara uyulmalı
4. ✅ **Dokümantasyon:** Swagger üzerinden güncel API dokümantasyonu
5. ✅ **Test Edilebilirlik:** Postman/Insomnia collection'ı paylaşılmalı
6. ✅ **CORS:** Development ve production origin'lerine izin verilmeli
7. ✅ **Versioning:** API değişikliklerinde geriye dönük uyumluluk
8. ✅ **Rate Limiting:** Kötü niyetli kullanımdan korunma
9. ✅ **Transaction Güvenliği:** Sipariş ve ödeme işlemlerinde ACID garantisi
10. ✅ **Real-time Updates:** WebSocket desteği (sipariş durumu takibi için)

---

## 🎓 13. Geliştirme Talimatları

### Kurulum

```bash
# Dependency kurulumu
npm install

# Environment variables
cp .env.example .env

# Database migration
npm run migration:run

# Development server
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### Test

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

---

## 📞 İletişim & Destek

**Backend Geliştirici:** [İsim]  
**Email:** backend@example.com  
**API Base URL (Dev):** http://localhost:3000/api/v1  
**API Base URL (Prod):** https://api.yemekyemek.com/api/v1  
**Swagger Docs:** https://api.yemekyemek.com/api/docs

---

**Son Güncelleme:** 07 Aralık 2025  
**API Versiyonu:** v1.0.0  
**Doküman Versiyonu:** 1.0

---

Bu dokümantasyon, Frontend ve Backend ekipleri arasındaki API sözleşmesini (contract) temsil eder. Herhangi bir değişiklik yapılmadan önce her iki ekip de bilgilendirilmeli ve bu doküman güncellenmelidir.
