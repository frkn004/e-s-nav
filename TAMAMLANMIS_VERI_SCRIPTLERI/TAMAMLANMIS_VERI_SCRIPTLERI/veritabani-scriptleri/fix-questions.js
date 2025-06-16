// Soru format problemlerini düzelten script
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/driving_license.db');
const db = new sqlite3.Database(dbPath);

const fixQuestions = () => {
  console.log('🔧 Soru format problemleri düzeltiliyor...');

  const fixes = [
    // Boş şıkları düzelt
    {
      id: 9,
      question_text: 'Tehlikeli madde taşıyan araçlar arızalandığında aşağıdakilerden hangisi yapılmalıdır?',
      option_a: 'Acil uyarı ışıkları ile diğer araç sürücüleri uyarılmalı',
      option_b: 'Aracın ön ve arkasına büyük boyutlu taşlar dizilmeli',
      option_c: 'Kırmızı ışık veren cihazlarla işaretlenip gözcü bulundurulmalı',
      option_d: 'Araç üzerine tehlikeli madde yazılı levhalar konulmalı'
    },
    {
      id: 18,
      question_text: 'Aşağıdakilerden hangisi şokun belirtilerindendir?',
      option_a: 'Kan basıncında yükselme',
      option_b: 'Bilinç seviyesinde azalma',
      option_c: 'Hızlı ve yüzeysel solunum',
      option_d: 'Ciltte soğukluk, solukluk ve nemlilik'
    },
    {
      id: 22,
      question_text: 'Kalp masajı uygulanabilmesi için kesinlikle olması gereken durum aşağıdakilerden hangisidir?',
      option_a: 'Kazazedenin sesli uyaranlara tepki vermemesi',
      option_b: 'Dolaşımın durması, kalp atımlarının alınamaması',
      option_c: 'Nabız alınamaması',
      option_d: 'Solunum olmaması'
    },
    {
      id: 27,
      question_text: 'Aşağıdakilerden hangisi sürücülerin korna kullanımında dikkat etmesi gereken kurallardandır?',
      option_a: 'Yerleşim yerlerinde sürekli kullanmalı',
      option_b: 'Sadece tehlike anında kullanmalı',
      option_c: 'Geceleri daha sık kullanmalı',
      option_d: 'Hız yaparken uyarı için kullanmalı'
    },
    {
      id: 28,
      question_text: 'Kazazedenin dolaşımı değerlendirilirken; I. Bebeklerde kol atardamarından, II. Çocuk ve yetişkinlerde şah damarından nabız alınır. Verilenler için aşağıdakilerden hangisi söylenebilir?',
      option_a: 'I. doğru, II. yanlış',
      option_b: 'I. yanlış, II. doğru',
      option_c: 'Her ikisi de doğru',
      option_d: 'Her ikisi de yanlış'
    },
    {
      id: 33,
      question_text: 'Kamunun yararlanmasına açık olan arazi şeridi, köprüler ve alanlara ne ad verilir?',
      option_a: 'Geçiş yolu',
      option_b: 'Kara yolu',
      option_c: 'Bağlantı yolu',
      option_d: 'Şerit'
    },
    {
      id: 41,
      question_text: 'Şekilde soru işareti (?) ile gösterilen ve aktarma organlarına güç veren hangisidir?',
      option_a: 'Rot',
      option_b: 'Krank mili',
      option_c: 'Vites kutusu',
      option_d: 'Diferansiyel'
    },
    {
      id: 49,
      question_text: '120 Km hızla giden bir otomobilin öndeki araç ile olan takip mesafesi en az kaç metre olmalıdır?',
      option_a: '60',
      option_b: '70',
      option_c: '80',
      option_d: '90'
    },
    {
      id: 53,
      question_text: 'Şekildeki trafik işaretinin anlamı nedir?',
      option_a: 'Dur',
      option_b: 'Durak',
      option_c: 'Devam et',
      option_d: 'Yol ver'
    },
    {
      id: 64,
      question_text: 'I. Turnike uygulandıktan sonra saatin kaç dakikada uygulandığının yazılıp kazazedenin üzerine asılması II. Uzvun koptuğu bölgeye en yakın ve deri bütünlüğü bozulmamış olan yere uygulanması. Verilenlerden hangileri turnike uygulamasında dikkat edilecek hususlardandır?',
      option_a: 'Yalnız I',
      option_b: 'I ve II',
      option_c: 'II ve III',
      option_d: 'I, II ve III'
    },
    {
      id: 65,
      question_text: 'I- Arkadan çarpma, II- Kırmızı ışıkta geçme, III- Kavşaklarda geçiş önceliğine uymama. Yukarıdakilerden hangileri trafik kazalarında asli kusur sayılır?',
      option_a: 'I - II',
      option_b: 'I - III',
      option_c: 'II - III',
      option_d: 'I - II - III'
    },
    {
      id: 72,
      question_text: 'Alt bacak kırığı olursa dıştan uygulanacak atelin boyu ne kadar olmalıdır?',
      option_a: 'Topuktan dize kadar',
      option_b: 'Dizden kalçaya kadar',
      option_c: 'Topuktan kalçaya kadar',
      option_d: 'Topuktan koltuk altına kadar'
    },
    {
      id: 77,
      question_text: 'Görselde bebeklerde ilk yardım olarak uygulanan Heimlich manevrasının uygulama aşamaları karışık olarak verilmiştir. Buna göre, sıralamanın doğru olması için numaralanmış aşamalardan hangileri yer değiştirmelidir?',
      option_a: 'I ve II',
      option_b: 'I ve IV',
      option_c: 'II ve III',
      option_d: 'III ve IV'
    },
    {
      id: 85,
      question_text: 'I. Rot başlarının boşluk yapması, II. Ön cam sileceklerinin çalışmaması, III. Park lambalarının yanmaması, IV. Kısa hüzmeli far ayarının bozuk olması. Araç muayenesi sırasında, numaralanmış arızalardan hangileri ağır kusur olarak değerlendirilir?',
      option_a: 'I ve IV',
      option_b: 'II ve IV',
      option_c: 'I, II ve III',
      option_d: 'II, III ve IV'
    },
    {
      id: 87,
      question_text: 'Sağlıklı yetişkin bir kişinin dakikadaki solunum sayısı kaçtır?',
      option_a: '10 - 18',
      option_b: '12 - 20',
      option_c: '14 - 22',
      option_d: '16 - 24'
    },
    {
      id: 94,
      question_text: 'Karın bölgesinden vurulma sonucu iç kanama olan kazazedede aşağıdaki organlardan hangisinin yaralandığını düşünürsünüz?',
      option_a: 'Böbrek',
      option_b: 'Akciğer',
      option_c: 'Bağırsak',
      option_d: 'Karaciğer'
    }
  ];

  // Soruları güncelle
  const updatePromises = fixes.map(fix => {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE questions 
        SET 
          question_text = ?,
          option_a = ?,
          option_b = ?,
          option_c = ?,
          option_d = ?
        WHERE id = ?
      `;
      
      db.run(sql, [
        fix.question_text,
        fix.option_a,
        fix.option_b,
        fix.option_c,
        fix.option_d,
        fix.id
      ], function(err) {
        if (err) {
          console.error(`❌ Soru ${fix.id} güncellenirken hata:`, err);
          reject(err);
        } else {
          console.log(`✅ Soru ${fix.id} güncellendi`);
          resolve();
        }
      });
    });
  });

  // Problemli soruları sil (tekrarlayan veya bozuk olanlar)
  const deleteQuestions = [29, 88]; // Bu ID'lere sahip sorular silinecek
  
  const deletePromises = deleteQuestions.map(id => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM questions WHERE id = ?', [id], function(err) {
        if (err) {
          console.error(`❌ Soru ${id} silinirken hata:`, err);
          reject(err);
        } else {
          console.log(`🗑️ Problemli soru ${id} silindi`);
          resolve();
        }
      });
    });
  });

  // Tüm işlemleri çalıştır
  Promise.all([...updatePromises, ...deletePromises])
    .then(() => {
      console.log('✅ Tüm soru format problemleri düzeltildi!');
      console.log(`📊 ${fixes.length} soru güncellendi, ${deleteQuestions.length} soru silindi`);
      
      // Toplamda kaç soru kaldığını kontrol et
      db.get('SELECT COUNT(*) as total FROM questions', (err, row) => {
        if (!err) {
          console.log(`📝 Toplam soru sayısı: ${row.total}`);
        }
        db.close();
      });
    })
    .catch(err => {
      console.error('❌ İşlem hatası:', err);
      db.close();
    });
};

// Script'i çalıştır
fixQuestions(); 