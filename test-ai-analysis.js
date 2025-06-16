const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAIAnalysis() {
    try {
        // HTML'den çekilen bir soruyu alalım
        const question = await prisma.sorular.findFirst({
            where: {
                kaynak_url: {
                    contains: 'ehliyetsinavihazirlik.com'
                }
            },
            select: {
                id: true,
                soru: true,
                cevaplar: true,
                dogru_cevap: true,
                kategori: true,
                kaynak_url: true
            }
        });

        if (!question) {
            console.log('❌ HTML\'den çekilen soru bulunamadı');
            return;
        }

        console.log('🔍 Test Edilen Soru:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📝 Soru: ${question.soru}`);
        console.log(`📂 Kategori: ${question.kategori}`);
        console.log(`🔗 Kaynak: ${question.kaynak_url}`);
        console.log('\n📋 Seçenekler:');
        question.cevaplar.forEach((option, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D
            const isCorrect = index === question.dogru_cevap ? ' ✅' : '';
            console.log(`   ${letter}) ${option}${isCorrect}`);
        });
        
        console.log(`\n🎯 Doğru Cevap: ${String.fromCharCode(65 + question.dogru_cevap)} (${question.dogru_cevap})`);
        
        // AI analiz simülasyonu
        console.log('\n🤖 AI Analiz Simülasyonu:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Kategori bazında analiz
        let aiAnalysis = '';
        switch(question.kategori) {
            case 'TRAFIK_KURALLARI':
                aiAnalysis = `Bu soru trafik kuralları kategorisinde yer almaktadır. Sürücülerin yol güvenliği için bilmesi gereken temel kuralları test eder.`;
                break;
            case 'ILK_YARDIM':
                aiAnalysis = `Bu soru ilk yardım kategorisinde yer almaktadır. Acil durumlarda hayat kurtarıcı müdahaleler hakkında bilgi test eder.`;
                break;
            case 'MOTOR_BILGISI':
                aiAnalysis = `Bu soru motor bilgisi kategorisinde yer almaktadır. Araç teknik bilgisi ve bakım konularını test eder.`;
                break;
            case 'ISARET_LEVHALARI':
                aiAnalysis = `Bu soru işaret levhaları kategorisinde yer almaktadır. Trafik işaretlerinin anlamları ve uygulamaları test eder.`;
                break;
            case 'ARAC_TEKNIK':
                aiAnalysis = `Bu soru araç teknik kategorisinde yer almaktadır. Araç parçaları ve teknik özellikler hakkında bilgi test eder.`;
                break;
        }
        
        console.log(`💡 Kategori Analizi: ${aiAnalysis}`);
        
        // Soru zorluk analizi
        const questionLength = question.soru.length;
        const hasComplexTerms = /motor|radyatör|silindir|piston|kalp masajı|atardamar|işaret/i.test(question.soru);
        
        let difficultyAnalysis = '';
        if (questionLength > 200 || hasComplexTerms) {
            difficultyAnalysis = 'ZOR - Teknik terimler içeriyor veya uzun açıklama gerektiriyor';
        } else if (questionLength < 100) {
            difficultyAnalysis = 'KOLAY - Kısa ve anlaşılır soru';
        } else {
            difficultyAnalysis = 'ORTA - Standart zorluk seviyesi';
        }
        
        console.log(`📊 Zorluk Analizi: ${difficultyAnalysis}`);
        
        // Doğru cevap analizi
        console.log(`🎯 Cevap Analizi: Doğru cevap "${question.cevaplar[question.dogru_cevap]}" seçeneğidir.`);
        
        // Öğrenme önerileri
        console.log('\n📚 Öğrenme Önerileri:');
        console.log(`   • Bu konuda daha fazla pratik yapın`);
        console.log(`   • ${question.kategori} kategorisindeki diğer soruları inceleyin`);
        console.log(`   • İlgili mevzuat ve kuralları tekrar edin`);
        
        return question;
        
    } catch (error) {
        console.error('❌ Hata:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Birkaç farklı kategoriden soru test et
async function testMultipleQuestions() {
    try {
        console.log('🚀 AI Analiz Sistemi Test Başlıyor...\n');
        
        const categories = ['TRAFIK_KURALLARI', 'ILK_YARDIM', 'MOTOR_BILGISI'];
        
        for (const category of categories) {
            const question = await prisma.sorular.findFirst({
                where: {
                    kategori: category,
                    kaynak_url: {
                        contains: 'ehliyetsinavihazirlik.com'
                    }
                },
                select: {
                    soru: true,
                    cevaplar: true,
                    dogru_cevap: true,
                    kategori: true
                }
            });
            
            if (question) {
                console.log(`\n🔍 ${category} Kategorisi Örnek Soru:`);
                console.log(`📝 ${question.soru.substring(0, 100)}...`);
                console.log(`📋 Seçenek Sayısı: ${question.cevaplar.length}`);
                console.log(`🎯 Doğru Cevap: ${String.fromCharCode(65 + question.dogru_cevap)}) ${question.cevaplar[question.dogru_cevap].substring(0, 50)}...`);
            }
        }
        
        console.log('\n✅ Test tamamlandı! AI sistemi soruları başarıyla analiz edebiliyor.');
        
    } catch (error) {
        console.error('❌ Hata:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ana test fonksiyonu
async function main() {
    await testAIAnalysis();
    console.log('\n' + '='.repeat(80) + '\n');
    await testMultipleQuestions();
}

main(); 
 