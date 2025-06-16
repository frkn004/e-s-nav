# 📦 ARŞİV KLASÖRÜ

Bu klasör, ehliyet sınav uygulamasının gelişim sürecinde kullanılan eski dosyaları ve yardımcı araçları içerir.

## 📁 Klasör Yapısı

### 🗑️ `gereksiz-dosyalar/`
Artık kullanılmayan eski script dosyaları:
- `smart-production-crawler.js` - Eski soru çekme scripti
- `check-duplicates.js` - Mükerrer soru kontrolü  
- `database-seeder.js` - Eski database seeder
- `question-classifier.js` - Soru kategorileme scripti
- `test-ultra-crawler.js` - Test crawler
- `test-connection.js` - Bağlantı test scripti
- `fix-questions.js` - Eski soru düzeltme API'si
- `fix-format.js` - Eski format düzeltme API'si

### 🛠️ `veri-scripts/`
Aktif kullanılan merkezi veri toplama sistemi:
- **`MERKEZI_VERI_TOPLAMA_SISTEMI.js`** - ⭐ ANA SCRIPT
- `production-50-pages.js` - 50 sayfa çekme scripti
- `production-ultra-mass-crawler.js` - Toplu crawler

### 📊 `analiz-sonuclari/` (otomatik oluşur)
AI analiz sonuçları ve raporlar buraya kaydedilir

### 💾 `yedek/` (otomatik oluşur)
Veritabanı yedekleri buraya kaydedilir

## 🚀 MERKEZI VERİ TOPLAMA SİSTEMİ

Ana script: `veri-scripts/MERKEZI_VERI_TOPLAMA_SISTEMI.js`

### Özellikler:
- 🖼️ Soru görsellerini otomatik indirir
- 🤖 Deepsek AI ile soru analizi yapar
- ✅ Doğru cevapları tespit eder
- 📝 Açıklamalar üretir
- 📊 İstatistik raporları sunar
- 💾 Otomatik yedekleme

### Kullanım:

```bash
# Görselleri indir
node archive/veri-scripts/MERKEZI_VERI_TOPLAMA_SISTEMI.js gorsel-indir

# AI analizi yap
node archive/veri-scripts/MERKEZI_VERI_TOPLAMA_SISTEMI.js ai-analiz --limit 50

# Tam işlem (hepsini yap)
node archive/veri-scripts/MERKEZI_VERI_TOPLAMA_SISTEMI.js full-process

# İstatistikleri gör
node archive/veri-scripts/MERKEZI_VERI_TOPLAMA_SISTEMI.js stats

# Yedek oluştur
node archive/veri-scripts/MERKEZI_VERI_TOPLAMA_SISTEMI.js backup
```

### Gereksinimler:
1. **Deepsek API Anahtarı** - `DEEPSEK_API_KEY` ortam değişkeni olarak tanımlanmalı
2. **Node.js paketleri** - `@prisma/client` kurulu olmalı
3. **PostgreSQL** - Veritabanı erişimi

## ⚙️ Ortam Değişkenleri

```bash
# .env.local dosyasına ekle
DEEPSEK_API_KEY=sk-your-deepsek-api-key-here
```

## 📈 İlerleyen Adımlar

1. **Görsel İndirme**: 126 görselli soru için resim dosyalarını indir
2. **AI Analizi**: 452 soru için doğru cevap tespiti yap  
3. **Kalite Kontrolü**: Düşük güven skorlu cevapları manuel kontrol et
4. **Eğitim Verisi**: AI eğitimi için formatlanmış veri çıktısı al

## 🔧 Teknik Notlar

- **Rate Limiting**: API istekleri arasında 1 saniye bekleme
- **Batch İşlem**: 10'luk gruplar halinde işlem
- **Hata Yönetimi**: Başarısız işlemler ayrıca raporlanır
- **Yedekleme**: Her işlem öncesi otomatik yedek
- **Logging**: Detaylı zaman damgalı loglar

---

> ⚠️ **Önemli**: Gereksiz-dosyalar klasöründeki dosyalar silinebilir.  
> Ana sistem artık MERKEZI_VERI_TOPLAMA_SISTEMI.js ile çalışıyor. 