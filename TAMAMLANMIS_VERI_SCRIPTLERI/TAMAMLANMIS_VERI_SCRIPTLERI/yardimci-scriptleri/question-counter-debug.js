const puppeteer = require('puppeteer');

async function debugQuestionCounting() {
  console.log('🔍 DEBUG: Question Counting Analysis');
  
  const testUrl = 'https://ehliyetsinavihazirlik.com/index.php/e-sinavlar-haziran-sorulari-1.html';
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    console.log(`📄 Loading: ${testUrl}`);
    await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Detaylı analiz
    const analysis = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      
      const analysis = {
        pageTitle: document.title,
        totalTextLength: bodyText.length,
        patterns: {}
      };
      
      // Farklı soru kalıplarını test et
      const questionPatterns = {
        'numbered_questions': /\b\d+\.\s*[A-ZÜĞŞIÖÇ]/g,
        'soru_pattern': /Soru\s*\d+/gi,
        'question_mark_ending': /[A-ZÜĞŞIÖÇ][^.!?]*\?/g,
        'option_a_d': /[A-D]\)/g,
        'numbered_1_to_50': /\b([1-9]|[1-4][0-9]|50)\.\s/g,
        'specific_question_format': /\d+\.\s*[A-ZÜĞŞIÖÇ]/g
      };
      
      Object.entries(questionPatterns).forEach(([name, pattern]) => {
        const matches = bodyText.match(pattern);
        analysis.patterns[name] = {
          count: matches ? matches.length : 0,
          samples: matches ? matches.slice(0, 5) : []
        };
      });
      
      // Seçenek analizi
      const optionPatterns = {
        'a_b_c_d_parenthesis': /[A-D]\)/g,
        'a_b_c_d_dash': /[A-D]\s*-/g,
        'a_b_c_d_dot': /[A-D]\./g
      };
      
      Object.entries(optionPatterns).forEach(([name, pattern]) => {
        const matches = bodyText.match(pattern);
        analysis.patterns[name] = {
          count: matches ? matches.length : 0,
          samples: matches ? matches.slice(0, 10) : []
        };
      });
      
      // Görsel analizi
      const images = document.querySelectorAll('img[src]');
      analysis.images = {
        total: images.length,
        questionImages: Array.from(images).filter(img => 
          img.src.includes('soru') || img.src.includes('question')
        ).length
      };
      
      // En güvenilir hesaplama
      const optionCount = analysis.patterns['a_b_c_d_parenthesis'].count;
      analysis.estimatedQuestions = Math.floor(optionCount / 4);
      
      // Metin örneği
      analysis.textSample = bodyText.substring(0, 1000);
      
      return analysis;
    });
    
    console.log('\n📊 ANALYSIS RESULTS:');
    console.log(`   Page Title: ${analysis.pageTitle}`);
    console.log(`   Total Text Length: ${analysis.totalTextLength.toLocaleString()} chars`);
    
    console.log('\n🔍 QUESTION PATTERNS:');
    Object.entries(analysis.patterns).forEach(([name, data]) => {
      if (name.includes('question') || name.includes('soru') || name.includes('numbered')) {
        console.log(`   ${name}: ${data.count} matches`);
        if (data.samples.length > 0) {
          console.log(`      Samples: ${data.samples.join(', ')}`);
        }
      }
    });
    
    console.log('\n📝 OPTION PATTERNS:');
    Object.entries(analysis.patterns).forEach(([name, data]) => {
      if (name.includes('a_b_c_d')) {
        console.log(`   ${name}: ${data.count} matches`);
        if (data.samples.length > 0) {
          console.log(`      Samples: ${data.samples.slice(0, 8).join(', ')}`);
        }
      }
    });
    
    console.log('\n🖼️  IMAGE ANALYSIS:');
    console.log(`   Total Images: ${analysis.images.total}`);
    console.log(`   Question Images: ${analysis.images.questionImages}`);
    
    console.log('\n🎯 ESTIMATED QUESTION COUNT:');
    console.log(`   Based on A,B,C,D options: ${analysis.estimatedQuestions} questions`);
    console.log(`   (${analysis.patterns['a_b_c_d_parenthesis'].count} options ÷ 4)`);
    
    console.log('\n📄 TEXT SAMPLE (first 1000 chars):');
    console.log(`"${analysis.textSample}..."`);
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  debugQuestionCounting().catch(console.error);
}

module.exports = { debugQuestionCounting }; 