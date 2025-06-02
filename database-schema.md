# Multi-Tenant SaaS Veritabanı Şeması

## Ana Tablolar

### 1. Firmalar (Sürücü Kursları)
```sql
CREATE TABLE firmalar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefon VARCHAR(20),
  adres TEXT,
  logo_url VARCHAR(500),
  tema_rengi VARCHAR(7) DEFAULT '#3B82F6',
  
  -- Lisans bilgileri
  lisans_baslangic DATE NOT NULL,
  lisans_bitis DATE NOT NULL,
  aktif BOOLEAN DEFAULT true,
  paket_tipi VARCHAR(20) DEFAULT 'temel', -- 'temel', 'premium'
  ai_destegi BOOLEAN DEFAULT false,
  
  -- Limitler
  max_ogrenci_sayisi INTEGER DEFAULT 50,
  max_hoca_sayisi INTEGER DEFAULT 5,
  
  -- Meta
  olusturma_tarihi TIMESTAMP DEFAULT NOW(),
  guncelleme_tarihi TIMESTAMP DEFAULT NOW(),
  
  -- Demo period
  demo_bitis TIMESTAMP NULL
);
```

### 2. Kullanıcılar (Unified User Table)
```sql
CREATE TABLE kullanicilar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id UUID REFERENCES firmalar(id) ON DELETE CASCADE,
  
  -- Temel bilgiler
  ad VARCHAR(255) NOT NULL,
  soyad VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefon VARCHAR(20),
  rol UserRole NOT NULL,
  
  -- Auth
  sifre_hash VARCHAR(255) NOT NULL,
  aktif BOOLEAN DEFAULT true,
  
  -- Öğrenci özel alanları
  tc_no VARCHAR(11) UNIQUE NULL, -- Sadece öğrenciler için
  dogum_tarihi DATE NULL,
  sinav_sayisi INTEGER DEFAULT 0,
  basari_orani DECIMAL(5,2) DEFAULT 0,
  
  -- Hoca özel alanları
  uzmanlik_alani VARCHAR(100) NULL, -- 'Trafik', 'İlk Yardım', 'Motor'
  deneyim_yili INTEGER NULL,
  
  -- Meta
  olusturma_tarihi TIMESTAMP DEFAULT NOW(),
  son_giris TIMESTAMP NULL,
  
  UNIQUE(email, firma_id)
);
```

### 3. Duyurular
```sql
CREATE TABLE duyurular (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id UUID REFERENCES firmalar(id) ON DELETE CASCADE,
  olusturan_id UUID REFERENCES kullanicilar(id),
  
  baslik VARCHAR(500) NOT NULL,
  icerik TEXT NOT NULL,
  oncelik VARCHAR(20) DEFAULT 'orta', -- 'dusuk', 'orta', 'yuksek'
  
  -- Hedef kitle
  hedef_rol UserRole[] DEFAULT ARRAY['OGRENCI'], -- PostgreSQL array
  
  -- Zamanlama
  yayinlanma_tarihi TIMESTAMP DEFAULT NOW(),
  aktif BOOLEAN DEFAULT true,
  
  olusturma_tarihi TIMESTAMP DEFAULT NOW()
);
```

### 4. Ders Programı (Gelecek için)
```sql
CREATE TABLE ders_programi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id UUID REFERENCES firmalar(id) ON DELETE CASCADE,
  hoca_id UUID REFERENCES kullanicilar(id),
  
  baslik VARCHAR(255) NOT NULL,
  aciklama TEXT,
  ders_tarihi TIMESTAMP NOT NULL,
  sure_dakika INTEGER DEFAULT 60,
  
  -- Katılımcılar
  max_katilimci INTEGER DEFAULT 20,
  
  aktif BOOLEAN DEFAULT true,
  olusturma_tarihi TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ders_katilimci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ders_id UUID REFERENCES ders_programi(id) ON DELETE CASCADE,
  ogrenci_id UUID REFERENCES kullanicilar(id) ON DELETE CASCADE,
  
  katildi BOOLEAN DEFAULT false,
  katilim_tarihi TIMESTAMP NULL,
  
  UNIQUE(ders_id, ogrenci_id)
);
```

### 5. Aktivasyon Kodları
```sql
CREATE TABLE aktivasyon_kodlari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kod VARCHAR(50) UNIQUE NOT NULL,
  
  -- Paket bilgileri
  paket_tipi VARCHAR(20) NOT NULL, -- 'temel', 'premium'
  sure_gun INTEGER NOT NULL, -- 365 (1 yıl), 1 (demo)
  
  -- Kullanım durumu
  kullanildi BOOLEAN DEFAULT false,
  kullanan_firma_id UUID REFERENCES firmalar(id) NULL,
  kullanma_tarihi TIMESTAMP NULL,
  
  olusturma_tarihi TIMESTAMP DEFAULT NOW(),
  gecerlilik_tarihi TIMESTAMP NULL -- NULL = sınırsız
);
```

### 6. Sorular (Mevcut yapıyı genişlet)
```sql
CREATE TABLE sorular (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id UUID REFERENCES firmalar(id) NULL, -- NULL = genel sorular
  
  soru TEXT NOT NULL,
  cevaplar JSONB NOT NULL, -- ["A şıkkı", "B şıkkı", ...]
  dogru_cevap INTEGER NOT NULL,
  
  kategori VARCHAR(50) NOT NULL, -- 'Trafik', 'İlk Yardım', 'Motor'
  zorluk VARCHAR(20) DEFAULT 'orta',
  
  -- Premium control
  premium_icerik BOOLEAN DEFAULT false,
  
  -- AI açıklama
  ai_aciklama TEXT NULL,
  
  aktif BOOLEAN DEFAULT true,
  olusturma_tarihi TIMESTAMP DEFAULT NOW()
);
```

### 7. AI Sohbet Geçmişi
```sql
CREATE TABLE ai_sohbet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kullanici_id UUID REFERENCES kullanicilar(id) ON DELETE CASCADE,
  
  kullanici_mesaji TEXT NOT NULL,
  ai_cevabi TEXT NOT NULL,
  
  -- Context
  soru_id UUID REFERENCES sorular(id) NULL,
  konu VARCHAR(100) NULL,
  
  olusturma_tarihi TIMESTAMP DEFAULT NOW()
);
```

## Indexler ve Performans
```sql
-- Firma bazlı sorgular için
CREATE INDEX idx_kullanicilar_firma ON kullanicilar(firma_id);
CREATE INDEX idx_duyurular_firma ON duyurular(firma_id);
CREATE INDEX idx_sorular_firma ON sorular(firma_id);

-- Auth için
CREATE INDEX idx_kullanicilar_email ON kullanicilar(email);
CREATE INDEX idx_aktivasyon_kod ON aktivasyon_kodlari(kod);

-- Tarih bazlı sorgular
CREATE INDEX idx_duyurular_tarih ON duyurular(yayinlanma_tarihi DESC);
CREATE INDEX idx_ai_sohbet_tarih ON ai_sohbet(olusturma_tarihi DESC);
```

## Row Level Security (RLS)
```sql
-- Firmalar sadece kendi verilerini görebilir
ALTER TABLE kullanicilar ENABLE ROW LEVEL SECURITY;
CREATE POLICY kullanici_firma_policy ON kullanicilar
  FOR ALL USING (firma_id = current_setting('app.current_firma_id')::UUID);

-- Duyurular için aynı mantık
ALTER TABLE duyurular ENABLE ROW LEVEL SECURITY;
CREATE POLICY duyuru_firma_policy ON duyurular
  FOR ALL USING (firma_id = current_setting('app.current_firma_id')::UUID);
``` 