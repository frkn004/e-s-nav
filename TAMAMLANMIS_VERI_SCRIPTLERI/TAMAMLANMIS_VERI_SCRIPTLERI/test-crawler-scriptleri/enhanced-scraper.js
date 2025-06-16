const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class EhliyetScraper {
  constructor() {
    this.browser = null;
    this.baseDir = 'scraped_data';
    this.imageDir = path.join(this.baseDir, 'images');
    this.questionsData = [];
    
    // Target websites
    this.sites = [
      {
        name: 'ehliyet-soru',
        baseUrl: 'https://ehliyet-soru.com',
        listPattern: '/test-*-ehliyet-deneme-sinavi-*',
        questionSelector: '.question-container, .soru-container',
        imageSelector: 'img',
        optionSelector: '.option, .secenek'
      },
      {
        name: 'ehliyetsinavihazirlik',
        baseUrl: 'https://ehliyetsinavihazirlik.com',
        listPattern: '/index.php/e-sinavlar-*',
        questionSelector: '.question, .soru',
        imageSelector: 'img',
        optionSelector: '.answer, .cevap'
      }
    ];
  }

  async init() {
    // Create directories
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(this.imageDir, { recursive: true });
    
    // Launch browser
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }

  async downloadImage(imageUrl, questionId, imageIndex = 0) {
    try {
      // Convert relative URLs to absolute
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        imageUrl = this.currentSite.baseUrl + imageUrl;
      }

      const response = await axios({
        url: imageUrl,
        method: 'GET',
        responseType: 'stream',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const extension = path.extname(imageUrl) || '.jpg';
      const filename = `q_${questionId}_img_${imageIndex}${extension}`;
      const filepath = path.join(this.imageDir, filename);

      const writer = await fs.open(filepath, 'w');
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        response.data.on('end', resolve);
        response.data.on('error', reject);
      });

      return {
        originalUrl: imageUrl,
        localPath: filepath,
        filename: filename
      };
    } catch (error) {
      console.error(`Image download failed: ${imageUrl}`, error.message);
      return null;
    }
  }

  async scrapeTestPage(url, siteConfig) {
    this.currentSite = siteConfig;
    const page = await this.browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for questions to load
      await page.waitForSelector(siteConfig.questionSelector, { timeout: 10000 });

      const questions = await page.evaluate((config) => {
        const questionElements = document.querySelectorAll(config.questionSelector);
        const results = [];

        questionElements.forEach((qElement, index) => {
          try {
            // Get question text
            const questionText = qElement.querySelector('.question-text, .soru-metni, h3, h4, .soru')?.innerText?.trim() || '';
            
            // Get question number
            const questionNumber = qElement.querySelector('.question-number, .soru-no')?.innerText?.trim() || 
                                 questionText.match(/^(\d+)\.?\s*/)?.[1] || 
                                 (index + 1).toString();

            // Get category/tag
            const category = qElement.querySelector('.category, .kategori, .tag')?.innerText?.trim() || 
                           qElement.closest('[class*="trafik"], [class*="motor"], [class*="ilkyardim"]')?.className?.match(/(trafik|motor|ilkyardim)/i)?.[1] || 
                           'genel';

            // Get options
            const options = [];
            const optionElements = qElement.querySelectorAll(config.optionSelector + ', .secenek, .option, td[width="5%"] + td');
            
            optionElements.forEach((opt, optIndex) => {
              const label = opt.querySelector('.option-label, .label')?.innerText?.trim() || 
                          String.fromCharCode(65 + optIndex); // A, B, C, D
              const text = opt.innerText?.replace(/^[A-D]\s*/, '').trim() || '';
              
              if (text) {
                options.push({
                  label: label,
                  text: text
                });
              }
            });

            // Get images
            const images = [];
            const imgElements = qElement.querySelectorAll(config.imageSelector);
            imgElements.forEach((img, imgIndex) => {
              const src = img.src || img.getAttribute('data-src');
              if (src && !src.includes('icon') && !src.includes('logo')) {
                images.push({
                  src: src,
                  alt: img.alt || '',
                  index: imgIndex
                });
              }
            });

            // Get correct answer if available
            const correctAnswer = qElement.querySelector('.correct-answer, .dogru-cevap, .answer-key')?.innerText?.trim() || '';
            
            // Get explanation if available
            const explanation = qElement.querySelector('.explanation, .aciklama, .cevap-aciklamasi')?.innerText?.trim() || '';

            if (questionText && options.length > 0) {
              results.push({
                questionNumber: questionNumber,
                questionText: questionText,
                category: category,
                options: options,
                images: images,
                correctAnswer: correctAnswer,
                explanation: explanation,
                sourceUrl: window.location.href,
                scrapedAt: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Error processing question:', error);
          }
        });

        return results;
      }, siteConfig);

      // Download images for each question
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const questionId = `${siteConfig.name}_${question.questionNumber}`;
        
        if (question.images && question.images.length > 0) {
          question.downloadedImages = [];
          
          for (let j = 0; j < question.images.length; j++) {
            const image = question.images[j];
            const downloadedImage = await this.downloadImage(image.src, questionId, j);
            
            if (downloadedImage) {
              question.downloadedImages.push(downloadedImage);
            }
          }
        }
        
        // Add unique ID
        question.id = `${siteConfig.name}_${Date.now()}_${i}`;
        this.questionsData.push(question);
        
        console.log(`✅ Scraped question ${question.questionNumber} from ${siteConfig.name}`);
      }

    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
    } finally {
      await page.close();
    }
  }

  async getTestUrls(siteConfig) {
    const page = await this.browser.newPage();
    const urls = [];
    
    try {
      await page.goto(siteConfig.baseUrl, { waitUntil: 'networkidle2' });
      
      const links = await page.evaluate((pattern) => {
        const linkElements = document.querySelectorAll('a[href*="test"], a[href*="sinav"], a[href*="soru"]');
        const foundUrls = [];
        
        linkElements.forEach(link => {
          const href = link.href;
          if (href && (href.includes('test') || href.includes('sinav') || href.includes('soru'))) {
            foundUrls.push(href);
          }
        });
        
        return [...new Set(foundUrls)]; // Remove duplicates
      }, siteConfig.listPattern);
      
      urls.push(...links);
      
    } catch (error) {
      console.error(`Error getting test URLs from ${siteConfig.baseUrl}:`, error.message);
    } finally {
      await page.close();
    }
    
    return urls.slice(0, 50); // Limit to prevent overwhelming
  }

  async scrapeAll() {
    console.log('🚀 Starting enhanced scraping process...');
    
    for (const siteConfig of this.sites) {
      console.log(`\n📡 Scraping from: ${siteConfig.name}`);
      
      try {
        // Get test URLs
        const testUrls = await this.getTestUrls(siteConfig);
        console.log(`Found ${testUrls.length} test pages`);
        
        // Scrape each test page
        for (let i = 0; i < Math.min(testUrls.length, 10); i++) { // Limit for demo
          const url = testUrls[i];
          console.log(`\n📄 Scraping page ${i + 1}/${Math.min(testUrls.length, 10)}: ${url}`);
          await this.scrapeTestPage(url, siteConfig);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`Error scraping site ${siteConfig.name}:`, error.message);
      }
    }
  }

  async analyzeWithAI(questions) {
    console.log('\n🤖 Analyzing questions with AI...');
    
    // This would integrate with your DeepSeek API
    const analyzed = [];
    
    for (const question of questions.slice(0, 5)) { // Demo with first 5
      try {
        // Simulated AI analysis - replace with actual DeepSeek API call
        const analysis = {
          ...question,
          difficulty: Math.random() > 0.5 ? 'medium' : 'easy',
          topics: this.extractTopics(question.questionText),
          quality_score: Math.round((Math.random() * 3 + 7) * 10) / 10, // 7.0-10.0
          enhanced_explanation: question.explanation || 'AI enhanced explanation would go here',
          similar_questions: [],
          study_tips: this.generateStudyTips(question.category)
        };
        
        analyzed.push(analysis);
        
      } catch (error) {
        console.error('AI analysis error:', error.message);
      }
    }
    
    return analyzed;
  }

  extractTopics(questionText) {
    const topics = [];
    const keywords = {
      'trafik': ['kavşak', 'ışık', 'levha', 'yol', 'hız', 'geçiş'],
      'motor': ['motor', 'yakıt', 'fren', 'lastik', 'yağ', 'vites'],
      'ilkyardim': ['kanama', 'kırık', 'bayılma', 'nefes', 'kalp', 'yaralı']
    };
    
    Object.entries(keywords).forEach(([topic, words]) => {
      if (words.some(word => questionText.toLowerCase().includes(word))) {
        topics.push(topic);
      }
    });
    
    return topics.length > 0 ? topics : ['genel'];
  }

  generateStudyTips(category) {
    const tips = {
      'trafik': ['Trafik işaretlerini ezberleyin', 'Kavşak kurallarını pratikte uygulayın'],
      'motor': ['Motor parçalarının görevlerini öğrenin', 'Bakım periyotlarını hatırlayın'],
      'ilkyardim': ['Temel yaşam desteğini pratikte deneyin', 'Kanama durma tekniklerini öğrenin'],
      'genel': ['Düzenli tekrar yapın', 'Konuları kategorize edin']
    };
    
    return tips[category] || tips['genel'];
  }

  async saveResults() {
    console.log('\n💾 Saving results...');
    
    // Save raw data
    await fs.writeFile(
      path.join(this.baseDir, 'raw_questions.json'),
      JSON.stringify(this.questionsData, null, 2)
    );

    // Save for database import
    const dbFormat = this.questionsData.map(q => ({
      question_text: q.questionText,
      category: q.category,
      difficulty: 'medium', // Default
      options: JSON.stringify(q.options),
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      image_paths: q.downloadedImages ? JSON.stringify(q.downloadedImages.map(img => img.localPath)) : null,
      source_url: q.sourceUrl,
      created_at: new Date().toISOString()
    }));

    await fs.writeFile(
      path.join(this.baseDir, 'questions_for_db.json'),
      JSON.stringify(dbFormat, null, 2)
    );

    // Save statistics
    const stats = {
      total_questions: this.questionsData.length,
      by_category: this.questionsData.reduce((acc, q) => {
        acc[q.category] = (acc[q.category] || 0) + 1;
        return acc;
      }, {}),
      with_images: this.questionsData.filter(q => q.downloadedImages?.length > 0).length,
      scraped_at: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(this.baseDir, 'stats.json'),
      JSON.stringify(stats, null, 2)
    );

    console.log(`✅ Saved ${this.questionsData.length} questions`);
    console.log(`📊 Statistics:`, stats);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const scraper = new EhliyetScraper();
  
  try {
    await scraper.init();
    await scraper.scrapeAll();
    
    // AI Analysis (demo)
    const analyzed = await scraper.analyzeWithAI(scraper.questionsData);
    console.log(`🧠 AI analyzed ${analyzed.length} questions`);
    
    await scraper.saveResults();
    
  } catch (error) {
    console.error('Main execution error:', error);
  } finally {
    await scraper.close();
  }
}

// Export for use in other modules
module.exports = { EhliyetScraper };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
} 