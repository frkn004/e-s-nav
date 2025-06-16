const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class SpecificEhliyetScraper {
  constructor() {
    this.browser = null;
    this.baseDir = 'scraped_data';
    this.imageDir = path.join(this.baseDir, 'images');
    this.questionsData = [];
  }

  async init() {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(this.imageDir, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
  }

  async scrapeEhliyetSoru(url) {
    console.log(`📄 Scraping: ${url}`);
    const page = await this.browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const questions = await page.evaluate(() => {
        const results = [];
        const bodyText = document.body.innerText;
        
        // Pattern'leri bul
        const questionPattern = /#(\w+)\s*#(\d+)([\s\S]*?)(?=#\w+\s*#\d+|$)/g;
        let match;
        
        while ((match = questionPattern.exec(bodyText)) !== null) {
          const [, category, questionNumber, content] = match;
          
          // Soru metnini ve seçenekleri ayıkla
          const lines = content.trim().split('\n').filter(line => line.trim());
          
          if (lines.length < 6) continue; // En az soru + 4 seçenek olmalı
          
          // Soru metnini bul
          let questionText = '';
          let optionStart = -1;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // A, B, C, D seçeneklerinin başlangıcını bul
            if (line === 'A' && i + 1 < lines.length) {
              optionStart = i;
              break;
            }
            
            if (line && !line.match(/^\d+\s*\/\s*\d+/) && !line.includes('CEVAP AÇIKLAMASI')) {
              questionText += line + ' ';
            }
          }
          
          if (optionStart === -1 || !questionText.trim()) continue;
          
          // Seçenekleri ayıkla
          const options = [];
          const optionLabels = ['A', 'B', 'C', 'D'];
          
          for (let i = 0; i < 4; i++) {
            const labelIndex = optionStart + (i * 2);
            const textIndex = labelIndex + 1;
            
            if (labelIndex < lines.length && textIndex < lines.length) {
              const label = lines[labelIndex].trim();
              const text = lines[textIndex].trim();
              
              if (optionLabels.includes(label) && text) {
                options.push({
                  label: label,
                  text: text
                });
              }
            }
          }
          
          // Açıklamayı bul
          let explanation = '';
          const explanationIndex = content.indexOf('CEVAP AÇIKLAMASI:');
          if (explanationIndex !== -1) {
            explanation = content.substring(explanationIndex + 17).trim();
            explanation = explanation.split('\n')[0].trim();
          }
          
          if (options.length === 4) {
            results.push({
              questionNumber: questionNumber,
              category: category,
              questionText: questionText.trim(),
              options: options,
              explanation: explanation,
              sourceUrl: window.location.href,
              scrapedAt: new Date().toISOString()
            });
          }
        }
        
        return results;
      });

      console.log(`✅ Found ${questions.length} questions`);
      
      // Her soru için benzersiz ID ekle
      questions.forEach((question, index) => {
        question.id = `ehliyet_soru_${Date.now()}_${index}`;
        this.questionsData.push(question);
      });

    } catch (error) {
      console.error(`❌ Error scraping ${url}:`, error.message);
    } finally {
      await page.close();
    }
  }

  async scrapeMultiplePages() {
    const testUrls = [
      'https://ehliyet-soru.com/test-1-mayis-2025-ehliyet-deneme-sinavi-937',
      'https://ehliyet-soru.com/test-2-mayis-2025-ehliyet-deneme-sinavi-938',
      'https://ehliyet-soru.com/test-3-mayis-2025-ehliyet-deneme-sinavi-939',
      'https://ehliyet-soru.com/test-4-mayis-2025-ehliyet-deneme-sinavi-940',
      'https://ehliyet-soru.com/test-5-mayis-2025-ehliyet-deneme-sinavi-941'
    ];

    console.log(`🚀 Starting scraping of ${testUrls.length} pages...`);
    
    for (let i = 0; i < testUrls.length; i++) {
      const url = testUrls[i];
      console.log(`\n📄 Processing page ${i + 1}/${testUrls.length}`);
      
      await this.scrapeEhliyetSoru(url);
      
      // Rate limiting
      if (i < testUrls.length - 1) {
        console.log('⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async saveResults() {
    console.log('\n💾 Saving results...');
    
    // Ham veriyi kaydet
    await fs.writeFile(
      path.join(this.baseDir, 'scraped_questions.json'),
      JSON.stringify(this.questionsData, null, 2)
    );

    // Database formatında kaydet
    const dbFormat = this.questionsData.map(q => ({
      question_text: q.questionText,
      category: q.category,
      difficulty: 'orta', // Default
      options: JSON.stringify(q.options),
      correct_answer: 'A', // Default, AI ile belirlenecek
      explanation: q.explanation,
      source_url: q.sourceUrl,
      created_at: new Date().toISOString()
    }));

    await fs.writeFile(
      path.join(this.baseDir, 'questions_for_db.json'),
      JSON.stringify(dbFormat, null, 2)
    );

    // İstatistikleri kaydet
    const stats = {
      total_questions: this.questionsData.length,
      by_category: this.questionsData.reduce((acc, q) => {
        acc[q.category] = (acc[q.category] || 0) + 1;
        return acc;
      }, {}),
      sample_questions: this.questionsData.slice(0, 3).map(q => ({
        category: q.category,
        question: q.questionText.substring(0, 100) + '...',
        options_count: q.options.length
      })),
      scraped_at: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(this.baseDir, 'scraping_stats.json'),
      JSON.stringify(stats, null, 2)
    );

    console.log(`✅ Saved ${this.questionsData.length} questions`);
    console.log('📊 Category distribution:', stats.by_category);
    
    return stats;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const scraper = new SpecificEhliyetScraper();
  
  try {
    await scraper.init();
    await scraper.scrapeMultiplePages();
    const stats = await scraper.saveResults();
    
    console.log('\n🎉 Scraping completed successfully!');
    console.log('📁 Output files:');
    console.log('- scraped_data/scraped_questions.json');
    console.log('- scraped_data/questions_for_db.json');
    console.log('- scraped_data/scraping_stats.json');
    
  } catch (error) {
    console.error('❌ Main execution error:', error);
  } finally {
    await scraper.close();
  }
}

module.exports = { SpecificEhliyetScraper };

if (require.main === module) {
  main().catch(console.error);
} 