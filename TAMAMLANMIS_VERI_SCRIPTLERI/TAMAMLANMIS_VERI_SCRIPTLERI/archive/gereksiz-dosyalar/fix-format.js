// Soru formatı problemlerini düzelten özel API
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Sadece POST isteği kabul edilir' });
  }

  try {
    console.log('🔧 Soru formatı düzeltme başlıyor...');

    // Mevcut soruları analiz et
    const tumSorular = await prisma.soru.findMany({
      orderBy: { olusturmaTarihi: 'asc' }
    });

    console.log(`📊 Toplam ${tumSorular.length} soru analiz ediliyor...`);

    let updatedCount = 0;
    let fixedQuestions = [];

    for (const soru of tumSorular) {
      let needsUpdate = false;
      let yeniSoru = soru.soru;
      let yeniCevaplar = [...soru.cevaplar];

      // 1. HTML etiketlerini temizle
      if (yeniSoru.includes('<p>') || yeniSoru.includes('</p>') || yeniSoru.includes('<strong>')) {
        yeniSoru = yeniSoru.replace(/<\/?p>/g, '');
        yeniSoru = yeniSoru.replace(/<\/?strong>/g, '');
        yeniSoru = yeniSoru.trim();
        needsUpdate = true;
      }

      // 2. I-II-III formatındaki soruları düzelt
      if (yeniSoru.includes('I-') && yeniSoru.includes('II-') && yeniSoru.includes('III-')) {
        const parts = yeniSoru.split(/Yukarıdakilerden|yukarıdakilerden/i);
        if (parts.length > 1) {
          const secenekler = parts[0].trim();
          const soruKismi = parts[1].trim();
          
          // Seçenekleri düzenle
          let duzenlenmisSoru = secenekler.replace(/I-\s*/g, '• ');
          duzenlenmisSoru = duzenlenmisSoru.replace(/II-\s*/g, '• ');
          duzenlenmisSoru = duzenlenmisSoru.replace(/III-\s*/g, '• ');
          duzenlenmisSoru = duzenlenmisSoru.replace(/IV-\s*/g, '• ');
          
          yeniSoru = duzenlenmisSoru + '\n\nYukarıdakilerden' + soruKismi;
          needsUpdate = true;
        }
      }

      // 3. Boş cevapları düzelt
      const bosCevapVar = yeniCevaplar.some(c => !c || c.trim() === '' || c === null);
      if (bosCevapVar) {
        yeniCevaplar = yeniCevaplar.map((cevap, index) => {
          if (!cevap || cevap.trim() === '' || cevap === null) {
            // I-II-III formatındaki sorulara özel çözüm
            if (yeniSoru.includes('• ')) {
              const specialAnswers = {
                0: 'I - II',
                1: 'I - III', 
                2: 'II - III',
                3: 'I - II - III'
              };
              return specialAnswers[index] || `Seçenek ${String.fromCharCode(65 + index)}`;
            }
            return `Seçenek ${String.fromCharCode(65 + index)}`;
          }
          return cevap;
        });
        needsUpdate = true;
      }

      // 4. Görsel referansı olan ama görsel olmayan soruları işaretle
      if (yeniSoru.includes('Görselde') || yeniSoru.includes('Şekilde') || yeniSoru.includes('görselde') || yeniSoru.includes('şekilde')) {
        if (!yeniSoru.includes('[GÖRSEL GEREKLI]')) {
          yeniSoru = '[GÖRSEL GEREKLİ] ' + yeniSoru;
          needsUpdate = true;
        }
      }

      // 5. Çok uzun soruları kısalt
      if (yeniSoru.length > 500) {
        const sentences = yeniSoru.split(/[.!?]/);
        if (sentences.length > 2) {
          yeniSoru = sentences.slice(0, 2).join('.') + '.';
          needsUpdate = true;
        }
      }

      // Güncelleme gerekiyorsa uygula
      if (needsUpdate) {
        try {
          await prisma.soru.update({
            where: { id: soru.id },
            data: {
              soru: yeniSoru,
              cevaplar: yeniCevaplar
            }
          });
          
          updatedCount++;
          fixedQuestions.push({
            id: soru.id,
            eskiSoru: soru.soru.substring(0, 100) + '...',
            yeniSoru: yeniSoru.substring(0, 100) + '...',
            eskiCevaplar: soru.cevaplar,
            yeniCevaplar: yeniCevaplar
          });
          
          console.log(`✅ Soru ${soru.id} düzeltildi`);
        } catch (error) {
          console.log(`⚠️ Soru ${soru.id} güncellenemedi: ${error.message}`);
        }
      }
    }

    // Özel düzeltmeler
    const ozelDuzeltmeler = [
      {
        id: 'özel_1',
        soru: 'I- Arkadan çarpma\nII- Kırmızı ışıkta geçme\nIII- Kavşaklarda geçiş önceliğine uymama\n\nYukarıdakilerden hangileri trafik kazalarında asli kusur sayılır?',
        cevaplar: ['I - II', 'I - III', 'II - III', 'I - II - III'],
        dogruCevap: 3
      },
      {
        id: 'özel_2', 
        soru: '[GÖRSEL GEREKLİ] Görselde bebeklerde ilk yardım olarak uygulanan Heimlich manevrasının uygulama aşamaları karışık olarak verilmiştir. Buna göre, sıralamanın doğru olması için numaralanmış aşamalardan hangileri yer değiştirmelidir?',
        cevaplar: ['I ve II', 'I ve IV', 'II ve III', 'III ve IV'],
        dogruCevap: 1
      }
    ];

    // Özel düzeltmeleri bul ve uygula
    for (const ozel of ozelDuzeltmeler) {
      const hedefSoru = tumSorular.find(s => 
        s.soru.includes('Arkadan çarpma') && ozel.id === 'özel_1' ||
        s.soru.includes('Heimlich') && ozel.id === 'özel_2'
      );
      
      if (hedefSoru) {
        try {
          await prisma.soru.update({
            where: { id: hedefSoru.id },
            data: {
              soru: ozel.soru,
              cevaplar: ozel.cevaplar,
              dogruCevap: ozel.dogruCevap
            }
          });
          updatedCount++;
          console.log(`🎯 Özel düzeltme ${ozel.id} uygulandı`);
        } catch (error) {
          console.log(`⚠️ Özel düzeltme ${ozel.id} uygulanamadı: ${error.message}`);
        }
      }
    }

    const totalQuestions = await prisma.soru.count();
    
    console.log('✅ Soru formatı düzeltme tamamlandı!');
    console.log(`📊 ${updatedCount} soru güncellendi`);
    console.log(`📝 Toplam soru sayısı: ${totalQuestions}`);

    res.status(200).json({
      success: true,
      message: 'Soru formatı problemleri başarıyla düzeltildi',
      updatedCount,
      totalQuestions,
      fixedQuestions: fixedQuestions.slice(0, 5) // İlk 5 örneği döndür
    });

  } catch (error) {
    console.error('❌ Soru formatı düzeltme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Soru formatı düzeltme işlemi başarısız',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
} 