// Gerçek firma verileri ve ciro verileri ekle
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedRealData() {
  console.log('🚀 Gerçek firma verileri ekleniyor...');

  try {
    // Önce mevcut verileri temizle
    console.log('🧹 Mevcut veriler temizleniyor...');
    await prisma.sinavSonuc.deleteMany({});
    await prisma.odemeGecmisi.deleteMany({});
    await prisma.aktivasyonKodu.deleteMany({});
    await prisma.kullanici.deleteMany({});
    await prisma.firma.deleteMany({});
    console.log('✅ Veriler temizlendi');

    // 1. Gerçek firmalar ekle
    const firmalar = [
      {
        ad: 'Ankara Sürücü Kursu',
        email: 'info@ankarasurucu.com',
        telefon: '0312 555 12 34',
        adres: 'Çankaya, Ankara',
        paketTipi: 'PREMIUM',
        aktif: true,
        lisansBaslangic: new Date('2024-01-15'),
        lisansBitis: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 yıl
        demoBitis: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        olusturmaTarihi: new Date('2024-01-15')
      },
      {
        ad: 'İzmir Güvenli Sürüş',
        email: 'admin@izmirguvenli.com',
        telefon: '0232 444 56 78',
        adres: 'Konak, İzmir',
        paketTipi: 'PREMIUM',
        aktif: true,
        lisansBaslangic: new Date('2024-02-20'),
        lisansBitis: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
        demoBitis: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
        olusturmaTarihi: new Date('2024-02-20')
      },
      {
        ad: 'Antalya Modern Sürücü Kursu',
        email: 'contact@antalyamodern.com',
        telefon: '0242 333 44 55',
        adres: 'Muratpaşa, Antalya',
        paketTipi: 'TEMEL',
        aktif: true,
        lisansBaslangic: new Date('2024-03-10'),
        lisansBitis: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        demoBitis: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        olusturmaTarihi: new Date('2024-03-10')
      },
      {
        ad: 'Bursa Profesyonel Sürüş',
        email: 'info@bursaprofesyonel.com',
        telefon: '0224 777 88 99',
        adres: 'Osmangazi, Bursa',
        paketTipi: 'PREMIUM',
        aktif: true,
        lisansBaslangic: new Date('2024-04-05'),
        lisansBitis: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000),
        demoBitis: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000),
        olusturmaTarihi: new Date('2024-04-05')
      },
      {
        ad: 'Adana Hızlı Ehliyet',
        email: 'admin@adanahizli.com',
        telefon: '0322 666 77 88',
        adres: 'Seyhan, Adana',
        paketTipi: 'TEMEL',
        aktif: true,
        lisansBaslangic: new Date('2024-05-12'),
        lisansBitis: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        demoBitis: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        olusturmaTarihi: new Date('2024-05-12')
      },
      {
        ad: 'Trabzon Karadeniz Sürücü Kursu',
        email: 'info@trabzonkaradeniz.com',
        telefon: '0462 111 22 33',
        adres: 'Ortahisar, Trabzon',
        paketTipi: 'PREMIUM',
        aktif: true,
        lisansBaslangic: new Date('2024-06-18'),
        lisansBitis: new Date(Date.now() + 330 * 24 * 60 * 60 * 1000),
        demoBitis: new Date(Date.now() + 330 * 24 * 60 * 60 * 1000),
        olusturmaTarihi: new Date('2024-06-18')
      },
      {
        ad: 'Gaziantep Güvenli Ehliyet',
        email: 'admin@gaziantepguvenli.com',
        telefon: '0342 999 88 77',
        adres: 'Şahinbey, Gaziantep',
        paketTipi: 'TEMEL',
        aktif: true,
        lisansBaslangic: new Date('2024-07-22'),
        lisansBitis: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        demoBitis: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        olusturmaTarihi: new Date('2024-07-22')
      },
      {
        ad: 'Konya Akademi Sürücü Kursu',
        email: 'info@konyaakademi.com',
        telefon: '0332 555 66 77',
        adres: 'Meram, Konya',
        paketTipi: 'PREMIUM',
        aktif: true,
        lisansBaslangic: new Date('2024-08-15'),
        lisansBitis: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000),
        demoBitis: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000),
        olusturmaTarihi: new Date('2024-08-15')
      },
      {
        ad: 'Diyarbakır Sürücü Akademisi',
        email: 'admin@diyarbakirakademi.com',
        telefon: '0412 444 55 66',
        adres: 'Kayapınar, Diyarbakır',
        paketTipi: 'TEMEL',
        aktif: true,
        lisansBaslangic: new Date('2024-09-05'),
        lisansBitis: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
        demoBitis: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
        olusturmaTarihi: new Date('2024-09-05')
      },
      {
        ad: 'Samsun Güvenli Sürüş Merkezi',
        email: 'info@samsunguvenli.com',
        telefon: '0362 777 99 11',
        adres: 'İlkadım, Samsun',
        paketTipi: 'PREMIUM',
        aktif: true,
        lisansBaslangic: new Date('2024-10-01'),
        lisansBitis: new Date(Date.now() + 280 * 24 * 60 * 60 * 1000),
        demoBitis: new Date(Date.now() + 280 * 24 * 60 * 60 * 1000),
        olusturmaTarihi: new Date('2024-10-01')
      }
    ];

    const createdFirmalar = [];

    for (const firmaData of firmalar) {
      const firma = await prisma.firma.create({
        data: firmaData
      });
      createdFirmalar.push(firma);
      console.log(`✅ Firma oluşturuldu: ${firma.ad}`);

      // Her firma için admin kullanıcısı oluştur
      const adminEmail = firmaData.email.replace('info@', 'admin@').replace('contact@', 'admin@');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const admin = await prisma.kullanici.create({
        data: {
          ad: 'Admin',
          soyad: 'Yönetici',
          email: adminEmail,
          sifreHash: hashedPassword,  // sifreHash olarak değiştir
          rol: 'FIRMA_ADMIN',
          firmaId: firma.id,
          aktif: true,
          olusturmaTarihi: firmaData.olusturmaTarihi
        }
      });
      console.log(`✅ Admin oluşturuldu: ${admin.email}`);

      // Her firma için örnek öğrenciler oluştur
      const ogrenciSayisi = Math.floor(Math.random() * 30) + 10; // 10-40 arası öğrenci
      
      for (let i = 1; i <= ogrenciSayisi; i++) {
        const ogrenciHashedPassword = await bcrypt.hash('ogrenci123', 10);
        
        await prisma.kullanici.create({
          data: {
            ad: `Öğrenci${i}`,
            soyad: `Soyadı${i}`,
            email: `ogrenci${i}@${firmaData.email.split('@')[1]}`,
            sifreHash: ogrenciHashedPassword,  // sifreHash olarak değiştir
            rol: 'OGRENCI',
            firmaId: firma.id,
            aktif: Math.random() > 0.2, // %80 aktif
            tcNo: `${Math.floor(Math.random() * 90000000000) + 10000000000}`, // 11 haneli TC
            dogumTarihi: new Date(2000 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            olusturmaTarihi: new Date(firmaData.olusturmaTarihi.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
          }
        });
      }
      console.log(`✅ ${ogrenciSayisi} öğrenci oluşturuldu`);

      // Ödeme geçmişi oluştur (ciro için)
      const odemeAdedi = Math.floor(Math.random() * 5) + 1; // 1-5 arası ödeme
      
      for (let i = 0; i < odemeAdedi; i++) {
        const odemeTarihi = new Date(
          firmaData.olusturmaTarihi.getTime() + 
          Math.random() * (Date.now() - firmaData.olusturmaTarihi.getTime())
        );
        
        await prisma.odemeGecmisi.create({
          data: {
            firmaId: firma.id,
            tutar: firmaData.paketTipi === 'PREMIUM' ? 749 : 499,
            paketTipi: firmaData.paketTipi,
            sureGun: 365,
            odemeYontemi: 'aktivasyon_kodu',
            durum: 'tamamlandi',
            odemeTarihi,
            lisansBaslangic: firmaData.lisansBaslangic,
            lisansBitis: firmaData.lisansBitis,
            aciklama: `${firmaData.paketTipi} paket yenilemesi`
          }
        });
      }
      console.log(`✅ ${odemeAdedi} ödeme kaydı oluşturuldu`);

      // Aktivasyon kodu oluştur
      const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const kod = `EHL${randomCode}`;
      
      await prisma.aktivasyonKodu.create({
        data: {
          kod,
          paketTipi: firmaData.paketTipi,
          sureGun: 365,
          kullanildi: true,
          kullananFirmaId: firma.id,
          kullanmaTarihi: firmaData.olusturmaTarihi
        }
      });
    }

    // 2. Gerçek sınav sonuçları ekle - şimdilik atla
    /*
    console.log('📝 Sınav sonuçları ekleniyor...');
    
    const tumOgrenciler = await prisma.kullanici.findMany({
      where: { rol: 'OGRENCI' }
    });

    for (const ogrenci of tumOgrenciler.slice(0, 50)) { // İlk 50 öğrenci için
      const sinavSayisi = Math.floor(Math.random() * 10) + 1; // 1-10 sınav
      
      for (let i = 0; i < sinavSayisi; i++) {
        const basariOrani = Math.floor(Math.random() * 40) + 60; // 60-100 arası
        
        await prisma.sinavSonuc.create({
          data: {
            kullaniciId: ogrenci.id,
            kategori: ['TRAFIK', 'ILK_YARDIM', 'MOTOR'][Math.floor(Math.random() * 3)],
            toplamSoru: 50,
            dogruCevap: Math.floor((basariOrani / 100) * 50),
            yanlisCevap: 50 - Math.floor((basariOrani / 100) * 50),
            bosCevap: 0,
            basariOrani,
            gecti: basariOrani >= 70,
            sure: Math.floor(Math.random() * 20) + 10, // 10-30 dakika
            cevapDetaylari: {},
            tamamlanmaTarihi: new Date(
              ogrenci.olusturmaTarihi.getTime() + 
              Math.random() * (Date.now() - ogrenci.olusturmaTarihi.getTime())
            )
          }
        });
      }
    }
    */

    console.log('🎉 Gerçek veriler başarıyla eklendi!');
    console.log(`📊 ${createdFirmalar.length} firma oluşturuldu`);

  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedRealData(); 
 