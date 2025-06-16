const puppeteer = require('puppeteer');

async function inspectSite() {
  console.log('🔍 Site yapısını inceliyorum...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  try {
    // İlk site
    console.log('\n📡 ehliyet-soru.com sayfasını açıyorum...');
    await page.goto('https://ehliyet-soru.com/test-1-mayis-2025-ehliyet-deneme-sinavi-937', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const analysis1 = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasTable: !!document.querySelector('table'),
        tableCount: document.querySelectorAll('table').length,
        hasForm: !!document.querySelector('form'),
        radioCount: document.querySelectorAll('input[type="radio"]').length,
        bodyText: document.body.innerText.substring(0, 1000)
      };
    });
    
    console.log('📊 İlk Site Analizi:');
    console.log('Title:', analysis1.title);
    console.log('Table var mı:', analysis1.hasTable);
    console.log('Table sayısı:', analysis1.tableCount);
    console.log('Form var mı:', analysis1.hasForm);
    console.log('Radio button sayısı:', analysis1.radioCount);
    console.log('\nİlk 1000 karakter:');
    console.log(analysis1.bodyText);
    
    console.log('\n⏳ 20 saniye bekleniyor, manual inceleme yapabilirsiniz...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await browser.close();
  }
}

inspectSite().catch(console.error); 