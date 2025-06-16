const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class AIPoweredScraper {
  constructor() {
    this.browser = null;
    this.baseDir = 'ai_scraper_test';
    this.imageDir = path.join(this.baseDir, 'images');
    this.questionsData = [];
    this.imageCount = 0;
    this.aiApiKey = process.env.DEEPSEEK_API_KEY || 'sk-your-api-key-here';
    this.aiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
  }

  async init() {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(this.imageDir, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: false, // Görmek için
      devtools: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-images=false'
      ]
    });
    
    console.log('🤖 AI-Powered Scraper initialized!');
    console.log(`📁 Output directory: ${this.baseDir}`);
    console.log(`🖼️  Images directory: ${this.imageDir}`);
  }

  async analyzeWithAI(htmlContent, url) {
    console.log('🧠 Analyzing content with AI...');
    
    const prompt = `Sen bir ehliyet sınavı soru çıkarma uzmanısın. Aşağıdaki HTML içeriğini analiz ederek ehliyet sınavı sorularını çıkar.

İHTİYAÇLARIM:
1. Tüm soruları bul (genelde 50 soru olur)
2. Her soru için: soru metni, A/B/C/D şıkları, soru numarası
3. Görselli şıklar varsa belirt
4. Doğru cevapları varsa çıkar
5. Kategorileri belirle (trafik, motor bilgisi, ilk yardım, vb.)

HTML İÇERİK:
${htmlContent.substring(0, 50000)} // İlk 50k karakter

ÇIKTI FORMAT (JSON):
{
  "total_questions": 50,
  "questions": [
    {
      "number": 1,
      "question": "Soru metni",
      "options": {
        "A": "Seçenek A metni",
        "B": "Seçenek B metni", 
        "C": "Seçenek C metni",
        "D": "Seçenek D metni"
      },
      "correct_answer": "A",
      "category": "trafik",
      "has_image": true,
      "explanation": "Cevap açıklaması"
    }
  ],
  "analysis": {
    "parsing_confidence": "high/medium/low",
    "issues_found": ["liste", "sorunlar"],
    "categories_detected": ["trafik", "motor"],
    "visual_questions": 5
  }
}

Sadece JSON yanıtı ver, başka açıklama yapma.`;

    try {
      const response = await axios.post(this.aiEndpoint, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      }, {
        headers: {
          'Authorization': `Bearer ${this.aiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const aiResult = response.data.choices[0].message.content;
      console.log('✅ AI analysis completed!');
      
      // JSON parse etmeye çalış
      try {
        const parsedResult = JSON.parse(aiResult);
        return parsedResult;
      } catch (parseError) {
        console.log('⚠️ AI response needs cleaning...');
        // JSON temizle
        const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Could not parse AI response');
      }
      
    } catch (error) {
      console.error('❌ AI analysis failed:', error.message);
      return null;
    }
  }

  async scrapeWithAI(urls) {
    console.log(`🚀 Starting AI-powered scraping for ${urls.length} URLs...`);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n📄 Processing URL ${i + 1}/${urls.length}: ${url}`);
      
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Sayfa içeriğini al
        const htmlContent = await page.content();
        console.log(`📊 Page size: ${(htmlContent.length / 1024).toFixed(1)}KB`);
        
        // AI ile analiz et
        const aiResult = await this.analyzeWithAI(htmlContent, url);
        
        if (aiResult && aiResult.questions) {
          console.log(`🎯 AI found ${aiResult.questions.length} questions`);
          console.log(`🔍 Confidence: ${aiResult.analysis?.parsing_confidence || 'unknown'}`);
          
          // Normal scraping ile görselleri çek
          console.log('📷 Extracting images...');
          const images = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('img')).map(img => ({
              src: img.src,
              alt: img.alt || '',
              width: img.width,
              height: img.height,
              className: img.className,
              parentText: img.parentElement ? img.parentElement.innerText.substring(0, 100) : ''
            })).filter(img => 
              img.src &&
              !img.src.includes('favicon') &&
              !img.src.includes('logo') &&
              img.width > 50 && img.height > 50
            );
          });
          
          console.log(`🖼️ Found ${images.length} potential question images`);
          
          // AI sonuçlarını işle ve görseller ile eşleştir
          for (let j = 0; j < aiResult.questions.length; j++) {
            const question = aiResult.questions[j];
            
            // Soruyla ilgili görselleri bul
            const questionImages = images.filter(img => 
              img.parentText.includes(question.number?.toString()) ||
              img.parentText.includes(`soru ${question.number}`) ||
              img.parentText.includes(`#${question.number}`)
            ).slice(0, 5); // Max 5 görsel per soru
            
            // Görselleri indir
            for (let k = 0; k < questionImages.length; k++) {
              const img = questionImages[k];
              const extension = img.src.split('.').pop().split('?')[0] || 'jpg';
              const imageName = `ai_q${question.number}_img${k + 1}.${extension}`;
              
              const localPath = await this.downloadImage(img.src, imageName);
              if (localPath) {
                img.localPath = localPath;
                img.fileName = imageName;
              }
            }
            
            // Soru objesini zenginleştir
            const enrichedQuestion = {
              ...question,
              id: `ai_${Date.now()}_${j}`,
              scrapedAt: new Date().toISOString(),
              sourceUrl: url,
              scrapingMethod: 'ai_powered',
              images: questionImages,
              aiConfidence: aiResult.analysis?.parsing_confidence || 'unknown'
            };
            
            this.questionsData.push(enrichedQuestion);
          }
          
          // URL başına özet
          console.log(`✅ URL completed: ${aiResult.questions.length} questions, ${images.length} images`);
          
        } else {
          console.log('❌ AI analysis failed for this URL');
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${url}:`, error.message);
      } finally {
        await page.close();
      }
    }
  }

  async downloadImage(imageUrl, imageName) {
    try {
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const imagePath = path.join(this.imageDir, imageName);
      const writer = require('fs').createWriteStream(imagePath);
      
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          this.imageCount++;
          console.log(`  ✅ Downloaded: ${imageName}`);
          resolve(imagePath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`  ❌ Image download failed: ${imageUrl} - ${error.message}`);
      return null;
    }
  }

  async parseHTMLFile(filePath) {
    console.log(`📄 Parsing HTML file: ${filePath}`);
    
    try {
      const htmlContent = await fs.readFile(filePath, 'utf-8');
      console.log(`📊 File size: ${(htmlContent.length / 1024).toFixed(1)}KB`);
      
      const aiResult = await this.analyzeWithAI(htmlContent, `file://${filePath}`);
      
      if (aiResult && aiResult.questions) {
        console.log(`🎯 AI found ${aiResult.questions.length} questions from HTML file`);
        
        aiResult.questions.forEach((question, index) => {
          const enrichedQuestion = {
            ...question,
            id: `file_ai_${Date.now()}_${index}`,
            scrapedAt: new Date().toISOString(),
            sourceUrl: `file://${filePath}`,
            scrapingMethod: 'ai_file_parsing',
            images: [],
            aiConfidence: aiResult.analysis?.parsing_confidence || 'unknown'
          };
          
          this.questionsData.push(enrichedQuestion);
        });
        
        return aiResult;
      }
      
    } catch (error) {
      console.error('❌ HTML file parsing failed:', error.message);
      return null;
    }
  }

  async saveResults() {
    console.log('\n💾 Saving AI scraping results...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Raw questions data
    await fs.writeFile(
      path.join(this.baseDir, `ai_extracted_questions_${timestamp}.json`),
      JSON.stringify(this.questionsData, null, 2)
    );

    // Summary report
    const summary = {
      ai_extraction_session: {
        completed_at: new Date().toISOString(),
        total_questions: this.questionsData.length,
        images_downloaded: this.imageCount,
        ai_powered: true,
        scraping_methods: [...new Set(this.questionsData.map(q => q.scrapingMethod))]
      },
      question_breakdown: {
        by_confidence: {
          high: this.questionsData.filter(q => q.aiConfidence === 'high').length,
          medium: this.questionsData.filter(q => q.aiConfidence === 'medium').length,
          low: this.questionsData.filter(q => q.aiConfidence === 'low').length,
          unknown: this.questionsData.filter(q => q.aiConfidence === 'unknown').length
        },
        by_category: this.getCategoryBreakdown(),
        with_images: this.questionsData.filter(q => q.images && q.images.length > 0).length,
        average_options: this.questionsData.length > 0 ? 
          (this.questionsData.reduce((sum, q) => sum + Object.keys(q.options || {}).length, 0) / this.questionsData.length).toFixed(1) : 0
      },
      sample_questions: this.questionsData.slice(0, 3).map(q => ({
        number: q.number,
        question: q.question?.substring(0, 100) + '...',
        category: q.category,
        confidence: q.aiConfidence,
        has_images: q.images && q.images.length > 0,
        method: q.scrapingMethod
      }))
    };

    await fs.writeFile(
      path.join(this.baseDir, `ai_extraction_summary_${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );

    console.log('✅ AI Results saved!');
    return summary;
  }

  getCategoryBreakdown() {
    const categories = {};
    this.questionsData.forEach(q => {
      const cat = q.category || 'unknown';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return categories;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printSummary(summary) {
    console.log('\n🤖 AI-POWERED EXTRACTION COMPLETED!');
    console.log('='.repeat(60));
    console.log(`🎯 Total Questions: ${summary.ai_extraction_session.total_questions}`);
    console.log(`🖼️  Images Downloaded: ${summary.ai_extraction_session.images_downloaded}`);
    console.log(`🧠 Methods Used: ${summary.ai_extraction_session.scraping_methods.join(', ')}`);
    
    console.log('\n📊 AI Confidence Breakdown:');
    Object.entries(summary.question_breakdown.by_confidence).forEach(([conf, count]) => {
      console.log(`   ${conf}: ${count} questions`);
    });
    
    console.log('\n📚 Category Breakdown:');
    Object.entries(summary.question_breakdown.by_category).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} questions`);
    });
    
    console.log(`\n📊 Questions with Images: ${summary.question_breakdown.with_images}`);
    console.log(`📊 Average Options per Question: ${summary.question_breakdown.average_options}`);
    
    if (summary.sample_questions.length > 0) {
      console.log('\n📋 Sample AI-Extracted Questions:');
      summary.sample_questions.forEach((q, index) => {
        console.log(`   ${index + 1}. Q${q.number}: ${q.question}`);
        console.log(`      Category: ${q.category}, Confidence: ${q.confidence}, Method: ${q.method}`);
      });
    }
    
    console.log('\n📁 Generated Files:');
    console.log(`   - ${this.baseDir}/ai_extracted_questions_${new Date().toISOString().split('T')[0]}.json`);
    console.log(`   - ${this.baseDir}/ai_extraction_summary_${new Date().toISOString().split('T')[0]}.json`);
    console.log(`   - ${this.baseDir}/images/ (${summary.ai_extraction_session.images_downloaded} files)`);
    console.log('='.repeat(60));
  }
}

async function main() {
  const scraper = new AIPoweredScraper();
  
  // Test URLs
  const testUrls = [
    'https://ehliyet-soru.com/test-1-haziran-2025-ehliyet-deneme-sinavi-968',
    // 'https://www.mebehliyetsinavsorulari.com/1-haziran-2025-ehliyet-sinav-sorulari'
  ];
  
  try {
    await scraper.init();
    
    console.log('🤖 STEP 1: AI-powered URL scraping...');
    await scraper.scrapeWithAI(testUrls);
    
    // HTML file parsing example
    // console.log('\n📄 STEP 2: HTML file parsing...');
    // await scraper.parseHTMLFile('sample.html'); // Kullanıcı dosya verirse
    
    console.log('\n💾 STEP 3: Saving results...');
    const summary = await scraper.saveResults();
    
    scraper.printSummary(summary);
    
  } catch (error) {
    console.error('❌ AI Extraction error:', error);
  } finally {
    await scraper.close();
  }
}

// HTML/PDF file parsing function
async function parseProvidedFile(filePath) {
  const scraper = new AIPoweredScraper();
  
  try {
    await scraper.init();
    
    console.log('📄 Parsing provided file with AI...');
    const result = await scraper.parseHTMLFile(filePath);
    
    if (result) {
      const summary = await scraper.saveResults();
      scraper.printSummary(summary);
    }
    
  } catch (error) {
    console.error('❌ File parsing error:', error);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AIPoweredScraper, parseProvidedFile }; 