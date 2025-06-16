const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

// DATABASE_URL'i ayarla
process.env.DATABASE_URL = 'postgresql://postgres.gsdxgqkplgmbdljpcmcn:xeqrom-byBwok-7zevri@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Test verileri ekleniyor...');

  try {
    // Önce mevcut verileri temizle (opsiyonel)
    console.log('🧹 Mevcut veriler temizleniyor...');
    await prisma.odemeGecmisi.deleteMany();
    await prisma.duyuru.deleteMany();
    await prisma.soru.deleteMany();
    await prisma.kullanici.deleteMany();
    await prisma.firma.deleteMany();

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash('123456', 10);

        // 1. Firmalar (Sürücü Kursları)
    console.log('🏢 Firmalar ekleniyor...');
    const firmalar = await Promise.all([
      prisma.firma.create({
        data: {
          ad: 'Ankara Sürücü Kursu',
          telefon: '0312-555-0001',
          email: 'info@ankarasurucu.com',
          adres: 'Kızılay, Ankara',
          aktif: true,
          paketTipi: 'PREMIUM',
          lisansBaslangic: new Date(),
          lisansBitis: new Date('2024-12-31'),
          maxOgrenciSayisi: 500
        }
      }),
      prisma.firma.create({
        data: {
          ad: 'İstanbul Sürücü Akademisi',
          telefon: '0212-555-0002',
          email: 'info@istanbulakademi.com',
          adres: 'Kadıköy, İstanbul',
          aktif: true,
          paketTipi: 'PREMIUM',
          lisansBaslangic: new Date(),
          lisansBitis: new Date('2024-11-30'),
          maxOgrenciSayisi: 200
        }
      }),
      prisma.firma.create({
        data: {
          ad: 'İzmir Ehliyet Kursu',
          telefon: '0232-555-0003',
          email: 'info@izmirkurs.com',
          adres: 'Konak, İzmir',
          aktif: true,
          paketTipi: 'TEMEL',
          lisansBaslangic: new Date(),
          lisansBitis: new Date('2024-10-31'),
          maxOgrenciSayisi: 100
        }
      }),
      prisma.firma.create({
        data: {
          ad: 'Antalya Sürücü Okulu',
          telefon: '0242-555-0004',
          email: 'info@antalyaokul.com',
          adres: 'Muratpaşa, Antalya',
          aktif: true,
          paketTipi: 'PREMIUM',
          lisansBaslangic: new Date(),
          lisansBitis: new Date('2025-01-31'),
          maxOgrenciSayisi: 300
        }
      }),
      prisma.firma.create({
        data: {
          ad: 'Bursa Ehliyet Merkezi',
          telefon: '0224-555-0005',
          email: 'info@bursamerkez.com',
          adres: 'Osmangazi, Bursa',
          aktif: false,
          paketTipi: 'TEMEL',
          lisansBaslangic: new Date(),
          lisansBitis: new Date('2024-09-30'),
          maxOgrenciSayisi: 150
        }
      })
    ]);

    console.log(`✅ ${firmalar.length} firma eklendi`);

    // 2. Kullanıcılar (Öğrenciler ve Yöneticiler)
    console.log('👥 Kullanıcılar ekleniyor...');
    
    // Super Admin
    await prisma.kullanici.create({
      data: {
        ad: 'Sistem',
        soyad: 'Yöneticisi',
        email: 'admin@ehliyet-sinav.com',
        telefon: '0555-000-0000',
        sifreHash: hashedPassword,
        rol: 'SUPER_ADMIN',
        aktif: true,
        firmaId: firmalar[0].id // İlk firmaya bağlı olsun
      }
    });

    // Firma yöneticileri ve öğrenciler
    for (let i = 0; i < firmalar.length; i++) {
      const firma = firmalar[i];
      
      // Firma yöneticisi
      await prisma.kullanici.create({
        data: {
          ad: `Yönetici`,
          soyad: `${i + 1}`,
          email: `yonetici${i + 1}@${firma.email.split('@')[1]}`,
          telefon: `0555-${String(i + 1).padStart(3, '0')}-0000`,
          sifreHash: hashedPassword,
          rol: 'FIRMA_ADMIN',
          aktif: true,
          firmaId: firma.id
        }
      });

      // Öğrenciler
      const ogrenciSayisi = Math.floor(Math.random() * 15) + 10; // 10-25 öğrenci
      for (let j = 0; j < ogrenciSayisi; j++) {
        await prisma.kullanici.create({
          data: {
            ad: `Öğrenci${j + 1}`,
            soyad: `Soyad${j + 1}`,
            email: `ogrenci${j + 1}@${firma.email.split('@')[1]}`,
            telefon: `0555-${String(i + 1).padStart(3, '0')}-${String(j + 1).padStart(4, '0')}`,
            sifreHash: hashedPassword,
            rol: 'OGRENCI',
            aktif: Math.random() > 0.1, // %90 aktif
            firmaId: firma.id,
            tcNo: `${Math.floor(Math.random() * 90000000000) + 10000000000}`,
            dogumTarihi: new Date(1990 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
          }
        });
      }
    }

    console.log('✅ Kullanıcılar eklendi');

    // 3. Sorular
    console.log('❓ Sorular ekleniyor...');
    const sorular = [
      {
        soru: 'Aşağıdakilerden hangisi trafik işareti değildir?',
        cevaplar: ['Dur işareti', 'Hız sınırı işareti', 'Reklam tabelası', 'Yön işareti'],
        dogruCevap: 2,
        kategori: 'TRAFIK',
        zorluk: 'KOLAY',
        embedding: []
      },
      {
        soru: 'Şehir içi hız sınırı kaç km/h\'dir?',
        cevaplar: ['50 km/h', '60 km/h', '70 km/h', '80 km/h'],
        dogruCevap: 0,
        kategori: 'TRAFIK',
        zorluk: 'KOLAY',
        embedding: []
      },
      {
        soru: 'Alkollü araç kullanmanın cezası nedir?',
        cevaplar: ['Sadece para cezası', 'Ehliyet iptali', 'Para cezası ve ehliyet geçici olarak alınır', 'Sadece uyarı'],
        dogruCevap: 2,
        kategori: 'TRAFIK',
        zorluk: 'ORTA',
        embedding: []
      },
      {
        soru: 'Okul önlerinde hız sınırı kaç km/h\'dir?',
        cevaplar: ['20 km/h', '30 km/h', '40 km/h', '50 km/h'],
        dogruCevap: 1,
        kategori: 'TRAFIK',
        zorluk: 'ORTA',
        embedding: []
      },
      {
        soru: 'Kırmızı ışıkta geçmenin cezası kaç puandır?',
        cevaplar: ['3 puan', '4 puan', '6 puan', '9 puan'],
        dogruCevap: 2,
        kategori: 'TRAFIK',
        zorluk: 'ZOR',
        embedding: []
      }
    ];

    for (const soruData of sorular) {
      await prisma.soru.create({ data: soruData });
    }

    console.log(`✅ ${sorular.length} soru eklendi`);

    // 4. Duyurular
    console.log('📢 Duyurular ekleniyor...');
    
    // İlk firma yöneticisini bulalım
    const ilkYonetici = await prisma.kullanici.findFirst({
      where: { rol: 'FIRMA_ADMIN' }
    });
    
    for (let i = 0; i < firmalar.length; i++) {
      const firma = firmalar[i];
      if (firma.aktif) {
        await prisma.duyuru.create({
          data: {
            baslik: `${firma.ad} - Yeni Dönem Başlıyor`,
            icerik: `Sevgili öğrencilerimiz, yeni dönem ${new Date().toLocaleDateString('tr-TR')} tarihinde başlayacaktır. Tüm öğrencilerimizin katılımını bekliyoruz.`,
            firmaId: firma.id,
            olusturanId: ilkYonetici?.id || firmalar[0].id,
            hedefRoller: ['OGRENCI'],
            aktif: true
          }
        });

        await prisma.duyuru.create({
          data: {
            baslik: 'Sınav Tarihleri Açıklandı',
            icerik: 'Bu ay yapılacak ehliyet sınavlarının tarihleri açıklandı. Detaylar için kursumuza başvurunuz.',
            firmaId: firma.id,
            olusturanId: ilkYonetici?.id || firmalar[0].id,
            hedefRoller: ['OGRENCI', 'FIRMA_ADMIN'],
            aktif: true
          }
        });
      }
    }

    console.log('✅ Duyurular eklendi');

    // 5. Ödemeler
    console.log('💳 Ödemeler ekleniyor...');
    
    for (let i = 0; i < firmalar.length; i++) {
      const firma = firmalar[i];
      if (firma.aktif) {
        await prisma.odemeGecmisi.create({
          data: {
            firmaId: firma.id,
            tutar: Math.floor(Math.random() * 1000) + 500, // 500-1500 TL
            paketTipi: firma.paketTipi,
            sureGun: 365, // 1 yıl
            odemeYontemi: 'kredi_karti',
            referansNo: `REF${Date.now()}${i}`,
            aciklama: 'Yıllık paket ödemesi',
            durum: Math.random() > 0.2 ? 'tamamlandi' : 'bekliyor', // %80 tamamlandı
            lisansBaslangic: firma.lisansBaslangic,
            lisansBitis: firma.lisansBitis
          }
        });
      }
    }

    console.log('✅ Ödemeler eklendi');

    // Özet bilgiler
    const istatistikler = {
      firmalar: await prisma.firma.count(),
      kullanicilar: await prisma.kullanici.count(),
      ogrenciler: await prisma.kullanici.count({ where: { rol: 'OGRENCI' } }),
      sorular: await prisma.soru.count(),
      duyurular: await prisma.duyuru.count(),
      odemeler: await prisma.odemeGecmisi.count()
    };

    console.log('\n🎉 Test verileri başarıyla eklendi!');
    console.log('📊 Eklenen veriler:');
    console.log(`   👔 Firmalar: ${istatistikler.firmalar}`);
    console.log(`   👥 Toplam Kullanıcılar: ${istatistikler.kullanicilar}`);
    console.log(`   🎓 Öğrenciler: ${istatistikler.ogrenciler}`);
    console.log(`   ❓ Sorular: ${istatistikler.sorular}`);
    console.log(`   📢 Duyurular: ${istatistikler.duyurular}`);
    console.log(`   💳 Ödemeler: ${istatistikler.odemeler}`);

    console.log('\n🔐 Giriş bilgileri:');
    console.log('   Super Admin: admin@ehliyet-sinav.com / 123456');
    console.log('   Firma Yöneticileri: yonetici1@ankarasurucu.com / 123456');
    console.log('   Öğrenciler: ogrenci1@ankarasurucu.com / 123456');

  } catch (error) {
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 