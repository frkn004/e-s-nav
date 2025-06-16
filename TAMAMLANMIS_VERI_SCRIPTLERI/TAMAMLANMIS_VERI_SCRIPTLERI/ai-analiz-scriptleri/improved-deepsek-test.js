const puppeteer = require('puppeteer');
const fs = require('fs').promises;

class ImprovedDeepSeekTest {
  constructor() {
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
    console.log('🤖 Enhanced DeepSeek processing...');
    
    const prompt = `TÜRKÇE EHLİYET SINAV SAYFASI ANALİZİ

Bu HTML sayfasında 50 adet ehliyet sınav sorusu var. Her sorunun 4 şıkkı (A, B, C, D) bulunuyor.

GÖREV: TÜM 50 SORUYU çıkar ve JSON formatında döndür.

Aranacak Pattern'ler:
- Sorular: "Soru 1", "Soru 2" ... "Soru 50" şeklinde
- Şıklar: "A)", "B)", "C)", "D)" şeklinde
- Görseller: <img> tagları içinde

ZORUNLU FORMAT:
{
  "questions": [
    {
      "id": 1,
      "text": "tam soru metni",
      "options": {
        "A": "A şıkkı tam metni",
        "B": "B şıkkı tam metni", 
        "C": "C şıkkı tam metni",
        "D": "D şıkkı tam metni"
      },
      "correctAnswer": "A",
      "hasImage": true,
      "imageUrls": ["görsel url"]
    }
  ]
}

ÖNEMLİ KURALLAR:
1. TÜM 50 SORUYU çıkar, eksik bırakma
2. Her soruyu sırasıyla işle (1'den 50'ye)
3. Şıkları soru ile eşleştir
4. Doğru cevabı mantıksal çıkarımla bul
5. Görsel varsa URL'ini ekle

HTML İÇERİK:
${htmlContent}

Sadece JSON yanıtı döndür, başka açıklama yapma.`;

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
          max_tokens: 8000, // Max allowed by DeepSeek
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
      console.log('📄 Response length:', content.length, 'chars');
      
      // JSON parse
      let parsedContent;
      try {
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
    console.log('🌐 Scraping enhanced page data...');
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      console.log(`📄 Loading: ${this.testUrl}`);
      await page.goto(this.testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Enhanced sayfa analizi
      const pageInfo = await page.evaluate(() => {
        let questionCount = 0;
        let optionCount = 0;
        let images = [];
        
        // Daha kapsamlı soru tespiti
        const allText = document.body.innerText;
        const questionMatches = allText.match(/Soru\s+\d+/gi) || [];
        questionCount = questionMatches.length;
        
        // Şık sayısı
        const optionMatches = allText.match(/^[A-D]\)/gm) || [];
        optionCount = optionMatches.length;
        
        // Görseller
        const imgElements = document.querySelectorAll('img');
        imgElements.forEach(img => {
          if (img.src && img.src.includes('http')) {
            images.push(img.src);
          }
        });
        
        return {
          questionCount,
          optionCount,
          calculatedQuestions: Math.floor(optionCount / 4),
          imageCount: images.length,
          images,
          pageTitle: document.title,
          contentLength: document.body.textContent.length
        };
      });
      
      console.log('📊 Enhanced Page Analysis:');
      console.log(`   Questions found: ${pageInfo.questionCount}`);
      console.log(`   Options found: ${pageInfo.optionCount}`);
      console.log(`   Calculated questions: ${pageInfo.calculatedQuestions}`);
      console.log(`   Images: ${pageInfo.imageCount}`);
      
      // Full HTML content
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
    
    console.log('🧪 STARTING IMPROVED DEEPSEEK TEST');
    console.log('='.repeat(60));
    console.log(`🎯 Test URL: ${this.testUrl}`);
    console.log(`🔑 API Key: ${this.deepseekApiKey.substring(0, 10)}...`);
    
    try {
      // 1. Enhanced scraping
      const { pageInfo, htmlContent } = await this.scrapePage();
      
      if (pageInfo.calculatedQuestions === 0) {
        console.log('⚠️  No questions found on page');
        this.results.success = false;
        this.results.error = 'No questions found';
        return this.results;
      }
      
      // 2. Enhanced AI processing
      console.log('\n🤖 Processing with Enhanced DeepSeek...');
      console.log(`📄 Sending ${htmlContent.length} chars to AI`);
      console.log(`🎯 Expected: ${pageInfo.calculatedQuestions} questions`);
      
      const aiResult = await this.callDeepSeekAPI(htmlContent);
      
      if (!aiResult.success) {
        this.results.success = false;
        this.results.error = aiResult.error;
        this.results.cost = aiResult.cost;
        return this.results;
      }
      
      // 3. Enhanced results analysis
      const extractedQuestions = aiResult.data.questions || [];
      
      console.log('\n📋 ENHANCED EXTRACTION RESULTS:');
      console.log(`✅ Questions extracted: ${extractedQuestions.length}/${pageInfo.calculatedQuestions}`);
      console.log(`💰 Cost: $${aiResult.cost.toFixed(6)}`);
      console.log(`⚡ Tokens: ${aiResult.tokens.input}→${aiResult.tokens.output} (${aiResult.tokens.total} total)`);
      console.log(`⏱️  Processing time: ${aiResult.processingTime}ms`);
      console.log(`📊 Success rate: ${Math.round((extractedQuestions.length / pageInfo.calculatedQuestions) * 100)}%`);
      
      // İlk 5 soruyu göster
      console.log('\n📝 SAMPLE QUESTIONS:');
      extractedQuestions.slice(0, 5).forEach((q, i) => {
        console.log(`\n${i + 1}. ${q.text?.substring(0, 80)}...`);
        console.log(`   A) ${q.options?.A?.substring(0, 50)}...`);
        console.log(`   B) ${q.options?.B?.substring(0, 50)}...`);
        console.log(`   C) ${q.options?.C?.substring(0, 50)}...`);
        console.log(`   D) ${q.options?.D?.substring(0, 50)}...`);
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
    const filename = `improved_deepsek_test_${timestamp}.json`;
    
    await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);
  }

  calculateProjection() {
    if (!this.results.success) {
      console.log('❌ Cannot calculate projection');
      return;
    }
    
    const extractedCount = this.results.extractedQuestions.length;
    const expectedCount = this.results.pageInfo.calculatedQuestions;
    const successRate = extractedCount / expectedCount;
    const costPerPage = this.results.cost;
    
    const totalPages = 1884;
    
    console.log('\n📊 ENHANCED PROJECTION FOR ALL 1,884 PAGES:');
    console.log('='.repeat(60));
    console.log(`📋 Expected questions: ${Math.round(expectedCount * totalPages * successRate).toLocaleString()}`);
    console.log(`💰 Expected cost: $${(costPerPage * totalPages).toFixed(2)}`);
    console.log(`📊 Success rate: ${Math.round(successRate * 100)}%`);
    console.log(`⏱️  Expected time: ${Math.round((this.results.processingTime / 1000) * totalPages / 60)} minutes`);
    
    // Comparison
    console.log('\n🆚 COMPARISON WITH ALTERNATIVES:');
    console.log(`💰 DeepSeek: $${(costPerPage * totalPages).toFixed(2)}`);
    console.log(`💰 OpenAI GPT-4: $${(costPerPage * totalPages * 40).toFixed(2)}`);
    console.log(`💰 Claude: $${(costPerPage * totalPages * 15).toFixed(2)}`);
    console.log(`🎯 Savings: ${Math.round((1 - 1/40) * 100)}% vs OpenAI`);
  }
}

async function main() {
  const tester = new ImprovedDeepSeekTest();
  
  try {
    const results = await tester.runTest();
    
    console.log('\n🎯 ENHANCED FINAL SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Success: ${results.success}`);
    
    if (results.success) {
      console.log(`📋 Questions: ${results.extractedQuestions.length}`);
      console.log(`💰 Cost: $${results.cost.toFixed(6)}`);
      console.log(`⏱️  Time: ${results.processingTime}ms`);
      
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

module.exports = { ImprovedDeepSeekTest }; 