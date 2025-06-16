import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Bilinen doğru cevaplar - manuel kontrol edilmiş
const correctAnswers = {
  // Hız sınırları 
  "Yerleşim yeri içindeki azami hızı": 0, // A) 50
  "Otoyolda azami hızı": 2, // C) 120
  "Şehirlerarası karayolunda azami hızı": 1, // B) 90
  
  // Park kuralları
  "park edildikten sonra": 1, // B) El frenini çekmek
  "el freni": 1, // B) El frenini çekmek
  
  // Takip mesafesi
  "2 saniyede gideceği yol": 0, // A) Takip mesafesi
  "takip mesafesi": 0, // A) Takip mesafesi
  
  // İlk yardım
  "ABC kuralı": 0, // A) Havayolu, nefes, kalp
  "turnike uygulanır": 3, // D) Atardamar geçen tek kemikli bölge
  "Solunum durmasında": 1, // B) Oksijensizlik
  
  // Motor bilgisi
  "motorun tam güç": 0, // A) Soğutma sistemi
  "motor yağı kontrolü": 0, // A) Seviye çubuğu ile
  
  // Emniyet kemeri
  "emniyet kemeri": 0, // A) Trafik kazalarında koruyucu önlem
  
  // Çevre
  "çevrenin temiz kalması": 3 // D) Araç bakımlarını zamanında yaptırmak
};

async function main() {
  console.log('🔧 Doğru cevaplar düzeltiliyor...');

  try {
    let updatedCount = 0;

    // Tüm soruları al
    const questions = await prisma.soru.findMany({
      where: { firmaId: null }
    });

    for (const question of questions) {
      const questionText = question.soru.toLowerCase();
      
      // Anahtar kelimelerle eşleştir
      for (const [keyword, correctIndex] of Object.entries(correctAnswers)) {
        if (questionText.includes(keyword.toLowerCase())) {
          // Doğru cevabı güncelle
          await prisma.soru.update({
            where: { id: question.id },
            data: { dogruCevap: correctIndex }
          });
          
          console.log(`✅ Soru güncellendi: "${question.soru.substring(0, 50)}..." -> Cevap: ${String.fromCharCode(65 + correctIndex)}`);
          updatedCount++;
          break;
        }
      }
    }

    console.log(`\n🎉 ${updatedCount} sorunun doğru cevabı güncellendi!`);

    // Örneklem kontrol
    const sampleQuestions = await prisma.soru.findMany({
      where: { 
        firmaId: null,
        soru: { contains: 'hız' }
      },
      take: 3
    });

    console.log('\n📝 Örnek güncellenen sorular:');
    sampleQuestions.forEach(q => {
      console.log(`   Soru: ${q.soru.substring(0, 60)}...`);
      console.log(`   Doğru: ${String.fromCharCode(65 + q.dogruCevap)} - ${q.cevaplar[q.dogruCevap]}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 