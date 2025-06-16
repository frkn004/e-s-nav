const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function debugPageContent(url) {
  console.log(`🔍 DEBUG: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get page content
    const bodyText = await page.evaluate(() => document.body.innerText);
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    
    console.log(`📄 Body text length: ${bodyText.length}`);
    console.log(`📄 First 2000 characters:`);
    console.log('='.repeat(80));
    console.log(bodyText.substring(0, 2000));
    console.log('='.repeat(80));
    
    // Save full content for analysis
    await fs.writeFile('debug_content.txt', bodyText);
    await fs.writeFile('debug_content.html', bodyHTML);
    
    // Test various patterns
    console.log('\n🎯 PATTERN TESTING:');
    
    const patterns = [
      { name: 'hash_pattern_1', regex: /#(\w+)\s+#(\d+)/g },
      { name: 'hash_pattern_2', regex: /#(\w+)\s*\n\s*#(\d+)/g },
      { name: 'question_numbers', regex: /(\d+)\s*\/\s*50/g },
      { name: 'option_patterns', regex: /([A-D])\s+([^\n]+)/g },
      { name: 'question_marks', regex: /[^.]\?/g }
    ];
    
    patterns.forEach(p => {
      const matches = bodyText.match(p.regex);
      console.log(`   ${p.name}: ${matches ? matches.length : 0} matches`);
      if (matches && matches.length > 0) {
        console.log(`     Sample: ${matches[0]}`);
      }
    });
    
    // Look for specific content from websearch
    console.log('\n🔍 SPECIFIC CONTENT SEARCH:');
    const searchTerms = [
      'Şekildeki trafik işareti',
      'Kamyon garajını', 
      'trafik',
      'motorbilgisi',
      'CEVAP AÇIKLAMASI'
    ];
    
    searchTerms.forEach(term => {
      const found = bodyText.includes(term);
      console.log(`   "${term}": ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
    });
    
    console.log('\n⏳ Page kept open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  const url = 'https://ehliyet-soru.com/test-1-haziran-2025-ehliyet-deneme-sinavi-968';
  await debugPageContent(url);
}

if (require.main === module) {
  main().catch(console.error);
} 