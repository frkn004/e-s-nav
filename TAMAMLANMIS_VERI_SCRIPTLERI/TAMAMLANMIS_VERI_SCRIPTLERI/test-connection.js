const { createClient } = require('@supabase/supabase-js');

// Kullanıcının verdiği bilgiler
const SUPABASE_URL = 'https://gsdxgqkplgmbdljpcmcn.supabase.co';
const SUPABASE_ANON_KEY = 'sbp_cc3f750157c21c70ea19b1d575b0887ed74a0bf7';

// Supabase client oluştur
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔗 Supabase bağlantısı test ediliyor...');
  
  try {
    // Basit bir sorgu yap
    const { data, error } = await supabase
      .from('Firma')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Bağlantı hatası:', error.message);
      return false;
    }
    
    console.log('✅ Supabase bağlantısı başarılı!');
    console.log('📊 Veri:', data);
    return true;
  } catch (err) {
    console.error('❌ Beklenmeyen hata:', err.message);
    return false;
  }
}

// Prisma bağlantısını da test et
async function testPrismaConnection() {
  console.log('\n🔗 Prisma bağlantısı test ediliyor...');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    
    // Geçici olarak DATABASE_URL'i ayarla
    process.env.DATABASE_URL = 'postgresql://postgres.gsdxgqkplgmbdljpcmcn:xeqrom-byBwok-7zevri@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
    
    const prisma = new PrismaClient();
    
    // Basit sorgu
    const firmalar = await prisma.firma.findMany({
      take: 1
    });
    
    console.log('✅ Prisma bağlantısı başarılı!');
    console.log('📊 Firma sayısı:', firmalar.length);
    
    await prisma.$disconnect();
    return true;
  } catch (err) {
    console.error('❌ Prisma bağlantı hatası:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Veritabanı bağlantı testi başlatılıyor...\n');
  
  const supabaseOk = await testConnection();
  const prismaOk = await testPrismaConnection();
  
  console.log('\n📋 Test Sonuçları:');
  console.log(`Supabase: ${supabaseOk ? '✅' : '❌'}`);
  console.log(`Prisma: ${prismaOk ? '✅' : '❌'}`);
  
  if (supabaseOk && prismaOk) {
    console.log('\n🎉 Tüm bağlantılar başarılı! Sistem hazır.');
  } else {
    console.log('\n⚠️  Bazı bağlantılar başarısız oldu.');
  }
}

main().catch(console.error); 