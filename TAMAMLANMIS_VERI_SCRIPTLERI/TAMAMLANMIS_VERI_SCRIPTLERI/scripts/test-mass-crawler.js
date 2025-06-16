const { CompleteMassCrawler } = require('./complete-mass-crawler.js');

class TestMassCrawler extends CompleteMassCrawler {
  constructor() {
    super();
    
    // Test ayarları
    this.settings = {
      batchSize: 5,            // Küçük batch
      delayBetweenRequests: 500,  // Hızlı test
      saveProgressEvery: 10,   // Sık kayıt
      enableAI: true,
      maxRetries: 2,
      timeoutPerPage: 15000,   // Kısa timeout
      testMode: true,
      maxUrls: 20              // Maximum 20 URL test için
    };
    
    this.outputDir = 'test_mass_crawling_results';
  }

  async discoverAllUrls() {
    console.log('\n🧪 TEST MODE: Limited URL Discovery...');
    
    // Parent method'u çağır
    await super.discoverAllUrls();
    
    // URL'leri test için sınırla
    if (this.results.allUrls.length > this.settings.maxUrls) {
      console.log(`🔬 Limiting to first ${this.settings.maxUrls} URLs for testing`);
      this.results.allUrls = this.results.allUrls.slice(0, this.settings.maxUrls);
    }
    
    console.log(`🧪 Test will process ${this.results.allUrls.length} URLs`);
  }

  async printTestSummary() {
    console.log('\n🧪 TEST CRAWLING SUMMARY');
    console.log('='.repeat(70));
    console.log(`🔬 Test Mode: ${this.settings.testMode ? 'ENABLED' : 'DISABLED'}`);
    console.log(`📊 URLs Tested: ${this.results.allUrls.length}/${this.settings.maxUrls}`);
    console.log(`✅ Pages Processed: ${this.results.processedPages}`);
    console.log(`📚 Questions Found: ${this.results.totalQuestions}`);
    console.log(`❌ Errors: ${this.results.errors.length}`);
    
    if (this.results.totalQuestions > 0) {
      console.log(`📈 Average Questions/Page: ${(this.results.totalQuestions / this.results.processedPages).toFixed(1)}`);
      
      // Extrapolation
      const totalUrlsEstimate = 2000; // Tahmini toplam URL
      const projectedQuestions = (this.results.totalQuestions / this.results.allUrls.length) * totalUrlsEstimate;
      
      console.log(`\n🔮 PROJECTIONS (if scaled to ${totalUrlsEstimate} URLs):`);
      console.log(`   Estimated Questions: ${Math.round(projectedQuestions).toLocaleString()}`);
      
      if (this.results.aiAnalysis?.costBreakdown) {
        const scaledCost = (this.results.aiAnalysis.costBreakdown.deepseek.total / this.results.allUrls.length) * totalUrlsEstimate;
        console.log(`   Estimated AI Cost (DeepSeek): $${scaledCost.toFixed(2)}`);
      }
    }
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Sample Errors:');
      this.results.errors.slice(0, 3).forEach((error, i) => {
        console.log(`   ${i+1}. ${error}`);
      });
    }
    
    console.log('\n✅ TEST RECOMMENDATIONS:');
    if (this.results.processedPages / this.results.allUrls.length > 0.8) {
      console.log('   🟢 High success rate - Ready for full crawl');
    } else if (this.results.processedPages / this.results.allUrls.length > 0.5) {
      console.log('   🟡 Medium success rate - Consider adjusting settings');
    } else {
      console.log('   🔴 Low success rate - Review error patterns');
    }
    
    console.log('='.repeat(70));
  }

  async runTestCrawl() {
    console.log('🧪 STARTING TEST CRAWL...');
    console.log(`⚙️  Test Settings: ${JSON.stringify(this.settings)}\n`);
    
    const startTime = Date.now();
    
    try {
      await super.runFullCrawl();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n⏱️  Test Duration: ${duration} seconds`);
      
      await this.printTestSummary();
      
    } catch (error) {
      console.error('❌ Test crawl error:', error.message);
    }
  }
}

async function main() {
  const testCrawler = new TestMassCrawler();
  
  try {
    await testCrawler.init();
    await testCrawler.runTestCrawl();
    
  } catch (error) {
    console.error('❌ Test main error:', error.message);
  }
}

if (require.main === module) {
  console.log('🧪 Starting Test Mass Crawler...');
  console.log('📊 This is a limited test run (max 20 URLs)\n');
  
  main().catch(console.error);
}

module.exports = { TestMassCrawler }; 