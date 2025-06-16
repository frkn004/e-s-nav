const puppeteer = require('puppeteer');

async function inspectSite() {
  const browser = await puppeteer.launch({ 
    headless: false, // Görebilmek için
    devtools: true
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🔍 ehliyet-soru.com test sayfasını inceliyorum...');
    await page.goto('https://ehliyet-soru.com/test-1-mayis-2025-ehliyet-deneme-sinavi-937', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Sayfa yapısını analiz et
    const pageStructure = await page.evaluate(() => {
      // Tüm table elementlerini bul
      const tables = Array.from(document.querySelectorAll('table'));
      const tableInfo = tables.map((table, index) => ({
        index: index,
        rows: table.rows.length,
        firstRowCells: table.rows[0] ? Array.from(table.rows[0].cells).map(cell => cell.innerText.trim().substring(0, 50)) : [],
        hasQuestionPattern: table.innerHTML.includes('Soru') || table.innerHTML.includes('#'),
        innerHTML: table.innerHTML.substring(0, 200) + '...'
      }));
      
      // Form elementlerini bul
      const forms = Array.from(document.querySelectorAll('form'));
      
      // Soru pattern'leri ara
      const possibleQuestions = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.innerText;
        return text && text.match(/^Soru \d+|^\d+\./);
      });
      
      // Radio button'ları ara (A, B, C, D seçenekleri)
      const radioButtons = Array.from(document.querySelectorAll('input[type="radio"]'));
      
      return {
        title: document.title,
        url: window.location.href,
        tables: tableInfo,
        formCount: forms.length,
        possibleQuestions: possibleQuestions.map(el => ({
          tag: el.tagName,
          text: el.innerText.substring(0, 100),
          className: el.className
        })),
        radioButtons: radioButtons.length,
        allText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('📊 Site Yapısı Analizi:');
    console.log('='.repeat(50));
    console.log(`Sayfa Başlığı: ${pageStructure.title}`);
    console.log(`URL: ${pageStructure.url}`);
    console.log(`Table Sayısı: ${pageStructure.tables.length}`);
    console.log(`Form Sayısı: ${pageStructure.formCount}`);
    console.log(`Radio Button Sayısı: ${pageStructure.radioButtons}`);
    console.log(`Olası Soru Elementleri: ${pageStructure.possibleQuestions.length}`);
    
    console.log('\n📋 Table Bilgileri:');
    pageStructure.tables.forEach((table, index) => {
      console.log(`Table ${index + 1}: ${table.rows} satır, Soru içeriyor: ${table.hasQuestionPattern}`);
      if (table.firstRowCells.length > 0) {
        console.log(`  İlk satır: ${table.firstRowCells.join(' | ')}`);
      }
    });
    
    console.log('\n🔍 Olası Sorular:');
    pageStructure.possibleQuestions.forEach((q, index) => {
      console.log(`${index + 1}. ${q.tag}.${q.className}: ${q.text}...`);
    });
    
    console.log('\n📄 İlk 500 karakter:');
    console.log(pageStructure.allText);
    
    // Manuel olarak bekle
    console.log('\n⏳ Site açık kalıyor, manuel inceleme yapabilirsiniz...');
    console.log('DevTools açık, 30 saniye sonra kapanacak...');
    
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await browser.close();
  }
}

// İkinci site test
async function inspectSecondSite() {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('\n🔍 ehliyetsinavihazirlik.com test sayfasını inceliyorum...');
    await page.goto('https://ehliyetsinavihazirlik.com/index.php/e-sinavlar-haziran-sorulari-1.html', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const pageStructure = await page.evaluate(() => {
      // Tüm div elementlerini bul
      const divs = Array.from(document.querySelectorAll('div'));
      const questionDivs = divs.filter(div => 
        div.innerText && (
          div.innerText.includes('Soru') || 
          div.innerText.match(/^\d+\./) ||
          div.innerText.includes('A)') || 
          div.innerText.includes('B)')
        )
      );
      
      // Potansiyel soru container'ları
      const containers = Array.from(document.querySelectorAll('.question, .soru, .quiz, .test, .content'));
      
      return {
        title: document.title,
        url: window.location.href,
        divCount: divs.length,
        questionDivs: questionDivs.length,
        containers: containers.length,
        sampleText: document.body.innerText.substring(0, 800),
        allClasses: Array.from(new Set(
          Array.from(document.querySelectorAll('*[class]'))
            .map(el => el.className)
            .filter(c => c)
        )).slice(0, 20)
      };
    });
    
    console.log('\n📊 İkinci Site Analizi:');
    console.log('='.repeat(50));
    console.log(`Sayfa Başlığı: ${pageStructure.title}`);
    console.log(`URL: ${pageStructure.url}`);
    console.log(`Toplam Div: ${pageStructure.divCount}`);
    console.log(`Soru İçeren Div: ${pageStructure.questionDivs}`);
    console.log(`Container: ${pageStructure.containers}`);
    
    console.log('\n🎨 Bulunan CSS Class'ları:');
    pageStructure.allClasses.forEach(cls => console.log(`  .${cls}`));
    
    console.log('\n📄 Site İçeriği Örneği:');
    console.log(pageStructure.sampleText);
    
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🕵️ Site yapılarını inceliyorum...\n');
  
  await inspectSite();
  await inspectSecondSite();
  
  console.log('\n✅ İnceleme tamamlandı!');
}

main().catch(console.error); 