const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { MassEhliyetScraper } = require('./mass-scraper-v2');

class TwoStageScraper {
  constructor() {
    this.browser = null;
    this.testListUrls = [];
    this.realTestUrls = [];
    this.massScaper = new MassEhliyetScraper();
    this.baseUrl = 'https://ehliyet-soru.com';
    
    // Working patterns from analysis
    this.workingPatterns = [
      'testlist-{year}-yeni-ehliyet-sorulari-{num}',
      'testlist-{month}-{year}-ehliyet-sinavlari-{num}',
      'testlist-gecmis-meb-ehliyet-sinavlari-{num}'
    ];
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('🚀 Two-Stage Scraper initialized!');
    console.log('📋 Working patterns loaded:', this.workingPatterns.length);
  }

  // Stage 1: Generate testlist URLs (2020-2025)
  generateTestListUrls() {
    console.log('\n📅 Stage 1: Generating testlist URLs (2020-2025)...');
    
    const months = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran',
                   'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
    
    const years = [2020, 2021, 2022, 2023, 2024, 2025];
    const testListUrls = [];
    
    this.workingPatterns.forEach(pattern => {
      if (pattern.includes('{month}') && pattern.includes('{year}')) {
        // Monthly pattern: testlist-{month}-{year}-ehliyet-sinavlari-{num}
        years.forEach(year => {
          months.forEach(month => {
            for (let num = 1; num <= 50; num++) { // Try numbers 1-50
              const url = `${this.baseUrl}/${pattern}`
                .replace('{year}', year)
                .replace('{month}', month)
                .replace('{num}', num);
              testListUrls.push(url);
            }
          });
        });
      } else if (pattern.includes('{year}')) {
        // Yearly pattern: testlist-{year}-yeni-ehliyet-sorulari-{num}
        years.forEach(year => {
          for (let num = 1; num <= 20; num++) { // Try numbers 1-20
            const url = `${this.baseUrl}/${pattern}`
              .replace('{year}', year)
              .replace('{num}', num);
            testListUrls.push(url);
          }
        });
      } else {
        // Static pattern: testlist-gecmis-meb-ehliyet-sinavlari-{num}
        for (let num = 1; num <= 30; num++) { // Try numbers 1-30
          const url = `${this.baseUrl}/${pattern}`.replace('{num}', num);
          testListUrls.push(url);
        }
      }
    });
    
    this.testListUrls = [...new Set(testListUrls)]; // Remove duplicates
    console.log(`✅ Generated ${this.testListUrls.length} testlist URLs`);
    
    return this.testListUrls;
  }

  // Stage 2: Extract real test URLs from testlist pages
  async extractRealTestUrls() {
    console.log('\n🔍 Stage 2: Extracting real test URLs from testlist pages...');
    
    const validTestListUrls = [];
    const batchSize = 5;
    let processedCount = 0;
    
    console.log(`📦 Processing ${this.testListUrls.length} testlist URLs in batches of ${batchSize}`);
    
    for (let i = 0; i < this.testListUrls.length; i += batchSize) {
      const batch = this.testListUrls.slice(i, i + batchSize);
      console.log(`\n📦 Batch ${Math.floor(i/batchSize) + 1}: Processing ${batch.length} testlist URLs`);
      
      const promises = batch.map(url => this.processTestListPage(url));
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        processedCount++;
        if (result.status === 'fulfilled' && result.value) {
          validTestListUrls.push(batch[index]);
          console.log(`  ✅ Valid testlist: ${batch[index]} (${result.value.realTestCount} tests found)`);
        } else {
          console.log(`  ❌ Invalid: ${batch[index]}`);
        }
      });
      
      console.log(`📊 Progress: ${processedCount}/${this.testListUrls.length} processed, ${this.realTestUrls.length} real test URLs found`);
      
      // Rate limiting
      if (i + batchSize < this.testListUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n✅ Stage 2 Complete: Found ${this.realTestUrls.length} real test URLs from ${validTestListUrls.length} valid testlist pages`);
    return this.realTestUrls;
  }

  async processTestListPage(testListUrl) {
    const page = await this.browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const response = await page.goto(testListUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 15000 
      });
      
      if (!response || response.status() !== 200) {
        return null;
      }
      
      // Extract test links from this testlist page
      const testLinks = await page.evaluate(() => {
        // Look for test links (typically have 'test-' pattern and numbers)
        const allLinks = Array.from(document.querySelectorAll('a[href]'));
        const testLinks = allLinks
          .map(a => a.href)
          .filter(href => 
            href.includes('test-') && 
            href.match(/test-\d+/) && // Contains test- followed by numbers
            !href.includes('testlist') && // Not another testlist
            href.startsWith('https://ehliyet-soru.com/')
          );
        
        return [...new Set(testLinks)]; // Remove duplicates
      });
      
      if (testLinks.length > 0) {
        // Add to our collection
        testLinks.forEach(url => {
          if (!this.realTestUrls.includes(url)) {
            this.realTestUrls.push(url);
          }
        });
        
        return {
          testListUrl,
          realTestCount: testLinks.length,
          foundTests: testLinks
        };
      }
      
      return null;
      
    } catch (error) {
      return null;
    } finally {
      await page.close();
    }
  }

  // Stage 3: Mass scrape questions from real test URLs
  async massScrapRealTests() {
    console.log('\n📝 Stage 3: Mass scraping questions from real test URLs...');
    
    if (this.realTestUrls.length === 0) {
      console.log('❌ No real test URLs to scrape');
      return null;
    }
    
    console.log(`🎯 Starting mass scraping of ${this.realTestUrls.length} real test URLs`);
    console.log('💡 Each test should contain ~50 questions');
    
    // Initialize mass scraper
    await this.massScaper.init();
    
    // Process URLs in batches
    await this.massScaper.processBulkUrls(this.realTestUrls);
    
    // Save results
    const results = await this.massScaper.saveResults();
    
    await this.massScaper.close();
    
    return results;
  }

  async saveStageResults() {
    console.log('\n💾 Saving two-stage scraping results...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    const outputDir = 'two_stage_results';
    
    await fs.mkdir(outputDir, { recursive: true });
    
    // Stage 1 results
    await fs.writeFile(
      path.join(outputDir, `generated_testlist_urls_${timestamp}.json`),
      JSON.stringify(this.testListUrls, null, 2)
    );
    
    // Stage 2 results  
    await fs.writeFile(
      path.join(outputDir, `extracted_real_test_urls_${timestamp}.json`),
      JSON.stringify(this.realTestUrls, null, 2)
    );
    
    await fs.writeFile(
      path.join(outputDir, `real_test_urls_for_scraping_${timestamp}.txt`),
      this.realTestUrls.join('\n')
    );
    
    // Summary
    const summary = {
      two_stage_process: {
        stage_1_generated_testlist_urls: this.testListUrls.length,
        stage_2_extracted_real_test_urls: this.realTestUrls.length,
        stage_3_questions_scraped: 'See mass_scraped_data folder',
        extraction_rate: `${(this.realTestUrls.length / this.testListUrls.length * 100).toFixed(1)}%`
      },
      estimated_questions: this.realTestUrls.length * 50,
      year_range: '2020-2025',
      patterns_used: this.workingPatterns,
      next_step: 'Stage 3 mass scraping completed automatically'
    };
    
    await fs.writeFile(
      path.join(outputDir, `two_stage_summary_${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('✅ Stage results saved to:', outputDir);
    return summary;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printFinalSummary(stageResults, massScrapingResults) {
    console.log('\n🎉 TWO-STAGE SCRAPING COMPLETED!');
    console.log('='.repeat(70));
    console.log(`📋 Stage 1 - Generated testlist URLs: ${stageResults.two_stage_process.stage_1_generated_testlist_urls}`);
    console.log(`🔍 Stage 2 - Extracted real test URLs: ${stageResults.two_stage_process.stage_2_extracted_real_test_urls}`);
    console.log(`📝 Stage 3 - Questions scraped: ${massScrapingResults?.question_statistics?.unique_questions || 'See mass_scraped_data'}`);
    console.log(`✅ Extraction Rate: ${stageResults.two_stage_process.extraction_rate}`);
    
    if (massScrapingResults) {
      console.log(`🎯 Final Question Count: ${massScrapingResults.question_statistics.unique_questions}`);
      console.log(`🔄 Duplicates Removed: ${massScrapingResults.question_statistics.duplicates_removed}`);
      console.log(`🖼️  Images Downloaded: ${massScrapingResults.image_statistics.total_images_downloaded}`);
      
      console.log('\n📊 Question Categories:');
      Object.entries(massScrapingResults.category_analysis.distribution || {})
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([category, count]) => {
          console.log(`   ${category}: ${count} questions`);
        });
    }
    
    console.log('\n📁 Generated Files:');
    console.log('   - two_stage_results/ (Stage results)');
    console.log('   - mass_scraped_data/ (Final questions + images)');
    console.log('='.repeat(70));
  }
}

async function main() {
  const scraper = new TwoStageScraper();
  
  try {
    await scraper.init();
    
    // Stage 1: Generate testlist URLs
    scraper.generateTestListUrls();
    
    // Stage 2: Extract real test URLs 
    await scraper.extractRealTestUrls();
    
    // Save intermediate results
    const stageResults = await scraper.saveStageResults();
    
    // Stage 3: Mass scrape questions (only if we found real test URLs)
    let massScrapingResults = null;
    if (scraper.realTestUrls.length > 0) {
      massScrapingResults = await scraper.massScrapRealTests();
    }
    
    scraper.printFinalSummary(stageResults, massScrapingResults);
    
  } catch (error) {
    console.error('❌ Two-stage scraping error:', error);
  } finally {
    await scraper.close();
  }
}

module.exports = { TwoStageScraper };

if (require.main === module) {
  main().catch(console.error);
} 