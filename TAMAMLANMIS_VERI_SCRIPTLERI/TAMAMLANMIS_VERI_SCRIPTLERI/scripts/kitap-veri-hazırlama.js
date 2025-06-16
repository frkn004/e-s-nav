// RAG ve Fine-tuning için Kitap Veri Hazırlama Script'i
const fs = require('fs');
const path = require('path');

// Ehliyet kitaplarının gerçek içerikleri - bölüm bölüm
const EHLIYET_KITAPLARI = {
  trafik: {
    id: 'trafik-kurallari',
    baslik: 'Trafik Kuralları ve İşaretler',
    kategori: 'TRAFIK',
    bölümler: [
      {
        başlık: 'Temel Trafik Kuralları',
        alt_başlıklar: [
          {
            başlık: 'Trafik Nedir?',
            içerik: `
Trafik, karayollarında hareket eden veya duran araçların, yayaların ve hayvanların oluşturduğu düzenli akış sistemidir.

## Trafik Güvenliğinin Temel İlkeleri

### 1. Dikkat ve Odaklanma
- Sürüş sırasında dikkatinizi yola verin
- Cep telefonu kullanmayın
- Müzik sesini yüksek açmayın
- Yorgunken araç kullanmayın

### 2. Hız Kontrolü
- Şehir içi maksimum 50 km/h
- Şehir dışı maksimum 90 km/h  
- Otoyollarda maksimum 120 km/h
- Okul bölgelerinde maksimum 30 km/h

### 3. Güvenli Takip Mesafesi
- Kuru havada: Hızınızın yarısı kadar metre
- Yağışlı havada: Hızınızın eşiti kadar metre
- Karlı/buzlu havada: Hızınızın 2 katı kadar metre

**Örnek:** 60 km/h hızla gidiyorsanız, kuru havada 30 metre, yağışlı havada 60 metre mesafe bırakın.
            `
          },
          {
            başlık: 'Yol Hakkı ve Öncelik Kuralları',
            içerik: `
## Ana Yol Üzerindeki Araçlar
Ana yol üzerindeki araçlar **her zaman** önceliğe sahiptir.

### Ana Yol Nasıl Belirlenir?
1. **Ana yol levhası** olan yol
2. **Dur levhası** olmayan yol  
3. **Asfaltlı** yol (toprak yola karşı)
4. **Geniş** yol (dar yola karşı)

## Kavşak Geçiş Kuralları

### 1. Işıklı Kavşaklar
- **Yeşil ışık:** Geçebilirsiniz
- **Sarı ışık:** Durun (güvenli şekilde duramıyorsanız dikkatli geçin)
- **Kırmızı ışık:** Mutlaka durun

### 2. Işıksız Kavşaklar  
- **Sağdan gelen** araç önceliklidir
- **Sola dönüş** yapan araç karşıdan gelene yol verir
- **Düz giden** araç dönen araca göre önceliklidir

### 3. Dönel Kavşaklar
- Kavşağa **saat yönünün tersine** girin
- **Kavşaktaki** araç önceliklidir
- **Çıkış levhası** varsa sinyal verin
            `
          }
        ]
      },
      {
        başlık: 'Trafik İşaretleri',
        alt_başlıklar: [
          {
            başlık: 'Uyarı İşaretleri',
            içerik: `
## Uyarı İşaretleri

Uyarı işaretleri **üçgen** şeklinde, **sarı zemin** üzerine **kırmızı çerçeve** ile yapılır.

### Önemli Uyarı İşaretleri

#### 🔺 Viraj İşaretleri
- **Sağ Viraj:** Sağa doğru ok
- **Sol Viraj:** Sola doğru ok  
- **Çift Viraj:** S şeklinde ok

**Ne Yapmalısınız:**
- Hızınızı azaltın
- Karşı şeridi işgal etmeyin
- Viraj içinde fren yapmayın

#### 🔺 Eğim İşaretleri
- **Yokuş Yukarı:** % işareti ile
- **Yokuş Aşağı:** % işareti ile

**Yokuş Yukarı:**
- Düşük vites kullanın
- Motor devrinizi yüksek tutun
- Çok fazla gaz vermeyin

**Yokuş Aşağı:**
- Motor freni yapın
- Fren pedalına sürekli basmayın
- Düşük vites kullanın

#### 🔺 Özel Durum İşaretleri
- **Okul İşareti:** Çocuk figürü
- **İşçi İşareti:** Kürek figürü
- **Hayvan Geçidi:** Hayvan figürü

**Dikkat Edilecekler:**
- Hızınızı düşürün
- Çok dikkatli olun
- Gerekirse durun
            `
          },
          {
            başlık: 'Yasak İşaretleri',
            içerik: `
## Yasak İşaretleri

Yasak işaretleri **yuvarlak** şeklinde, **beyaz zemin** üzerine **kırmızı çerçeve** ve **kırmızı çizgi** ile yapılır.

### Temel Yasak İşaretleri

#### 🚫 Giriş Yasakları
- **Girişi Olmayan Yol:** Beyaz dikdörtgen, kırmızı çerçeve
- **Araç Girişi Yasak:** Kırmızı daire
- **Motosiklet Girişi Yasak:** Motosiklet figürü üzeri çizili

#### 🚫 Hareket Yasakları
- **Sağa Dönüş Yasak:** Sağ ok üzeri çizili
- **Sola Dönüş Yasak:** Sol ok üzeri çizili  
- **U Dönüşü Yasak:** U şekli üzeri çizili
- **Sollama Yasak:** İki araç figürü üzeri çizili

#### 🚫 Dur ve Park Yasakları
- **Dur Yasak:** Kırmızı daire beyaz zemin
- **Park Yasak:** Kırmızı çizgili P harfi
- **Dur ve Park Yasak:** Kırmızı X işareti

### Hız Limit İşaretleri
- **Yuvarlak:** Maksimum hız  
- **Mavi kare:** Minimum hız
- **Sayısal:** km/h cinsinden

**Örnekler:**
- 50: Maksimum 50 km/h
- 30: Maksimum 30 km/h (okul bölgesi)
- 90: Maksimum 90 km/h (şehir dışı)
            `
          }
        ]
      }
    ]
  },

  ilk_yardim: {
    id: 'ilk-yardim',
    baslik: 'İlk Yardım Bilgileri',
    kategori: 'ILK_YARDIM',
    bölümler: [
      {
        başlık: 'Temel İlk Yardım Bilgileri',
        alt_başlıklar: [
          {
            başlık: 'İlk Yardımın Tanımı ve Önemi',
            içerik: `
## İlk Yardım Nedir?

İlk yardım, kaza veya ani hastalık durumunda, sağlık personeli gelene kadar veya hastane götürülene kadar **hayat kurtarmak** amacıyla yapılan **ilk müdahaledir**.

### İlk Yardımın Amaçları

#### 1. Yaşamı Korumak
- **Yaşamsal fonksiyonları** sürdürmek
- **Hayati tehlikeyi** ortadan kaldırmak
- **Ölümü engellemek**

#### 2. İyileşmeyi Hızlandırmak  
- **Acıyı dindirimek**
- **Durumun kötüleşmesini** engellemek
- **Komplikasyonları** önlemek

#### 3. Güvenli Nakli Sağlamak
- **Hareketsiz** tutmak
- **Uygun pozisyon** vermek  
- **Güvenli taşıma** sağlamak

### İlk Yardımın Temel İlkeleri

#### A-B-C Kuralı
- **A (Airway):** Hava yolu açıklığı
- **B (Breathing):** Solunum kontrolü  
- **C (Circulation):** Dolaşım kontrolü

#### İlk Yardım Sırası
1. **Ortamı güvenli** hale getirin
2. **Yaralanmış kişiyi** değerlendirin
3. **Acil servisi** arayın (112)
4. **Uygun müdahaleyi** yapın
5. **Nakil için** hazırlayın
            `
          },
          {
            başlık: 'Trafik Kazası Sonrası İlk Yardım',
            içerik: `
## Trafik Kazası Sonrası Yapılacaklar

### 1. Güvenlik Önlemleri (İlk 30 Saniye)
- **Aracı durdurun** ve **motoru kapatın**
- **Uyarı üçgeni** koyun (50-100 metre)
- **Tehlike ışığını** açın
- **Güvenli bölgeye** geçin

### 2. Durum Değerlendirmesi
- **Yaralı sayısını** belirleyin
- **Bilinci açık mı** kontrol edin
- **Soluyor mu** kontrol edin
- **Kanama var mı** kontrol edin

### 3. Acil Çağrı (112)
Operatöre söyleyin:
- **Nerede** olduğunuzu (adres/km)
- **Ne olduğunu** (trafik kazası)
- **Kaç yaralı** olduğunu
- **Yaralıların durumunu**

### 4. İlk Müdahale

#### Bilinçli Yaralı İçin:
- **Sakin kalmasını** sağlayın
- **Hareket etmesini** engelleyin
- **Kanamayı durdurun**
- **Şok belirtilerini** izleyin

#### Bilinçsiz Yaralı İçin:
- **Nefes alıp almadığını** kontrol edin
- **Hava yolunu** açın
- **Yan pozisyon** verin (omurga kırığı şüphesi yoksa)
- **Sürekli izleyin**

### 5. Yapılmaması Gerekenler
- Yaralıyı **hareket ettirmeyin**
- **Su vermeyin**
- **İlaç vermeyin**  
- **Cam kırıklarını** çıkarmayın
- **Olay yerini** terk etmeyin
            `
          }
        ]
      }
    ]
  },

  motor: {
    id: 'motor-bilgisi',
    baslik: 'Motor ve Araç Bilgisi',
    kategori: 'MOTOR',
    bölümler: [
      {
        başlık: 'Motor Sistemleri',
        alt_başlıklar: [
          {
            başlık: 'Benzinli Motor Çalışma Prensibi',
            içerik: `
## 4 Zamanlı Motor Çalışması

Benzinli motorlar **4 zamanlı** çalışma prensibine göre çalışır.

### 1. EMİŞ ZAMANI
- **Piston aşağı** iner
- **Emme valfi açılır**, egzoz valfi kapalı
- **Yakıt-hava karışımı** silindir içine çekilir
- **Krank mili 180°** döner

### 2. SIKIŞMA ZAMANI  
- **Piston yukarı** çıkar
- **Tüm valfler kapalı**
- **Yakıt-hava karışımı sıkışır**
- **Krank mili 180°** döner (toplam 360°)

### 3. ÇALIŞMA ZAMANI (GÜÇ)
- **Buji ateşleme** yapar
- **Patlama** piston aşağı iter
- **Tüm valfler kapalı**
- **Güç üretilir** - krank mili 180° döner (toplam 540°)

### 4. EGZOZ ZAMANI
- **Piston yukarı** çıkar  
- **Egzoz valfi açılır**, emme valfi kapalı
- **Yanmış gazlar** dışarı atılır
- **Krank mili 180°** döner (toplam 720°)

### Motor Bileşenleri

#### Üst Kısım
- **Silindir kapağı:** Valfler ve bujiler burada
- **Valfler:** Emme ve egzoz valflleri
- **Bujiler:** Ateşleme yapar
- **Kam mili:** Valfleri hareket ettirir

#### Alt Kısım  
- **Silindir bloku:** Pistonların çalıştığı yer
- **Pistonlar:** Güç üretim elemanı
- **Krank mili:** Pistonlardan gelen hareketi döndürür
- **Yağ karteri:** Motor yağını tutar
            `
          },
          {
            başlık: 'Soğutma ve Yağlama Sistemleri',
            içerik: `
## Soğutma Sistemi

Motor çalışırken **çok ısınır** (800-900°C). Bu ısının kontrol edilmesi gerekir.

### Soğutma Sistemi Bileşenleri

#### 1. Su Radyatörü
- **Motor suyunu** soğutur
- **Ön kısımda** bulunur
- **Fan** ile hava akımı sağlanır

#### 2. Su Pompası
- **Motor suyunu** dolaştırır
- **Krank kayışı** ile çalışır
- **Termostat** ile kontrolü sağlanır

#### 3. Termostat
- **Motor sıcaklığını** kontrol eder
- **85-90°C** civarında açılır
- **Soğuk** başlangıçta kapalı kalır

### Soğutma Suyu Özellikleri
- **Antifriz** içermeli (%50)
- **Donma noktası:** -35°C  
- **Kaynama noktası:** +110°C
- **Korozyon** önleyici olmalı

### Bakım ve Kontrol
- **Seviyeyi** düzenli kontrol edin
- **Yılda bir kez** değiştirin
- **Sızıntı** kontrolü yapın
- **Fan çalışmasını** kontrol edin

## Yağlama Sistemi

Motor parçalarının **sürtünmesini** azaltır ve **aşınmayı** önler.

### Motor Yağının Görevleri

#### 1. Yağlama
- **Hareketli parçaları** yağlar
- **Sürtünmeyi** azaltır
- **Aşınmayı** önler

#### 2. Soğutma  
- **Isıyı** absorbe eder
- **Sıcaklığı** dağıtır
- **Motor sıcaklığını** düşürür

#### 3. Temizlik
- **Karbon birikintilerini** temizler
- **Metal parçacıklarını** toplar
- **Asit oluşumunu** önler

#### 4. Sızdırmazlık
- **Piston-silindir** arası sızdırmazlık
- **Kompresyonu** artırır
- **Güç kaybını** önler

### Yağ Değişim Periyotları
- **Mineral yağ:** 5.000 km
- **Yarı sentetik:** 7.500 km  
- **Full sentetik:** 10.000 km
- **Yağ filtresi:** Her yağ değişiminde
            `
          }
        ]
      }
    ]
  }
};

// Soru-cevap çiftleri için veri hazırlama
const generateQADataset = () => {
  const qaDataset = [];
  let questionId = 1;

  Object.values(EHLIYET_KITAPLARI).forEach(kitap => {
    kitap.bölümler.forEach(bölüm => {
      bölüm.alt_başlıklar.forEach(alt_başlık => {
        
        // Her konu için çoktan seçmeli sorular
        const sorular = generateQuestionsFromContent(alt_başlık.başlık, alt_başlık.içerik, kitap.kategori);
        
        sorular.forEach(soru => {
          qaDataset.push({
            id: questionId++,
            kategori: kitap.kategori,
            konu: alt_başlık.başlık,
            soru: soru.soru,
            şıklar: soru.şıklar,
            doğru_cevap: soru.doğru_cevap,
            açıklama: soru.açıklama,
            zorluk: soru.zorluk,
            kaynak_kitap: kitap.baslik,
            kaynak_bölüm: bölüm.başlık
          });
        });

        // Her konu için AI chat veri setleri
        const chatData = generateChatDataFromContent(alt_başlık.başlık, alt_başlık.içerik);
        
        chatData.forEach(chat => {
          qaDataset.push({
            id: `chat_${questionId++}`,
            type: 'chat',
            kategori: kitap.kategori,
            konu: alt_başlık.başlık,
            user_message: chat.soru,
            ai_response: chat.cevap,
            kaynak_kitap: kitap.baslik,
            kaynak_bölüm: bölüm.başlık
          });
        });
      });
    });
  });

  return qaDataset;
};

// İçerikten soru üretme fonksiyonu
const generateQuestionsFromContent = (konu, içerik, kategori) => {
  const sorular = [];

  // Trafik kuralları soruları
  if (kategori === 'TRAFIK') {
    if (konu.includes('Hız')) {
      sorular.push({
        soru: "Şehir içi maksimum hız limiti kaç km/h'dir?",
        şıklar: ["30 km/h", "50 km/h", "70 km/h", "90 km/h"],
        doğru_cevap: 1,
        açıklama: "Şehir içinde özel bir işaret yoksa maksimum hız 50 km/h'dir.",
        zorluk: "KOLAY"
      });
      
      sorular.push({
        soru: "Otoyollarda maksimum hız limiti kaç km/h'dir?",
        şıklar: ["90 km/h", "110 km/h", "120 km/h", "130 km/h"],
        doğru_cevap: 2,
        açıklama: "Otoyollarda maksimum hız 120 km/h'dir.",
        zorluk: "KOLAY"
      });
    }

    if (konu.includes('Takip')) {
      sorular.push({
        soru: "60 km/h hızla giderken kuru havada bırakılması gereken minimum takip mesafesi kaç metredir?",
        şıklar: ["20 metre", "30 metre", "40 metre", "60 metre"],
        doğru_cevap: 1,
        açıklama: "Kuru havada takip mesafesi hızın yarısı kadar metre olmalıdır. 60 km/h için 30 metre.",
        zorluk: "ORTA"
      });
    }
  }

  // İlk yardım soruları
  if (kategori === 'ILK_YARDIM') {
    if (konu.includes('A-B-C')) {
      sorular.push({
        soru: "İlk yardımda A-B-C kuralının A harfi neyi ifade eder?",
        şıklar: ["Ambulans", "Airway (Hava yolu)", "Acil servis", "Anestezi"],
        doğru_cevap: 1,
        açıklama: "A-B-C kuralında A harfi Airway (Hava yolu açıklığı) anlamına gelir.",
        zorluk: "KOLAY"
      });
    }
  }

  return sorular;
};

// Chat verileri üretme fonksiyonu  
const generateChatDataFromContent = (konu, içerik) => {
  const chatData = [];

  // Genel sorular
  chatData.push({
    soru: `${konu} hakkında bana bilgi verir misin?`,
    cevap: `${konu} konusunda size yardımcı olabilirim. ${içerik.slice(0, 200)}... Bu konuda belirli bir sorunuz var mı?`
  });

  chatData.push({
    soru: `${konu} için hangi kuralları bilmem gerekir?`,
    cevap: `${konu} için en önemli kurallar şunlardır: ${extractKeyRules(içerik)}`
  });

  return chatData;
};

// Anahtar kuralları çıkarma
const extractKeyRules = (içerik) => {
  const kurallar = [];
  const satırlar = içerik.split('\n');
  
  satırlar.forEach(satır => {
    if (satır.includes('- **') || satır.includes('### ')) {
      kurallar.push(satır.replace(/[*#-]/g, '').trim());
    }
  });

  return kurallar.slice(0, 3).join(', ');
};

// Dosyaları oluşturma
const createDataFiles = () => {
  const outputDir = path.join(__dirname, '../data');
  
  // Klasör yoksa oluştur
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Kitap verileri JSON
  fs.writeFileSync(
    path.join(outputDir, 'ehliyet_kitaplari.json'),
    JSON.stringify(EHLIYET_KITAPLARI, null, 2)
  );

  // 2. Soru-cevap veri seti
  const qaDataset = generateQADataset();
  fs.writeFileSync(
    path.join(outputDir, 'ehliyet_qa_dataset.json'),
    JSON.stringify(qaDataset, null, 2)
  );

  // 3. Fine-tuning için JSONL format
  const finetuningData = qaDataset
    .filter(item => item.type === 'chat')
    .map(item => ({
      messages: [
        { role: "user", content: item.user_message },
        { role: "assistant", content: item.ai_response }
      ]
    }));

  const jsonlContent = finetuningData
    .map(item => JSON.stringify(item))
    .join('\n');

  fs.writeFileSync(
    path.join(outputDir, 'ehliyet_finetuning.jsonl'),
    jsonlContent
  );

  // 4. RAG için embedding hazırlığı
  const embeddingData = [];
  Object.values(EHLIYET_KITAPLARI).forEach(kitap => {
    kitap.bölümler.forEach(bölüm => {
      bölüm.alt_başlıklar.forEach(alt_başlık => {
        embeddingData.push({
          id: `${kitap.id}_${bölüm.başlık}_${alt_başlık.başlık}`.replace(/\s+/g, '_'),
          content: alt_başlık.içerik,
          metadata: {
            kitap: kitap.baslik,
            kategori: kitap.kategori,
            bölüm: bölüm.başlık,
            alt_başlık: alt_başlık.başlık
          }
        });
      });
    });
  });

  fs.writeFileSync(
    path.join(outputDir, 'ehliyet_embedding_data.json'),
    JSON.stringify(embeddingData, null, 2)
  );

  console.log('✅ Tüm veri dosyaları oluşturuldu:');
  console.log(`📚 Kitap verileri: ${qaDataset.filter(q => q.type !== 'chat').length} soru`);
  console.log(`💬 Chat verileri: ${qaDataset.filter(q => q.type === 'chat').length} diyalog`);
  console.log(`🧠 Embedding verileri: ${embeddingData.length} bölüm`);
  console.log(`📁 Dosyalar: ${outputDir} klasöründe`);
};

// Script'i çalıştır
if (require.main === module) {
  createDataFiles();
}

module.exports = {
  EHLIYET_KITAPLARI,
  generateQADataset,
  createDataFiles
}; 