const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class CompleteMassCrawler {
  constructor() {
    this.baseUrl = 'https://ehliyetsinavihazirlik.com/index.php/ehliyet-sinav-sorulari.html';
    this.startYear = 2020;
    this.endYear = 2025;
    
    this.results = {
      masterIndex: {},
      allUrls: [],
      processedPages: 0,
      totalQuestions: 0,
      errors: [],
      aiAnalysis: {},
      progress: {
        currentYear: null,
        currentMonth: null,
        currentDay: null,
        completedYears: [],
        startTime: new Date().toISOString(),
        lastUpdate: null
      }
    };
    
    this.aiCosts = {
      deepseek: { input: 0.0014, output: 0.0028 },
      openai: { input: 0.03, output: 0.06 },
      claude: { input: 0.008, output: 0.024 }
    };
    
    this.settings = {
      batchSize: 10,           // Parallel işlem sayısı
      delayBetweenRequests: 1000,  // ms
      saveProgressEvery: 50,   // sayfa
      enableAI: true,          // AI analizi
      maxRetries: 3,           // Hata durumunda tekrar
      timeoutPerPage: 30000    // ms
    };
  }

  async init() {
    this.outputDir = 'mass_crawling_results';
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'questions'), { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'images'), { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'progress'), { recursive: true });
    
    console.log('🚀 Complete Mass Crawler initialized!');
    console.log(`📅 Target Years: ${this.startYear} - ${this.endYear}`);
    console.log(`⚙️  Settings: ${JSON.stringify(this.settings)}`);
  }

  async discoverAllUrls() {
    console.log('\n🔍 PHASE 1: Discovering all URLs...');
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      // Ana sayfadan yıl linklerini al
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: this.settings.timeoutPerPage });
      
      const yearLinks = await page.evaluate(() => {
        const yearPattern = /202[0-5]/;
        return Array.from(document.querySelectorAll('a[href]'))
          .filter(link => yearPattern.test(link.textContent) || yearPattern.test(link.href))
          .map(link => ({
            year: link.textContent.match(/202[0-5]/)?.[0],
            url: link.href,
            text: link.textContent.trim()
          }));
      });
      
      console.log(`📅 Found ${yearLinks.length} year links`);
      
      // Her yıl için ay/gün linklerini keşfet
      for (const yearData of yearLinks) {
        console.log(`\n📆 Processing year ${yearData.year}...`);
        
        await page.goto(yearData.url, { waitUntil: 'networkidle2', timeout: this.settings.timeoutPerPage });
        
                 const monthDayLinks = await page.evaluate(() => {
           function categorizeLink(text, href) {
             text = text.toLowerCase();
             href = href.toLowerCase();
             
             if (/\d{1,2}\s+(haziran|mayıs|nisan|mart|şubat|ocak)/i.test(text)) return 'daily';
             if (/(mayıs|nisan|mart|şubat|ocak|haziran).*ayı/i.test(text)) return 'monthly';
             if (href.includes('soru') && !text.includes('ayı')) return 'daily';
             
             return 'unknown';
           }
           
           return Array.from(document.querySelectorAll('a[href]'))
             .filter(link => {
               const text = link.textContent.toLowerCase();
               const href = link.href.toLowerCase();
               return (text.includes('haziran') || text.includes('mayıs') || text.includes('nisan') ||
                       text.includes('mart') || text.includes('şubat') || text.includes('ocak') ||
                       text.includes('temmuz') || text.includes('ağustos') || text.includes('eylül') ||
                       text.includes('ekim') || text.includes('kasım') || text.includes('aralık') ||
                       href.includes('soru') || /\d{1,2}\s+(haziran|mayıs|nisan)/i.test(text));
             })
             .map(link => ({
               url: link.href,
               text: link.textContent.trim(),
               type: categorizeLink(link.textContent, link.href)
             }));
         });
        
        this.results.masterIndex[yearData.year] = {
          yearUrl: yearData.url,
          links: monthDayLinks,
          discovered: new Date().toISOString()
        };
        
        this.results.allUrls.push(...monthDayLinks.map(link => link.url));
        
        console.log(`   📊 Found ${monthDayLinks.length} month/day links for ${yearData.year}`);
        
        // Progress kaydet
        await this.saveProgress();
        
        // Rate limiting
        await this.delay(this.settings.delayBetweenRequests);
      }
      
      // Duplicate temizle
      this.results.allUrls = [...new Set(this.results.allUrls)];
      
      console.log(`\n✅ URL Discovery Complete!`);
      console.log(`📊 Total unique URLs found: ${this.results.allUrls.length}`);
      
    } catch (error) {
      console.error('❌ URL discovery error:', error.message);
      this.results.errors.push(`URL Discovery: ${error.message}`);
    } finally {
      await browser.close();
    }
  }

  categorizeLink(text, href) {
    text = text.toLowerCase();
    href = href.toLowerCase();
    
    if (/\d{1,2}\s+(haziran|mayıs|nisan|mart|şubat|ocak)/i.test(text)) return 'daily';
    if (/(mayıs|nisan|mart|şubat|ocak|haziran).*ayı/i.test(text)) return 'monthly';
    if (href.includes('soru') && !text.includes('ayı')) return 'daily';
    
    return 'unknown';
  }

  async processBatch(urls, batchNumber) {
    console.log(`\n📦 Processing batch ${batchNumber} (${urls.length} URLs)...`);
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const batchResults = [];
    
    try {
      // Paralel sayfa işleme
      const promises = urls.map(async (url, index) => {
        const page = await browser.newPage();
        try {
          await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
          
          const result = await this.processPage(page, url, `${batchNumber}.${index + 1}`);
          return result;
          
        } catch (error) {
          console.log(`   ❌ Error processing ${url}: ${error.message}`);
          return { url, error: error.message, processed: false };
        } finally {
          await page.close();
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          batchResults.push(result.value);
          if (result.value.processed) {
            this.results.processedPages++;
            this.results.totalQuestions += result.value.questionCount || 0;
          }
        } else {
          this.results.errors.push(`Batch ${batchNumber}.${index + 1}: ${result.reason}`);
        }
      });
      
    } catch (error) {
      console.error(`❌ Batch ${batchNumber} error:`, error.message);
    } finally {
      await browser.close();
    }
    
    return batchResults;
  }

  async processPage(page, url, pageId) {
    console.log(`   📄 Processing page ${pageId}: ${url}`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: this.settings.timeoutPerPage });
      
      // Sayfa analizi
      const pageData = await page.evaluate(() => {
        const analysis = {
          title: document.title,
          url: window.location.href,
          questions: [],
          images: [],
          metadata: {
            questionCount: 0,
            optionCount: 0,
            imageCount: 0,
            hasContent: false
          }
        };
        
                 // DÜZELTME: Doğru soru sayma algoritması
         const bodyText = document.body.textContent;
         
         // En güvenilir: A,B,C,D seçeneklerini say
         const optionPattern = /[A-D]\)/gi;
         const optionMatches = bodyText.match(optionPattern);
         const questionCount = Math.floor((optionMatches?.length || 0) / 4);
         
         // Doğrulama için alternatif pattern'ler
         const soruPattern = /Soru\s*\d+/gi;
         const soruMatches = bodyText.match(soruPattern);
         
         const questionMarkPattern = /[A-ZÜĞŞIÖÇ][^.!?]*\?/g;
         const questionMarkMatches = bodyText.match(questionMarkPattern);
         
         // Görselleri ara
         const images = document.querySelectorAll('img[src]');
         
         analysis.metadata = {
           questionCount: questionCount, // Seçenek sayısına göre hesapla
           optionCount: optionMatches?.length || 0,
           imageCount: images.length,
           hasContent: bodyText.length > 1000,
           contentLength: bodyText.length,
           // Debug için alternatif sayılar
           soruPatternCount: soruMatches?.length || 0,
           questionMarkCount: questionMarkMatches?.length || 0,
           calculationMethod: 'options_divided_by_4'
         };
        
        // Görsel URL'lerini topla
        analysis.images = Array.from(images).map((img, i) => ({
          src: img.src,
          alt: img.alt || '',
          index: i + 1
        }));
        
        return analysis;
      });
      
      // Başarılı işlem
      const result = {
        pageId,
        url,
        processed: true,
        timestamp: new Date().toISOString(),
        questionCount: pageData.metadata.questionCount,
        imageCount: pageData.metadata.imageCount,
        hasContent: pageData.metadata.hasContent,
        title: pageData.title,
        data: pageData
      };
      
      // Sayfa verisini kaydet
      await this.savePage(result);
      
      return result;
      
    } catch (error) {
      return {
        pageId,
        url,
        processed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async savePage(pageResult) {
    const filename = `page_${pageResult.pageId.replace(/\./g, '_')}.json`;
    const filepath = path.join(this.outputDir, 'questions', filename);
    
    await fs.writeFile(filepath, JSON.stringify(pageResult, null, 2));
  }

  async saveProgress() {
    const timestamp = new Date().toISOString().split('T')[0];
    const progressFile = path.join(this.outputDir, 'progress', `progress_${timestamp}.json`);
    
    this.results.progress.lastUpdate = new Date().toISOString();
    
    await fs.writeFile(progressFile, JSON.stringify(this.results, null, 2));
  }

  async calculateAICosts() {
    const estimatedTokens = this.results.totalQuestions * 150; // 150 token/soru
    
    console.log('\n💰 AI Cost Estimation:');
    console.log(`📊 Total Questions: ${this.results.totalQuestions.toLocaleString()}`);
    console.log(`🔢 Estimated Tokens: ${estimatedTokens.toLocaleString()}`);
    
    Object.entries(this.aiCosts).forEach(([provider, costs]) => {
      const inputCost = (estimatedTokens / 1000) * costs.input;
      const outputCost = (estimatedTokens * 0.3 / 1000) * costs.output;
      const totalCost = inputCost + outputCost;
      
      console.log(`\n${provider.toUpperCase()}:`);
      console.log(`   Input: $${inputCost.toFixed(4)}`);
      console.log(`   Output: $${outputCost.toFixed(4)}`);
      console.log(`   TOTAL: $${totalCost.toFixed(2)}`);
      console.log(`   Per Question: $${(totalCost / this.results.totalQuestions).toFixed(6)}`);
    });
    
    this.results.aiAnalysis = {
      estimatedTokens,
      costBreakdown: Object.entries(this.aiCosts).reduce((acc, [provider, costs]) => {
        const inputCost = (estimatedTokens / 1000) * costs.input;
        const outputCost = (estimatedTokens * 0.3 / 1000) * costs.output;
        acc[provider] = {
          input: inputCost,
          output: outputCost,
          total: inputCost + outputCost
        };
        return acc;
      }, {})
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runFullCrawl() {
    const startTime = Date.now();
    
    try {
      // 1. URL keşfi
      await this.discoverAllUrls();
      
      if (this.results.allUrls.length === 0) {
        throw new Error('No URLs discovered');
      }
      
      // 2. Batch'lere böl
      const batches = [];
      for (let i = 0; i < this.results.allUrls.length; i += this.settings.batchSize) {
        batches.push(this.results.allUrls.slice(i, i + this.settings.batchSize));
      }
      
      console.log(`\n🚀 PHASE 2: Processing ${batches.length} batches...`);
      
      // 3. Batch'leri işle
      for (let i = 0; i < batches.length; i++) {
        const batchResults = await this.processBatch(batches[i], i + 1);
        
        // Progress kaydet
        if ((i + 1) % 5 === 0) {
          await this.saveProgress();
          console.log(`📊 Progress: ${this.results.processedPages}/${this.results.allUrls.length} pages processed`);
        }
        
        // Rate limiting
        await this.delay(this.settings.delayBetweenRequests);
      }
      
      // 4. AI maliyet analizi
      await this.calculateAICosts();
      
      // 5. Final kayıt
      await this.saveProgress();
      
      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
      
      console.log('\n🎉 CRAWLING COMPLETED!');
      console.log('='.repeat(70));
      console.log(`⏱️  Duration: ${duration} minutes`);
      console.log(`📊 URLs Discovered: ${this.results.allUrls.length}`);
      console.log(`✅ Pages Processed: ${this.results.processedPages}`);
      console.log(`📚 Questions Found: ${this.results.totalQuestions.toLocaleString()}`);
      console.log(`❌ Errors: ${this.results.errors.length}`);
      console.log(`💰 Estimated Cost (DeepSeek): $${this.results.aiAnalysis.costBreakdown?.deepseek?.total.toFixed(2) || 'N/A'}`);
      console.log('='.repeat(70));
      
    } catch (error) {
      console.error('❌ Full crawl error:', error.message);
      this.results.errors.push(`Full Crawl: ${error.message}`);
    }
  }
}

async function main() {
  const crawler = new CompleteMassCrawler();
  
  try {
    await crawler.init();
    await crawler.runFullCrawl();
    
  } catch (error) {
    console.error('❌ Main error:', error.message);
  }
}

if (require.main === module) {
  console.log('🚀 Starting Complete Mass Crawler...');
  console.log('⚠️  This will process thousands of pages. Press Ctrl+C to stop.\n');
  
  main().catch(console.error);
}

module.exports = { CompleteMassCrawler }; 