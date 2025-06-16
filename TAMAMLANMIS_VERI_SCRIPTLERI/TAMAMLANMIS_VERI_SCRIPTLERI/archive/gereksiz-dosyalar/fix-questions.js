// Soru format problemlerini düzelten API endpoint
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Sadece POST isteği kabul edilir' });
  }

  try {
    console.log('🔧 Soru format problemleri düzeltiliyor...');

    const fixes = [
      // Boş şıkları düzelt - yeni format
      {
        id: 'cm65k8zbb0000l5lbxr7y0000', // Örnek - gerçek ID kullanmak gerekir
        soru: 'Tehlikeli madde taşıyan araçlar arızalandığında aşağıdakilerden hangisi yapılmalıdır?',
        cevaplar: [
          'Acil uyarı ışıkları ile diğer araç sürücüleri uyarılmalı',
          'Aracın ön ve arkasına büyük boyutlu taşlar dizilmeli',
          'Kırmızı ışık veren cihazlarla işaretlenip gözcü bulundurulmalı',
          'Araç üzerine tehlikeli madde yazılı levhalar konulmalı'
        ],
        dogruCevap: 2
      }
    ];

    // Önce mevcut soruları listeleyelim
    const mevcutSorular = await prisma.soru.findMany({
      take: 10,
      orderBy: { olusturmaTarihi: 'asc' }
    });

    console.log(`📋 ${mevcutSorular.length} soru bulundu`);
    
    // Boş şıklı soruları bulalım
    const problemliSorular = await prisma.soru.findMany({
      where: {
        OR: [
          { soru: { contains: 'I-' } },
          { soru: { contains: 'II-' } },
          { soru: { contains: 'III-' } },
          { soru: { startsWith: 'p>' } }, // HTML etiketleri ile başlayanlar
        ]
      }
    });

    console.log(`🔍 ${problemliSorular.length} problemli soru bulundu`);

    let updatedCount = 0;

    // Problemli soruları düzelt
    for (const soru of problemliSorular) {
      let yeniSoru = soru.soru;
      let yeniCevaplar = soru.cevaplar;

      // HTML etiketlerini temizle
      yeniSoru = yeniSoru.replace(/<\/?p>/g, '');
      yeniSoru = yeniSoru.replace(/<\/?strong>/g, '');

      // I-, II-, III- formatını düzelt
      if (yeniSoru.includes('I-') && yeniSoru.includes('II-') && yeniSoru.includes('III-')) {
        // Bu tür soruları özel olarak formatla
        const parts = yeniSoru.split('Yukarıdakilerden');
        if (parts.length > 1) {
          const seçenekler = parts[0].trim();
          const soru_kismi = 'Yukarıdakilerden' + parts[1];
          yeniSoru = seçenekler + '\n\n' + soru_kismi;
        }
      }

      // Cevapları kontrol et ve düzelt
      if (Array.isArray(yeniCevaplar) && yeniCevaplar.some(c => !c || c.trim() === '')) {
        // Boş cevapları varsayılan değerlerle doldur
        yeniCevaplar = yeniCevaplar.map((cevap, index) => {
          if (!cevap || cevap.trim() === '') {
            return `Seçenek ${String.fromCharCode(65 + index)}`;
          }
          return cevap;
        });
      }

      try {
        await prisma.soru.update({
          where: { id: soru.id },
          data: {
            soru: yeniSoru,
            cevaplar: yeniCevaplar
          }
        });
        
        updatedCount++;
        console.log(`✅ Soru ${soru.id} güncellendi`);
      } catch (error) {
        console.log(`⚠️ Soru ${soru.id} güncellenemedi: ${error.message}`);
      }
    }

    // Toplam soru sayısını kontrol et
    const totalQuestions = await prisma.soru.count();
    
    console.log('✅ Soru format problemleri düzeltildi!');
    console.log(`📊 ${updatedCount} soru güncellendi`);
    console.log(`📝 Toplam soru sayısı: ${totalQuestions}`);

    res.status(200).json({
      success: true,
      message: 'Soru format problemleri başarıyla düzeltildi',
      updatedCount,
      totalQuestions,
      problemliSorular: problemliSorular.length
    });

  } catch (error) {
    console.error('❌ Veritabanı hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Soru düzeltme işlemi başarısız',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
} 