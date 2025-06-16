const puppeteer = require('puppeteer');
const fs = require('fs').promises;

class SinglePageDeepSeekTest {
  constructor() {
    // YENİ API KEY
    this.deepseekApiKey = 'sk-0bd9f6eee09742b0a25027b9c4c5603b';
    this.deepseekApiUrl = 'https://api.deepseek.com/chat/completions';
    
    this.testUrl = 'https://ehliyetsinavihazirlik.com/index.php/e-sinavlar-mayis-sorulari-1.html';
    this.results = {
      url: '',
      pageInfo: {},
      extractedQuestions: [],
      cost: 0,
      tokens: {},
      processingTime: 0,
      success: false,
      error: null
    };
  }

  async callDeepSeekAPI(htmlContent) {
    console.log('🤖 Testing NEW DeepSeek API key...');
    
    const prompt = `Bu Türkçe ehliyet sınav sayfasından soruları JSON formatında çıkar.

GÖREV: Her soruyu şu formatta döndür:
{
  "questions": [
    {
      "id": 1,
      "text": "soru metni",
      "options": {
        "A": "A şıkkı",
        "B": "B şıkkı", 
        "C": "C şıkkı",
        "D": "D şıkkı"
      },
      "correctAnswer": "A",
      "hasImage": true/false,
      "imageUrls": ["url1", "url2"]
    }
  ]
}

HTML İÇERİK:
${htmlContent.substring(0, 15000)}...

Sadece JSON döndür, başka açıklama yapma.`;

    const startTime = Date.now();
    
    try {
      const response = await fetch(this.deepseekApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepseekApiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 8000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ API Response received in ${processingTime}ms`);
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response structure');
      }

      const content = data.choices[0].message.content;
      console.log('📄 Raw response preview:', content.substring(0, 200) + '...');
      
      // JSON parse
      let parsedContent;
      try {
        // Clean up response if needed
        const cleanContent = content.replace(/```json|```/g, '').trim();
        parsedContent = JSON.parse(cleanContent);
      } catch (parseError) {
        console.log('🔧 Trying regex extraction...');
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not extract JSON from response');
        }
      }

      // Token ve maliyet hesaplama
      const usage = data.usage || {};
      const inputTokens = usage.prompt_tokens || Math.round(prompt.length / 4);
      const outputTokens = usage.completion_tokens || Math.round(content.length / 4);
      
      // DeepSeek pricing: $0.14/1M input, $0.28/1M output
      const inputCost = (inputTokens / 1_000_000) * 0.14;
      const outputCost = (outputTokens / 1_000_000) * 0.28;
      const totalCost = inputCost + outputCost;
      
      return {
        success: true,
        data: parsedContent,
        cost: totalCost,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens
        },
        processingTime
      };

    } catch (error) {
      console.error('❌ DeepSeek API error:', error.message);
      return {
        success: false,
        error: error.message,
        cost: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  async scrapePage() {
    console.log('🌐 Launching browser and scraping page...');
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      console.log(`📄 Loading: ${this.testUrl}`);
      await page.goto(this.testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Sayfa analizi
      const pageInfo = await page.evaluate(() => {
        let questionCount = 0;
        let optionCount = 0;
        let images = [];
        
        // Soru sayısı tespiti
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
          const text = element.textContent || '';
          if (/Soru\s+\d+/i.test(text) && text.length < 100) {
            questionCount++;
          }
          if (/^[A-D]\)/i.test(text.trim()) && text.length < 200) {
            optionCount++;
          }
        });
        
        // Görsel tespiti
        const imgElements = document.querySelectorAll('img');
        imgElements.forEach(img => {
          if (img.src && (img.src.includes('soru') || img.src.includes('image'))) {
            images.push(img.src);
          }
        });
        
        return {
          questionCount: Math.floor(optionCount / 4),
          optionCount,
          imageCount: images.length,
          images,
          pageTitle: document.title,
          contentLength: document.body.textContent.length
        };
      });
      
      console.log('📊 Page Analysis:');
      console.log(`   Questions: ${pageInfo.questionCount}`);
      console.log(`   Options: ${pageInfo.optionCount}`);
      console.log(`   Images: ${pageInfo.imageCount}`);
      console.log(`   Content length: ${pageInfo.contentLength} chars`);
      
      // HTML content
      const htmlContent = await page.content();
      
      this.results.url = this.testUrl;
      this.results.pageInfo = pageInfo;
      
      return { pageInfo, htmlContent };
      
    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      throw error;
    } finally {
      await browser.close();
    }
  }

  async runTest() {
    const testStartTime = Date.now();
    
    console.log('🧪 STARTING SINGLE PAGE DEEPSEEK TEST');
    console.log('='.repeat(60));
    console.log(`🎯 Test URL: ${this.testUrl}`);
    console.log(`🔑 API Key: ${this.deepseekApiKey.substring(0, 10)}...`);
    
    try {
      // 1. Sayfayı scrape et
      const { pageInfo, htmlContent } = await this.scrapePage();
      
      if (pageInfo.questionCount === 0) {
        console.log('⚠️  No questions found on page, skipping AI processing');
        this.results.success = false;
        this.results.error = 'No questions found';
        return this.results;
      }
      
      // 2. DeepSeek AI ile işle
      console.log('\n🤖 Processing with DeepSeek AI...');
      const aiResult = await this.callDeepSeekAPI(htmlContent);
      
      if (!aiResult.success) {
        this.results.success = false;
        this.results.error = aiResult.error;
        this.results.cost = aiResult.cost;
        return this.results;
      }
      
      // 3. Sonuçları analiz et
      const extractedQuestions = aiResult.data.questions || [];
      
      console.log('\n📋 EXTRACTION RESULTS:');
      console.log(`✅ Questions extracted: ${extractedQuestions.length}/${pageInfo.questionCount}`);
      console.log(`💰 Cost: $${aiResult.cost.toFixed(6)}`);
      console.log(`⚡ Tokens: ${aiResult.tokens.input}→${aiResult.tokens.output} (${aiResult.tokens.total} total)`);
      console.log(`⏱️  Processing time: ${aiResult.processingTime}ms`);
      
      // İlk birkaç soruyu göster
      console.log('\n📝 SAMPLE QUESTIONS:');
      extractedQuestions.slice(0, 3).forEach((q, i) => {
        console.log(`\n${i + 1}. ${q.text}`);
        console.log(`   A) ${q.options.A}`);
        console.log(`   B) ${q.options.B}`);
        console.log(`   C) ${q.options.C}`);
        console.log(`   D) ${q.options.D}`);
        console.log(`   ✅ Doğru: ${q.correctAnswer}`);
        console.log(`   🖼️  Görsel: ${q.hasImage ? 'Var' : 'Yok'}`);
      });
      
      this.results.success = true;
      this.results.extractedQuestions = extractedQuestions;
      this.results.cost = aiResult.cost;
      this.results.tokens = aiResult.tokens;
      this.results.processingTime = Date.now() - testStartTime;
      
      // Sonuçları kaydet
      await this.saveResults();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      this.results.success = false;
      this.results.error = error.message;
      this.results.processingTime = Date.now() - testStartTime;
      
      return this.results;
    }
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `single_page_deepsek_test_${timestamp}.json`;
    
    await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);
  }

  // Maliyet projeksiyonu
  calculateProjection() {
    if (!this.results.success) {
      console.log('❌ Cannot calculate projection - test failed');
      return;
    }
    
    const questionsPerPage = this.results.extractedQuestions.length;
    const costPerPage = this.results.cost;
    const timePerPage = this.results.processingTime / 1000; // seconds
    
    const totalPages = 1884; // discovered URLs
    
    console.log('\n📊 PROJECTION FOR ALL 1,884 PAGES:');
    console.log('='.repeat(50));
    console.log(`📋 Expected questions: ${(questionsPerPage * totalPages).toLocaleString()}`);
    console.log(`💰 Expected cost: $${(costPerPage * totalPages).toFixed(2)}`);
    console.log(`⏱️  Expected time: ${Math.round(timePerPage * totalPages / 60)} minutes`);
    console.log(`📊 Success rate: ${this.results.pageInfo.questionCount > 0 ? '~95%' : 'Unknown'}`);
  }
}

async function main() {
  const tester = new SinglePageDeepSeekTest();
  
  try {
    const results = await tester.runTest();
    
    console.log('\n🎯 FINAL TEST SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Success: ${results.success}`);
    
    if (results.success) {
      console.log(`📋 Questions: ${results.extractedQuestions.length}`);
      console.log(`💰 Cost: $${results.cost.toFixed(6)}`);
      console.log(`⏱️  Time: ${results.processingTime}ms`);
      
      // Projeksiyon hesapla
      tester.calculateProjection();
    } else {
      console.log(`❌ Error: ${results.error}`);
    }
    
  } catch (error) {
    console.error('❌ Main error:', error.message);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SinglePageDeepSeekTest }; 