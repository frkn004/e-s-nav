const { CompleteMassCrawler } = require('./complete-mass-crawler.js');
const fs = require('fs').promises;
const path = require('path');

class ProductionMassCrawler extends CompleteMassCrawler {
  constructor() {
    super();
    
    // Production ayarları
    this.settings = {
      batchSize: 15,           // Paralel işlem sayısı
      delayBetweenRequests: 2000,  // Rate limiting
      saveProgressEvery: 25,   // Progress kaydetme sıklığı
      enableAI: true,
      maxRetries: 5,           // Hata durumunda tekrar
      timeoutPerPage: 45000,   // Uzun timeout
      productionMode: true,
      autoResume: true,        // Otomatik devam et
      maxConcurrentPages: 10   // Aynı anda açık sayfa sayısı
    };
    
    this.outputDir = 'production_mass_crawling_results';
    this.checkpointFile = path.join(this.outputDir, 'checkpoint.json');
    this.resumeData = null;
  }

  async init() {
    await super.init();
    
    // Checkpoint kontrol et
    if (this.settings.autoResume) {
      await this.loadCheckpoint();
    }
    
    console.log('🏭 Production Mass Crawler initialized!');
    if (this.resumeData) {
      console.log(`🔄 Resume mode: Starting from ${this.resumeData.processedCount} processed pages`);
    }
  }

  async loadCheckpoint() {
    try {
      const checkpointExists = await fs.access(this.checkpointFile).then(() => true).catch(() => false);
      if (checkpointExists) {
        const data = await fs.readFile(this.checkpointFile, 'utf8');
        this.resumeData = JSON.parse(data);
        console.log(`📂 Checkpoint loaded: ${this.resumeData.processedCount} pages processed`);
      }
    } catch (error) {
      console.log('📂 No valid checkpoint found, starting fresh');
    }
  }

  async saveCheckpoint() {
    const checkpoint = {
      processedCount: this.results.processedPages,
      totalQuestions: this.results.totalQuestions,
      lastProcessedUrl: this.currentUrl,
      allUrls: this.results.allUrls,
      processedUrls: this.processedUrls || [],
      timestamp: new Date().toISOString(),
      errors: this.results.errors.slice(-10) // Son 10 hata
    };
    
    await fs.writeFile(this.checkpointFile, JSON.stringify(checkpoint, null, 2));
  }

  async discoverAllUrls() {
    if (this.resumeData && this.resumeData.allUrls) {
      console.log('🔄 Using URLs from checkpoint...');
      this.results.allUrls = this.resumeData.allUrls;
      this.processedUrls = this.resumeData.processedUrls || [];
      this.results.processedPages = this.resumeData.processedCount || 0;
      this.results.totalQuestions = this.resumeData.totalQuestions || 0;
      
      // İşlenmemiş URL'leri filtrele
      this.results.allUrls = this.results.allUrls.filter(url => 
        !this.processedUrls.includes(url)
      );
      
      console.log(`📊 Resuming with ${this.results.allUrls.length} remaining URLs`);
      return;
    }
    
    await super.discoverAllUrls();
    this.processedUrls = [];
  }

  async processBatch(urls, batchNumber) {
    console.log(`\n📦 Production Batch ${batchNumber} (${urls.length} URLs)...`);
    
    // Her batch için yeni browser instance
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const batchResults = [];
    const maxConcurrent = Math.min(this.settings.maxConcurrentPages, urls.length);
    
    try {
      // Semaphore ile concurrent page limitini kontrol et
      const semaphore = new Array(maxConcurrent).fill(null);
      let urlIndex = 0;
      const promises = [];
      
      // İlk batch'i başlat
      for (let i = 0; i < maxConcurrent && i < urls.length; i++) {
        promises.push(this.processWithSemaphore(browser, urls, urlIndex++, batchNumber, semaphore, i));
      }
      
      // Tamamlanan sayfalara göre yenilerini başlat
      while (urlIndex < urls.length) {
        await Promise.race(promises);
        promises.push(this.processWithSemaphore(browser, urls, urlIndex++, batchNumber, semaphore, urlIndex % maxConcurrent));
      }
      
      // Kalan tüm işlemleri bekle
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          batchResults.push(result.value);
          if (result.value.processed) {
            this.results.processedPages++;
            this.results.totalQuestions += result.value.questionCount || 0;
            this.processedUrls.push(result.value.url);
          }
        } else {
          this.results.errors.push(`Batch ${batchNumber}.${index + 1}: ${result.reason}`);
        }
      });
      
      // Batch tamamlandıktan sonra checkpoint kaydet
      await this.saveCheckpoint();
      
    } catch (error) {
      console.error(`❌ Production Batch ${batchNumber} error:`, error.message);
    } finally {
      await browser.close();
    }
    
    return batchResults;
  }

  async processWithSemaphore(browser, urls, urlIndex, batchNumber, semaphore, slotIndex) {
    if (urlIndex >= urls.length) return null;
    
    const url = urls[urlIndex];
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      this.currentUrl = url;
      const result = await this.processPage(page, url, `${batchNumber}.${urlIndex + 1}`);
      
      return result;
      
    } catch (error) {
      console.log(`   ❌ Error processing ${url}: ${error.message}`);
      return { url, error: error.message, processed: false };
    } finally {
      await page.close();
    }
  }

  async generateFinalReport() {
    const report = {
      summary: {
        totalUrlsDiscovered: this.results.allUrls.length + (this.processedUrls?.length || 0),
        pagesProcessed: this.results.processedPages,
        totalQuestions: this.results.totalQuestions,
        errors: this.results.errors.length,
        averageQuestionsPerPage: this.results.totalQuestions / this.results.processedPages,
        successRate: (this.results.processedPages / (this.results.allUrls.length + (this.processedUrls?.length || 0))) * 100
      },
      aiCosts: this.results.aiAnalysis,
      errors: this.results.errors,
      timestamp: new Date().toISOString(),
      duration: {
        start: this.results.progress.startTime,
        end: new Date().toISOString()
      }
    };
    
    await fs.writeFile(
      path.join(this.outputDir, 'final_report.json'),
      JSON.stringify(report, null, 2)
    );
    
    return report;
  }

  async printProductionSummary() {
    console.log('\n🏭 PRODUCTION CRAWLING SUMMARY');
    console.log('='.repeat(80));
    console.log(`🏗️  Production Mode: ${this.settings.productionMode ? 'ENABLED' : 'DISABLED'}`);
    console.log(`📊 Total URLs Discovered: ${this.results.allUrls.length + (this.processedUrls?.length || 0)}`);
    console.log(`✅ Pages Successfully Processed: ${this.results.processedPages}`);
    console.log(`📚 Total Questions Extracted: ${this.results.totalQuestions.toLocaleString()}`);
    console.log(`📈 Average Questions/Page: ${(this.results.totalQuestions / this.results.processedPages).toFixed(1)}`);
    console.log(`🎯 Success Rate: ${((this.results.processedPages / (this.results.allUrls.length + (this.processedUrls?.length || 0))) * 100).toFixed(1)}%`);
    console.log(`❌ Total Errors: ${this.results.errors.length}`);
    
    if (this.results.aiAnalysis?.costBreakdown) {
      console.log(`\n💰 AI Processing Costs:`);
      console.log(`   DeepSeek: $${this.results.aiAnalysis.costBreakdown.deepseek?.total.toFixed(2)}`);
      console.log(`   OpenAI GPT-4: $${this.results.aiAnalysis.costBreakdown.openai?.total.toFixed(2)}`);
      console.log(`   Claude: $${this.results.aiAnalysis.costBreakdown.claude?.total.toFixed(2)}`);
    }
    
    console.log('\n📊 EXTRAPOLATED ESTIMATES:');
    const completionRate = this.results.processedPages / (this.results.allUrls.length + (this.processedUrls?.length || 0));
    if (completionRate < 1.0) {
      const remainingPages = Math.round((1 - completionRate) * (this.results.allUrls.length + (this.processedUrls?.length || 0)));
      const estimatedRemainingQuestions = remainingPages * (this.results.totalQuestions / this.results.processedPages);
      console.log(`   Estimated Remaining Pages: ${remainingPages}`);
      console.log(`   Estimated Remaining Questions: ${Math.round(estimatedRemainingQuestions).toLocaleString()}`);
      console.log(`   Estimated Total Final Questions: ${Math.round(this.results.totalQuestions + estimatedRemainingQuestions).toLocaleString()}`);
    }
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Recent Errors:');
      this.results.errors.slice(-5).forEach((error, i) => {
        console.log(`   ${this.results.errors.length - 4 + i}. ${error.substring(0, 100)}...`);
      });
    }
    
    console.log('='.repeat(80));
  }

  async runProductionCrawl() {
    console.log('🏭 STARTING PRODUCTION CRAWL...');
    console.log(`⚙️  Production Settings: ${JSON.stringify(this.settings)}\n`);
    
    const startTime = Date.now();
    
    try {
      const report = await super.runFullCrawl();
      
      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
      console.log(`\n⏱️  Total Production Duration: ${duration} minutes`);
      
      await this.printProductionSummary();
      
      const finalReport = await this.generateFinalReport();
      console.log(`\n📋 Final report saved to: ${path.join(this.outputDir, 'final_report.json')}`);
      
      return finalReport;
      
    } catch (error) {
      console.error('❌ Production crawl error:', error.message);
      await this.saveCheckpoint(); // Hata durumunda da checkpoint kaydet
    }
  }
}

async function main() {
  const prodCrawler = new ProductionMassCrawler();
  
  try {
    await prodCrawler.init();
    await prodCrawler.runProductionCrawl();
    
  } catch (error) {
    console.error('❌ Production main error:', error.message);
  }
}

if (require.main === module) {
  console.log('🏭 Starting Production Mass Crawler...');
  console.log('⚠️  This will process ALL discovered URLs. Process can be resumed if interrupted.\n');
  
  // Güvenlik onayı
  const args = process.argv.slice(2);
  if (!args.includes('--confirm')) {
    console.log('⚠️  Add --confirm flag to start production crawl');
    console.log('   Example: node scripts/production-mass-crawler.js --confirm\n');
    process.exit(1);
  }
  
  main().catch(console.error);
}

module.exports = { ProductionMassCrawler }; 