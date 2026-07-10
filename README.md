# SPEE — Story Point Estimation Engine

Yazılım takımları için ağırlık tabanlı, kalibre edilebilir bir story point tahmin motoru. Görev tipine ve kriterlere göre SP önerisi üretir; takım geçmişiyle öğrenerek ağırlıklarını zaman içinde kalibre eder.

---

## Amaç

Scrum/Kanban takımlarında story point tahmini genellikle sezgiye dayalı ve tutarsızdır. SPEE:

- Her görev tipi için önceden tanımlanmış kriterler üzerinden ağırlıklı bir skor hesaplar
- Teknik karmaşıklık, kapsam netliği, bağımlılık sayısı gibi faktörleri sayısallaştırır
- Fibonacci, T-shirt, İkinin Kuvvetleri gibi farklı tahmin tekniklerini destekler
- Takımın onayladığı gerçek SP'lerle sapma analizi yaparak ağırlıkları kalibre eder
- Takım bazlı izolasyon sağlar; her takım kendi ağırlıklarını ve geçmişini tutar

---

## Modlar

### API Modu
Backend + veritabanı gerektiren tam özellikli mod. Takım yönetimi, tahmin geçmişi, kalibrasyon ve baz iş tanımları bu modda çalışır.

### Bağımsız Mod (`/standalone`)
Backend gerektirmeyen, tamamen tarayıcıda çalışan mod. İnternet bağlantısı olmadan da kullanılabilir. Ağırlıklar localStorage'a kaydedilir.

---

## Teknolojiler

### Backend
| Teknoloji | Versiyon | Kullanım |
|---|---|---|
| Node.js | 20 | Çalışma ortamı |
| TypeScript | 6 | Tip güvenli geliştirme |
| Fastify | 5 | HTTP sunucusu |
| Prisma | 6 | ORM + migration yönetimi |
| PostgreSQL | 15 | Ana veritabanı |
| Redis / BullMQ | 5 | İş kuyruğu |
| Zod | 4 | Env ve şema doğrulama |
| @fastify/cors | 11 | CORS yönetimi |

### Frontend
| Teknoloji | Versiyon | Kullanım |
|---|---|---|
| React | 18 | UI |
| TypeScript | 5 | Tip güvenli geliştirme |
| Vite | 5 | Build ve geliştirme sunucusu |
| React Router | 6 | Sayfa yönlendirme |
| Axios | 1 | HTTP istemcisi |

### Altyapı
| Platform | Kullanım |
|---|---|
| Railway | Backend + PostgreSQL + Redis |
| Vercel | Frontend (statik) |
| Docker | Yerel geliştirme ortamı |
| GitHub | Kaynak kodu + CI/CD tetikleyici |

---

## Veri Modeli

```
Team
 ├── TeamWeight[]        — görev tipi × kriter ağırlıkları
 ├── TeamConfig          — özel eşikler, kalibrasyon geçmişi
 ├── BaselineStory[]     — referans iş tanımları
 └── EstimationResult[]  — tahmin kayıtları
       └── ActualOutcome — gerçekleşen sprint verisi
```

---

## Görev Tipleri

`USER_STORY` · `BUG` · `ANALYSIS` · `TEST_TASK` · `DESIGN` · `DEVOPS` · `SPIKE` · `SUB_TASK`

Her görev tipinin kendi kriter seti ve varsayılan ağırlıkları vardır.

---

## Tahmin Teknikleri

`FIBONACCI` · `MODIFIED_FIBONACCI` · `TSHIRT` · `POWERS_OF_TWO` · `LINEAR`

---

## Yerel Geliştirme

```bash
# Bağımlılıklar
npm install
cd frontend && npm install

# Altyapı (PostgreSQL + Redis)
docker compose up -d

# Migration
npx prisma migrate dev

# Backend
npm run dev

# Frontend (ayrı terminal)
cd frontend && npm run dev
```

`.env` dosyası:
```
DATABASE_URL=postgresql://spee:password@localhost:5433/spee_db
REDIS_URL=redis://localhost:6380
PORT=3000
NODE_ENV=development
API_KEY=dev-api-key
```

---

## API

Tüm istekler `Authorization: Bearer <API_KEY>` başlığı gerektirir.

```
POST   /api/v1/teams                        — takım oluştur
GET    /api/v1/teams/join/:code             — kod ile takıma katıl
GET    /api/v1/teams/:teamId/config         — takım yapılandırması
PUT    /api/v1/teams/:teamId/config         — ağırlık ve ayar güncelle

POST   /api/v1/estimate                     — tahmin üret
GET    /api/v1/history/:teamId              — tahmin geçmişi
GET    /api/v1/history/:teamId/summary      — özet istatistik
PATCH  /api/v1/history/:teamId/:id/approve  — gerçek SP onayla

POST   /api/v1/calibrate                    — sapma analizi ve ağırlık önerisi
```
