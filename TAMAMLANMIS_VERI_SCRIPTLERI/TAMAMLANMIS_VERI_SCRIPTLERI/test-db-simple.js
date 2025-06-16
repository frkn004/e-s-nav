// Basit database bağlantı testi
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDB() {
  try {
    console.log('🔍 Database bağlantı testi...')
    
    // Basit bir firma oluştur
    const testFirma = await prisma.firma.create({
      data: {
        ad: 'Test Firma',
        email: 'test@test.com',
        lisansBaslangic: new Date(),
        lisansBitis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    })
    
    console.log('✅ Test firma oluşturuldu:', testFirma.ad)
    
    // Firmaları listele
    const firmalar = await prisma.firma.findMany()
    console.log('📊 Toplam firma sayısı:', firmalar.length)
    
  } catch (error) {
    console.error('❌ Database hatası:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testDB() 