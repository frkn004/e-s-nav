const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showStats() {
  try {
    console.log('📊 VERİTABANI İSTATİSTİKLERİ');
    console.log('═══════════════════════════════');
    
    const totalQuestions = await prisma.soru.count();
    console.log(`📝 Toplam Soru: ${totalQuestions}`);
    
    const questionsWithImages = await prisma.soru.count({
      where: { NOT: { gorselUrl: null } }
    });
    console.log(`🖼️ Görselli Soru: ${questionsWithImages}`);
    
    const questionsWithAnswers = await prisma.soru.count({
      where: { NOT: { dogruCevap: null } }
    });
    console.log(`✅ Doğru Cevaplı: ${questionsWithAnswers}`);
    
    const questionsWithExplanations = await prisma.soru.count({
      where: { NOT: { aciklama: null } }
    });
    console.log(`📖 Açıklamalı: ${questionsWithExplanations}`);
    
    console.log('═══════════════════════════════');
    
    const completionRate = totalQuestions > 0 ? (questionsWithAnswers / totalQuestions) * 100 : 0;
    console.log(`🎯 Tamamlanma Oranı: ${completionRate.toFixed(1)}%`);
    
    if (completionRate < 50) {
      console.log('⚠️ Düşük tamamlanma oranı! AI analizi gerekli.');
    }
    
    if (questionsWithImages > 0) {
      console.log('🖼️ Görsel indirme işlemi yapılabilir.');
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showStats(); 