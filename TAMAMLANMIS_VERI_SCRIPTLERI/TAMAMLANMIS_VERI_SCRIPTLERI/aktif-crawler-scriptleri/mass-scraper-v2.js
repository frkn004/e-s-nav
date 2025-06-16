const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

class MassEhliyetScraper {
  constructor() {
    this.browser = null;
    this.baseDir = 'mass_scraped_data';
    this.imageDir = path.join(this.baseDir, 'images');
    this.questionsData = [];
    this.duplicates = [];
    this.imageCount = 0;
    this.stats = {
      totalProcessed: 0,
      questionsFound: 0,
      duplicatesFound: 0,
      imagesDownloaded: 0,
      categoryCounts: {},
      errorUrls: []
    };
  }

  async init() {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(this.imageDir, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-images=false' // Görselleri yükle
      ]
    });
    
    console.log('🚀 Mass Scraper V2 initialized!');
    console.log(`📁 Output directory: ${this.baseDir}`);
    console.log(`🖼️  Images directory: ${this.imageDir}`);
  }

  // Metin benzerliği hesapla (Levenshtein distance)
  calculateSimilarity(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : 1 - matrix[len2][len1] / maxLen;
  }

  // Hash oluştur (duplicate detection için)
  createQuestionHash(questionText, options) {
    const normalized = questionText.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
    
    const optionsText = options.map(opt => opt.text.toLowerCase().trim()).join('|');
    const combined = normalized + '|||' + optionsText;
    
    return crypto.createHash('md5').update(combined).digest('hex');
  }

  // Görsel indirme
  async downloadImage(imageUrl, imageName) {
    try {
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const imagePath = path.join(this.imageDir, imageName);
      const writer = require('fs').createWriteStream(imagePath);
      
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          this.stats.imagesDownloaded++;
          resolve(imagePath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`❌ Image download failed: ${imageUrl} - ${error.message}`);
      return null;
    }
  }

  async scrapePageWithImages(url) {
    console.log(`📄 Scraping: ${url}`);
    const page = await this.browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Sayfa analizi ve veri çekme
      const pageData = await page.evaluate(() => {
        const results = [];
        const bodyText = document.body.innerText;
        
        // Görselleri bul
        const images = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height
        })).filter(img => 
          img.src && 
          !img.src.includes('data:') && 
          !img.src.includes('favicon') &&
          !img.src.includes('logo') &&
          (img.width > 50 || img.height > 50) // Sadece büyük görseller
        );
        
        // Soru pattern'lerini bul
        const questionPattern = /#(\w+)\s*#(\d+)([\s\S]*?)(?=#\w+\s*#\d+|$)/g;
        let match;
        
        while ((match = questionPattern.exec(bodyText)) !== null) {
          const [, category, questionNumber, content] = match;
          
          const lines = content.trim().split('\n').filter(line => line.trim());
          if (lines.length < 6) continue;
          
          let questionText = '';
          let optionStart = -1;
          
          // Soru metnini bul
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line === 'A' && i + 1 < lines.length) {
              optionStart = i;
              break;
            }
            
            if (line && !line.match(/^\d+\s*\/\s*\d+/) && !line.includes('CEVAP AÇIKLAMASI')) {
              questionText += line + ' ';
            }
          }
          
          if (optionStart === -1 || !questionText.trim()) continue;
          
          // Seçenekleri çek
          const options = [];
          const optionLabels = ['A', 'B', 'C', 'D'];
          
          for (let i = 0; i < 4; i++) {
            const labelIndex = optionStart + (i * 2);
            const textIndex = labelIndex + 1;
            
            if (labelIndex < lines.length && textIndex < lines.length) {
              const label = lines[labelIndex].trim();
              const text = lines[textIndex].trim();
              
              if (optionLabels.includes(label) && text) {
                options.push({ label, text });
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
              questionNumber,
              category,
              questionText: questionText.trim(),
              options,
              explanation,
              sourceUrl: window.location.href,
              scrapedAt: new Date().toISOString()
            });
          }
        }
        
        return { questions: results, images };
      });

      console.log(`✅ Found ${pageData.questions.length} questions, ${pageData.images.length} images`);
      
      // Görselleri indir
      for (let i = 0; i < pageData.images.length; i++) {
        const img = pageData.images[i];
        const extension = img.src.split('.').pop().split('?')[0] || 'jpg';
        const imageName = `img_${Date.now()}_${this.imageCount++}.${extension}`;
        
        const localPath = await this.downloadImage(img.src, imageName);
        if (localPath) {
          pageData.images[i].localPath = localPath;
          pageData.images[i].fileName = imageName;
        }
        
        // Rate limiting for images
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Duplicate detection ve kategorizasyon
      pageData.questions.forEach((question, index) => {
        const questionHash = this.createQuestionHash(question.questionText, question.options);
        
        // Duplicate check
        const existingQuestion = this.questionsData.find(q => q.hash === questionHash);
        if (existingQuestion) {
          this.duplicates.push({
            originalUrl: existingQuestion.sourceUrl,
            duplicateUrl: question.sourceUrl,
            questionText: question.questionText.substring(0, 100) + '...',
            hash: questionHash
          });
          this.stats.duplicatesFound++;
          return;
        }
        
        // Benzerlik kontrolü (85% üzeri benzerlik = duplicate)
        const similarQuestion = this.questionsData.find(q => {
          const similarity = this.calculateSimilarity(q.questionText, question.questionText);
          return similarity > 0.85;
        });
        
        if (similarQuestion) {
          this.duplicates.push({
            originalUrl: similarQuestion.sourceUrl,
            duplicateUrl: question.sourceUrl,
            questionText: question.questionText.substring(0, 100) + '...',
            similarity: this.calculateSimilarity(similarQuestion.questionText, question.questionText),
            type: 'similar'
          });
          this.stats.duplicatesFound++;
          return;
        }
        
        // Kategorize et
        const categorizedCategory = this.categorizeQuestion(question.questionText, question.category);
        
        // Yeni soru ekle
        const finalQuestion = {
          ...question,
          id: `ehliyet_mass_${Date.now()}_${this.questionsData.length}`,
          hash: questionHash,
          categorizedCategory,
          images: pageData.images.filter(img => img.localPath), // Bu sayfadaki görseller
          processedAt: new Date().toISOString()
        };
        
        this.questionsData.push(finalQuestion);
        this.stats.questionsFound++;
        
        // Category counting
        this.stats.categoryCounts[categorizedCategory] = (this.stats.categoryCounts[categorizedCategory] || 0) + 1;
      });

      this.stats.totalProcessed++;

    } catch (error) {
      console.error(`❌ Error scraping ${url}:`, error.message);
      this.stats.errorUrls.push({ url, error: error.message });
    } finally {
      await page.close();
    }
  }

  // Gelişmiş kategorize etme
  categorizeQuestion(questionText, originalCategory) {
    const text = questionText.toLowerCase();
    
    // Trafik alt kategorileri
    if (text.includes('kavşak') || text.includes('geçiş hakkı')) return 'trafik_kavşak';
    if (text.includes('işaret') || text.includes('levha')) return 'trafik_işaretler';
    if (text.includes('hız') || text.includes('otoyol')) return 'trafik_hız_kurallari';
    if (text.includes('park') || text.includes('durma')) return 'trafik_park_durma';
    if (text.includes('emniyet kemeri') || text.includes('kask')) return 'trafik_güvenlik';
    if (text.includes('yaya') || text.includes('okul')) return 'trafik_özel_durumlar';
    if (text.includes('alkoloğol') || text.includes('ceza') || text.includes('ehliyet')) return 'trafik_ceza_mevzuat';
    
    // Motor alt kategorileri  
    if (text.includes('motor') || text.includes('çalıştır')) return 'motor_çalıştırma';
    if (text.includes('fren') || text.includes('balata')) return 'motor_fren_sistemi';
    if (text.includes('lastik') || text.includes('jant')) return 'motor_lastik_jant';
    if (text.includes('yakıt') || text.includes('benzin')) return 'motor_yakıt_sistemi';
    if (text.includes('ışık') || text.includes('lamba')) return 'motor_aydınlatma';
    if (text.includes('yağ') || text.includes('filtre')) return 'motor_bakım';
    
    // İlk yardım
    if (text.includes('ilk yardım') || text.includes('yaralı') || text.includes('kırık')) return 'ilkyardim';
    
    return originalCategory; // Default olarak orijinal kategori
  }

  // Toplu URL işleme
  async processBulkUrls(urls) {
    console.log(`🚀 Processing ${urls.length} URLs in batches...`);
    
    const batchSize = 5; // Aynı anda 5 sayfa
    const batches = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
      batches.push(urls.slice(i, i + batchSize));
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} URLs)`);
      
      // Batch içindeki URL'leri paralel işle
      const promises = batch.map(url => this.scrapePageWithImages(url));
      await Promise.allSettled(promises);
      
      // Batch arası bekleme
      if (batchIndex < batches.length - 1) {
        console.log('⏳ Waiting 3 seconds between batches...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // Progress update
      console.log(`📊 Progress: ${this.stats.questionsFound} questions, ${this.stats.duplicatesFound} duplicates, ${this.stats.imagesDownloaded} images`);
    }
  }

  async saveResults() {
    console.log('\n💾 Saving comprehensive results...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Ana soru veritabanı
    await fs.writeFile(
      path.join(this.baseDir, `questions_${timestamp}.json`),
      JSON.stringify(this.questionsData, null, 2)
    );

    // Duplicate raporu
    await fs.writeFile(
      path.join(this.baseDir, `duplicates_${timestamp}.json`),
      JSON.stringify(this.duplicates, null, 2)
    );

    // Kategori analizi
    const categoryAnalysis = {
      total_categories: Object.keys(this.stats.categoryCounts).length,
      distribution: this.stats.categoryCounts,
      largest_category: Object.entries(this.stats.categoryCounts)
        .sort(([,a], [,b]) => b - a)[0],
      smallest_category: Object.entries(this.stats.categoryCounts)
        .sort(([,a], [,b]) => a - b)[0]
    };

    // Comprehensive özet rapor
    const finalReport = {
      scraping_session: {
        started_at: new Date().toISOString(),
        total_urls_processed: this.stats.totalProcessed,
        success_rate: `${((this.stats.totalProcessed - this.stats.errorUrls.length) / this.stats.totalProcessed * 100).toFixed(1)}%`
      },
      question_statistics: {
        total_questions_found: this.stats.questionsFound,
        unique_questions: this.questionsData.length,
        duplicates_removed: this.stats.duplicatesFound,
        duplicate_rate: `${(this.stats.duplicatesFound / (this.stats.questionsFound + this.stats.duplicatesFound) * 100).toFixed(1)}%`
      },
      category_analysis: categoryAnalysis,
      image_statistics: {
        total_images_downloaded: this.stats.imagesDownloaded,
        images_per_question: (this.stats.imagesDownloaded / this.questionsData.length).toFixed(2),
        storage_location: this.imageDir
      },
      quality_metrics: {
        questions_with_explanations: this.questionsData.filter(q => q.explanation && q.explanation.length > 10).length,
        questions_with_images: this.questionsData.filter(q => q.images && q.images.length > 0).length,
        average_options_per_question: (this.questionsData.reduce((sum, q) => sum + q.options.length, 0) / this.questionsData.length).toFixed(1)
      },
      errors: this.stats.errorUrls,
      files_generated: [
        `questions_${timestamp}.json`,
        `duplicates_${timestamp}.json`,
        `final_report_${timestamp}.json`,
        `database_ready_${timestamp}.json`
      ]
    };

    await fs.writeFile(
      path.join(this.baseDir, `final_report_${timestamp}.json`),
      JSON.stringify(finalReport, null, 2)
    );

    // Database'e hazır format
    const dbFormat = this.questionsData.map(q => ({
      question_text: q.questionText,
      category: q.categorizedCategory,
      sub_category: q.category,
      difficulty: 'orta', // AI ile belirlenecek
      options: JSON.stringify(q.options),
      correct_answer: 'A', // AI ile belirlenecek
      explanation: q.explanation,
      source_url: q.sourceUrl,
      question_hash: q.hash,
      has_image: q.images && q.images.length > 0,
      image_paths: q.images ? JSON.stringify(q.images.map(img => img.localPath)) : null,
      created_at: new Date().toISOString()
    }));

    await fs.writeFile(
      path.join(this.baseDir, `database_ready_${timestamp}.json`),
      JSON.stringify(dbFormat, null, 2)
    );

    console.log('✅ All results saved!');
    return finalReport;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printFinalSummary(report) {
    console.log('\n🎉 MASS SCRAPING COMPLETED!');
    console.log('='.repeat(60));
    console.log(`📊 URLs Processed: ${report.scraping_session.total_urls_processed}`);
    console.log(`✅ Success Rate: ${report.scraping_session.success_rate}`);
    console.log(`📝 Total Questions: ${report.question_statistics.total_questions_found}`);
    console.log(`🔄 Duplicates Removed: ${report.question_statistics.duplicates_removed}`);
    console.log(`🖼️  Images Downloaded: ${report.image_statistics.total_images_downloaded}`);
    console.log(`📂 Categories Found: ${report.category_analysis.total_categories}`);
    console.log('\n📊 Top Categories:');
    
    Object.entries(report.category_analysis.distribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} questions`);
      });
    
    console.log('\n📁 Generated Files:');
    report.files_generated.forEach(file => {
      console.log(`   - ${this.baseDir}/${file}`);
    });
    console.log('='.repeat(60));
  }
}

module.exports = { MassEhliyetScraper };

// CLI kullanımı için
if (require.main === module) {
  const scraper = new MassEhliyetScraper();
  
  async function main() {
    await scraper.init();
    
    // Test URLs (sizin vereceğiniz URLs ile değiştirilecek)
    const testUrls = [
      'https://ehliyet-soru.com/test-1-mayis-2025-ehliyet-deneme-sinavi-937',
      'https://ehliyet-soru.com/test-2-mayis-2025-ehliyet-deneme-sinavi-938'
    ];
    
    try {
      await scraper.processBulkUrls(testUrls);
      const report = await scraper.saveResults();
      scraper.printFinalSummary(report);
    } catch (error) {
      console.error('❌ Mass scraping error:', error);
    } finally {
      await scraper.close();
    }
  }
  
  main().catch(console.error);
} 