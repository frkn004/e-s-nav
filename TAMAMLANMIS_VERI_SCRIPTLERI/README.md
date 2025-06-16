# 🚀 TAMAMLANMIŞ VERİ SCRİPTLERİ

Bu klasör, Türk Ehliyet Sınav Uygulaması için geliştirilmiş tüm veri çekme, analiz ve işleme scriptlerini içerir.

## 📁 Klasör Yapısı

### 🎯 MERKEZI_VERI_TOPLAMA_SISTEMI.js
**Ana Koordinatör Script** - Tüm veri işlemlerini yöneten merkezi sistem
- Görsel indirme
- AI analizi (Deepsek entegrasyonu)
- Veritabanı yönetimi
- Batch işleme
- Komut satırı arayüzü

**Kullanım:**
```bash
node MERKEZI_VERI_TOPLAMA_SISTEMI.js stats           # İstatistikler
node MERKEZI_VERI_TOPLAMA_SISTEMI.js gorsel-indir    # Görsel indirme
node MERKEZI_VERI_TOPLAMA_SISTEMI.js ai-analiz       # AI analizi
node MERKEZI_VERI_TOPLAMA_SISTEMI.js full-process    # Tam süreç
```

### 🔥 aktif-crawler-scriptleri/
Production ortamında kullanılan ana veri çekme scriptleri:

- **production-ultra-mass-crawler.js** - En gelişmiş toplu veri çekici
- **production-mass-crawler.js** - Kitle veri çekici
- **production-10-pages.js** - 10 sayfa test crawler'ı
- **complete-mass-crawler.js** - Kapsamlı veri çekici
- **mass-scraper-v2.js** - Geliştirilmiş scraper v2
- **production-50-pages.js** - 50 sayfa production crawler'ı

### 🧪 test-crawler-scriptleri/
Test ve geliştirme amaçlı scriptler:

- **test-mass-crawler.js** - Test amaçlı crawler
- **debug-scraper.js** - Debug ve hata ayıklama
- **two-stage-scraper.js** - İki aşamalı scraper
- **enhanced-scraper.js** - Geliştirilmiş scraper

### 🤖 ai-analiz-scriptleri/
AI destekli analiz ve işleme scriptleri:

- **ai-powered-scraper.js** - AI destekli scraper
- **ai-data-pipeline.js** - AI veri pipeline'ı
- **single-page-deepsek-test.js** - Tek sayfa Deepsek testi
- **improved-deepsek-test.js** - Geliştirilmiş Deepsek testi

### 💾 veritabani-scriptleri/
Veritabanı işlemleri ve veri yönetimi:

- **import-questions.js** - Soru import işlemi
- **fix-questions.js** - Soru düzeltme
- **fix-answers.js** - Cevap düzeltme
- **seed-database.js** - Veritabanı seed
- **seed-real-data.js** - Gerçek veri seed

### 🛠️ yardimci-scriptleri/
Analiz ve yardımcı işlemler:

- **analyze-scraped-data.js** - Çekilen veri analizi
- **comprehensive-analysis.js** - Kapsamlı analiz
- **question-analyzer.js** - Soru analizi
- **pattern-analyzer.js** - Pattern analizi
- **url-processor.js** - URL işleme

## 📊 Proje Durumu

### Veritabanı İstatistikleri
- **Toplam Soru:** 464
- **Trafik:** 274 soru
- **Motor:** 111 soru
- **İlk Yardım:** 79 soru
- **Görselli Sorular:** 126 (indirme gerekli)
- **AI Analizi Gerekli:** 452 soru

### Tamamlanan İşlemler ✅
- [x] Veri çekme scriptleri geliştirildi
- [x] Veritabanı yapısı oluşturuldu
- [x] 464 soru veritabanına eklendi
- [x] Merkezi veri toplama sistemi geliştirildi
- [x] Script organizasyonu tamamlandı

### Bekleyen İşlemler ⏳
- [ ] 126 görsel dosyasının indirilmesi
- [ ] 452 sorunun AI analizi
- [ ] Deepsek API key entegrasyonu
- [ ] Doğru cevap verilerinin tamamlanması

## 🔧 Teknik Gereksinimler

### Bağımlılıklar
```json
{
  "@prisma/client": "^5.x.x",
  "puppeteer": "^21.x.x",
  "cheerio": "^1.x.x",
  "axios": "^1.x.x"
}
```

### Ortam Değişkenleri
```env
DATABASE_URL="postgresql://..."
DEEPSEK_API_KEY="your_api_key_here"
```

## 🚀 Hızlı Başlangıç

1. **Bağımlılıkları yükle:**
   ```bash
   npm install
   ```

2. **Veritabanı bağlantısını test et:**
   ```bash
   node ../test-db.js
   ```

3. **Merkezi sistemi çalıştır:**
   ```bash
   node MERKEZI_VERI_TOPLAMA_SISTEMI.js stats
   ```

4. **Görsel indirme başlat:**
   ```bash
   node MERKEZI_VERI_TOPLAMA_SISTEMI.js gorsel-indir
   ```

## 📈 Performans Notları

- **Rate Limiting:** 1 saniye gecikme ile batch işleme
- **Error Handling:** Kapsamlı hata yönetimi
- **Progress Tracking:** İlerleme takibi
- **Backup System:** Otomatik yedekleme

## 🔍 Troubleshooting

### Yaygın Sorunlar
1. **Database Connection Error:** .env.local dosyasını kontrol edin
2. **API Rate Limit:** Gecikme sürelerini artırın
3. **Memory Issues:** Batch boyutunu küçültün

### Log Dosyaları
- `./logs/errors.log` - Hata logları
- `./logs/progress.log` - İlerleme logları
- `./results/` - İşlem sonuçları

## 📞 Destek

Herhangi bir sorun durumunda:
1. Log dosyalarını kontrol edin
2. Database bağlantısını test edin
3. API key'lerin geçerliliğini kontrol edin

---

**Son Güncelleme:** 7 Haziran 2025
**Versiyon:** 2.0.0
**Durum:** Production Ready 🚀 