const { MassEhliyetScraper } = require('./mass-scraper-v2');
const fs = require('fs').promises;

class URLProcessor {
  constructor() {
    this.scraper = new MassEhliyetScraper();
  }

  // URL listesini dosyadan oku
  async readUrlsFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const urls = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.startsWith('http'));
      
      console.log(`📋 Read ${urls.length} URLs from ${filePath}`);
      return urls;
    } catch (error) {
      console.error(`❌ Error reading URLs from ${filePath}:`, error.message);
      return [];
    }
  }

  // URL pattern generator (son 5 yıl için)
  generateYearlyUrls(basePattern, startYear, endYear) {
    const urls = [];
    const months = [
      'ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran',
      'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'
    ];

    for (let year = startYear; year <= endYear; year++) {
      months.forEach((month, index) => {
        // Mayıs 2025 pattern: test-1-mayis-2025-ehliyet-deneme-sinavi-937
        for (let testNum = 1; testNum <= 31; testNum++) { // Her ay max 31 test
          const url = basePattern
            .replace('{testNum}', testNum)
            .replace('{month}', month)
            .replace('{year}', year);
          urls.push(url);
        }
      });
    }

    return urls;
  }

  // Batch processing with progress tracking
  async processUrlBatches(urls, batchSize = 10) {
    console.log(`🚀 Starting mass processing of ${urls.length} URLs`);
    console.log(`📦 Batch size: ${batchSize}`);
    
    await this.scraper.init();
    
    const totalBatches = Math.ceil(urls.length / batchSize);
    let processedCount = 0;
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, urls.length);
      const batch = urls.slice(start, end);
      
      console.log(`\n📊 Processing batch ${i + 1}/${totalBatches}`);
      console.log(`📄 URLs ${start + 1}-${end} of ${urls.length}`);
      
      try {
        await this.scraper.processBulkUrls(batch);
        processedCount += batch.length;
        
        console.log(`✅ Batch completed. Total processed: ${processedCount}/${urls.length}`);
        
        // Progress percentage
        const percentage = ((processedCount / urls.length) * 100).toFixed(1);
        console.log(`📈 Progress: ${percentage}%`);
        
        // Intermediate save every 50 URLs
        if (processedCount % 50 === 0) {
          console.log('💾 Intermediate save...');
          await this.scraper.saveResults();
        }
        
      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error.message);
      }
      
      // Rate limiting between batches
      if (i < totalBatches - 1) {
        console.log('⏳ Waiting 5 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    const finalReport = await this.scraper.saveResults();
    this.scraper.printFinalSummary(finalReport);
    await this.scraper.close();
    
    return finalReport;
  }

  // URL pattern tester
  async testUrlPattern(pattern, count = 5) {
    console.log(`🧪 Testing URL pattern: ${pattern}`);
    
    const testUrls = [];
    for (let i = 1; i <= count; i++) {
      const testUrl = pattern.replace('{testNum}', i);
      testUrls.push(testUrl);
    }
    
    console.log('Test URLs:');
    testUrls.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    
    // Test first URL
    console.log('\n🔍 Testing first URL...');
    await this.scraper.init();
    await this.scraper.scrapePageWithImages(testUrls[0]);
    await this.scraper.close();
    
    console.log(`✅ Pattern test completed. Found ${this.scraper.questionsData.length} questions.`);
  }
}

// CLI interface
async function main() {
  const processor = new URLProcessor();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔧 URL Processor Usage:

1. Process URLs from file:
   node url-processor.js file urls.txt

2. Generate 5-year URL pattern:
   node url-processor.js generate "https://ehliyet-soru.com/test-{testNum}-{month}-{year}-ehliyet-deneme-sinavi-*"

3. Test URL pattern:
   node url-processor.js test "https://ehliyet-soru.com/test-{testNum}-mayis-2025-ehliyet-deneme-sinavi-937"

4. Process sample URLs:
   node url-processor.js sample

📝 URL file format (urls.txt):
https://ehliyet-soru.com/test-1-mayis-2025-ehliyet-deneme-sinavi-937
https://ehliyet-soru.com/test-2-mayis-2025-ehliyet-deneme-sinavi-938
...
    `);
    return;
  }

  const command = args[0];
  
  try {
    switch (command) {
      case 'file':
        if (!args[1]) throw new Error('File path required');
        const urls = await processor.readUrlsFromFile(args[1]);
        if (urls.length > 0) {
          await processor.processUrlBatches(urls);
        }
        break;
        
      case 'generate':
        if (!args[1]) throw new Error('URL pattern required');
        const pattern = args[1];
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 4; // Son 5 yıl
        const endYear = currentYear;
        
        console.log(`🎯 Generating URLs for ${startYear}-${endYear}`);
        const generatedUrls = processor.generateYearlyUrls(pattern, startYear, endYear);
        
        // Save generated URLs to file
        await fs.writeFile('generated_urls.txt', generatedUrls.join('\n'));
        console.log(`📁 Generated ${generatedUrls.length} URLs saved to generated_urls.txt`);
        
        // Ask user if they want to process immediately
        console.log('\n❓ Do you want to process these URLs now? (This will take a long time)');
        console.log('   Run: node url-processor.js file generated_urls.txt');
        break;
        
      case 'test':
        if (!args[1]) throw new Error('URL pattern required');
        await processor.testUrlPattern(args[1]);
        break;
        
      case 'sample':
        const sampleUrls = [
          'https://ehliyet-soru.com/test-1-mayis-2025-ehliyet-deneme-sinavi-937',
          'https://ehliyet-soru.com/test-2-mayis-2025-ehliyet-deneme-sinavi-938',
          'https://ehliyet-soru.com/test-3-mayis-2025-ehliyet-deneme-sinavi-939'
        ];
        console.log('🧪 Processing sample URLs...');
        await processor.processUrlBatches(sampleUrls, 2);
        break;
        
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = { URLProcessor };

if (require.main === module) {
  main().catch(console.error);
} 