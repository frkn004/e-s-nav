#!/usr/bin/env node

console.log('🚀 Test scripti başlıyor...');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('📊 Veritabanı bağlantısı test ediliyor...');
    
    const soruSayisi = await prisma.soru.count();
    console.log(`✅ Toplam soru sayısı: ${soruSayisi}`);
    
    const gorselliSorular = await prisma.soru.count({
      where: { NOT: { gorselUrl: null } }
    });
    console.log(`🖼️ Görselli soru sayısı: ${gorselliSorular}`);
    
    const dogruCevapliSorular = await prisma.soru.count({
      where: { NOT: { dogruCevap: null } }
    });
    console.log(`✅ Doğru cevaplı soru sayısı: ${dogruCevapliSorular}`);
    
  } catch (error) {
    console.error('❌ Veritabanı hatası:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase(); 