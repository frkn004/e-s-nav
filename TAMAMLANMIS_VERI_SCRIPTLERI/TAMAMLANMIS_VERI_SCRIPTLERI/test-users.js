// Database kullanıcılarını listele
import prisma from './lib/database.js';

async function testUsers() {
  try {
    console.log('🔍 Database kullanıcıları listeleniyor...\n');
    
    const users = await prisma.kullanici.findMany({
      include: {
        firma: {
          select: {
            ad: true
          }
        }
      }
    });

    if (users.length === 0) {
      console.log('❌ Hiç kullanıcı bulunamadı!');
      return;
    }

    console.log(`✅ ${users.length} kullanıcı bulundu:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. 👤 ${user.ad} ${user.soyad}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👔 Rol: ${user.rol}`);
      console.log(`   🏢 Firma: ${user.firma?.ad || 'Bilinmiyor'}`);
      console.log(`   📅 Kayıt: ${user.olusturmaTarihi?.toLocaleDateString('tr-TR')}`);
      console.log(`   🔑 Şifre Hash: ${user.sifreHash ? '✅ Var' : '❌ Yok'}`);
      console.log('');
    });

    console.log('🎯 Login Test Bilgileri:');
    console.log('   Super Admin: admin@ehliyet-saas.com / admin123');
    console.log('   Firma Admin: admin@istanbul-surucu.com / istanbul123'); 
    console.log('   Öğrenci: ahmet@test.com / ogrenci123');

  } catch (error) {
    console.error('💥 Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUsers(); 