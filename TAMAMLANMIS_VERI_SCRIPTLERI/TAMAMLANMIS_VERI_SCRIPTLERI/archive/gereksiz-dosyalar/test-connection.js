const { PrismaClient } = require('@prisma/client');

const testConnections = [
  // Pooler Transaction Mode
  "postgresql://postgres.kmqyoxhpkblrmjbfdjlb:Ehliyetsaas2024!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
  
  // Pooler Session Mode  
  "postgresql://postgres.kmqyoxhpkblrmjbfdjlb:Ehliyetsaas2024!@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
  
  // Direct Connection
  "postgresql://postgres.kmqyoxhpkblrmjbfdjlb:Ehliyetsaas2024!@db.kmqyoxhpkblrmjbfdjlb.supabase.co:5432/postgres",
  
  // Alternative Direct Connection
  "postgresql://postgres.kmqyoxhpkblrmjbfdjlb:Ehliyetsaas2024!@aws-0-eu-central-1.compute.amazonaws.com:5432/postgres"
];

async function testConnection(url, index) {
  console.log(`\n🔍 Test ${index + 1}: ${url.split('@')[1]}...`);
  
  try {
    const prisma = new PrismaClient({
      datasources: {
        db: { url }
      }
    });
    
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log(`✅ Bağlantı başarılı! Test result:`, result);
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log(`❌ Hata:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Supabase bağlantı testleri başlıyor...\n');
  
  for (let i = 0; i < testConnections.length; i++) {
    const success = await testConnection(testConnections[i], i);
    if (success) {
      console.log(`\n🎉 Çalışan connection bulundu! Index: ${i + 1}`);
      console.log(`URL: ${testConnections[i]}`);
      break;
    }
  }
  
  console.log('\n✅ Test tamamlandı.');
}

main().catch(console.error); 