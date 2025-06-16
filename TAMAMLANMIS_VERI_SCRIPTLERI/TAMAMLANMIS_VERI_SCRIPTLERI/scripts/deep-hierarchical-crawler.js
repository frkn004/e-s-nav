const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class DeepHierarchicalCrawler {
  constructor() {
    this.baseUrl = 'https://ehliyetsinavihazirlik.com/index.php/ehliyet-sinav-sorulari.html';
    this.results = {
      hierarchy: {},
      allLinks: [],
      errors: [],
      progress: {
        years: 0,
        months: 0,
        days: 0,
        totalLinks: 0
      }
    };
    
    this.targetYears = [2020, 2021, 2022, 2023, 2024, 2025];
    this.months = [
      'ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran',
      'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'
    ];
  }

  async init() {
    this.outputDir = 'deep_crawling_results';
    await fs.mkdir(this.outputDir, { recursive: true });
    console.log('🕷️  Deep Hierarchical Crawler initialized!');
    console.log(`🎯 Target: ${this.targetYears.join(', ')}`);
  }

  async analyzePage() {
    console.log('\n🔍 Analyzing main page structure...');
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      console.log(`📄 Loading: ${this.baseUrl}`);
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Sayfa yapısını analiz et
      const pageAnalysis = await page.evaluate(() => {
        const analysis = {
          title: document.title,
          allLinks: [],
          yearLinks: [],
          structure: {}
        };
        
        // Tüm linkleri topla
        const allLinks = Array.from(document.querySelectorAll('a[href]'));
        analysis.allLinks = allLinks.map(link => ({
          text: link.textContent.trim(),
          href: link.href,
          innerHTML: link.innerHTML
        }));
        
        // Yıl linklerini ara
        const yearPatterns = [/202[0-5]/, /2020|2021|2022|2023|2024|2025/];
        analysis.yearLinks = analysis.allLinks.filter(link => 
          yearPatterns.some(pattern => 
            pattern.test(link.text) || pattern.test(link.href)
          )
        );
        
        return analysis;
      });
      
      console.log('📊 Page Analysis Results:');
      console.log(`   Page Title: ${pageAnalysis.title}`);
      console.log(`   Total Links: ${pageAnalysis.allLinks.length}`);
      console.log(`   Year Links Found: ${pageAnalysis.yearLinks.length}`);
      
      // Yıl linklerini göster
      if (pageAnalysis.yearLinks.length > 0) {
        console.log('\n📅 Year Links Found:');
        pageAnalysis.yearLinks.forEach((link, i) => {
          console.log(`   ${i+1}. "${link.text}" -> ${link.href}`);
        });
      }
      
      return pageAnalysis;
      
    } catch (error) {
      console.log(`❌ Page analysis error: ${error.message}`);
      return null;
    } finally {
      await browser.close();
    }
  }

  async testSingleLink(testUrl) {
    console.log(`\n🧪 Testing single link: ${testUrl}`);
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Test sayfasını analiz et
      const testAnalysis = await page.evaluate(() => {
        const analysis = {
          title: document.title,
          url: window.location.href,
          content: {
            hasQuestions: false,
            questionCount: 0,
            hasOptions: false,
            optionCount: 0,
            hasImages: false,
            imageCount: 0
          },
          structure: {
            divs: document.querySelectorAll('div').length,
            paragraphs: document.querySelectorAll('p').length,
            links: document.querySelectorAll('a').length,
            forms: document.querySelectorAll('form').length
          },
          sampleContent: document.body.textContent.substring(0, 500)
        };
        
        // Soru kalıplarını ara
        const questionPatterns = [
          /Soru \d+/gi,
          /\?\s*$/gm,
          /Aşağıdaki/gi,
          /Hangisi/gi
        ];
        
        const bodyText = document.body.textContent;
        questionPatterns.forEach(pattern => {
          const matches = bodyText.match(pattern);
          if (matches) {
            analysis.content.hasQuestions = true;
            analysis.content.questionCount += matches.length;
          }
        });
        
        // Seçenek kalıplarını ara
        const optionPatterns = [
          /[A-D]\)/gi,
          /[A-D]\s*-/gi,
          /[A-D]\s*\./gi
        ];
        
        optionPatterns.forEach(pattern => {
          const matches = bodyText.match(pattern);
          if (matches) {
            analysis.content.hasOptions = true;
            analysis.content.optionCount += matches.length;
          }
        });
        
        // Görselleri say
        const images = document.querySelectorAll('img');
        analysis.content.imageCount = images.length;
        analysis.content.hasImages = images.length > 0;
        
        return analysis;
      });
      
      console.log('🧪 Test Results:');
      console.log(`   Title: ${testAnalysis.title}`);
      console.log(`   URL: ${testAnalysis.url}`);
      console.log(`   Questions Found: ${testAnalysis.content.questionCount}`);
      console.log(`   Options Found: ${testAnalysis.content.optionCount}`);
      console.log(`   Images Found: ${testAnalysis.content.imageCount}`);
      console.log(`   Page Elements: ${JSON.stringify(testAnalysis.structure)}`);
      
      // İçerik örneği göster
      console.log('\n📄 Sample Content:');
      console.log(`"${testAnalysis.sampleContent}..."`);
      
      return testAnalysis;
      
    } catch (error) {
      console.log(`❌ Test link error: ${error.message}`);
      return null;
    } finally {
      await browser.close();
    }
  }

  async crawlYearPage(yearUrl) {
    console.log(`\n📅 Crawling year page: ${yearUrl}`);
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      await page.goto(yearUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Ay linklerini ara
      const monthAnalysis = await page.evaluate(() => {
        const analysis = {
          monthLinks: [],
          allLinks: []
        };
        
        const allLinks = Array.from(document.querySelectorAll('a[href]'));
        analysis.allLinks = allLinks.map(link => ({
          text: link.textContent.trim().toLowerCase(),
          href: link.href
        }));
        
        // Ay isimlerini ara
        const monthNames = [
          'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran',
          'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık',
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'
        ];
        
        analysis.monthLinks = analysis.allLinks.filter(link => 
          monthNames.some(month => 
            link.text.includes(month) || 
            link.href.toLowerCase().includes(month)
          )
        );
        
        return analysis;
      });
      
      console.log(`   📊 Total links: ${monthAnalysis.allLinks.length}`);
      console.log(`   📅 Month links: ${monthAnalysis.monthLinks.length}`);
      
      if (monthAnalysis.monthLinks.length > 0) {
        console.log('   📅 Found months:');
        monthAnalysis.monthLinks.forEach((link, i) => {
          console.log(`      ${i+1}. "${link.text}" -> ${link.href}`);
        });
      }
      
      return monthAnalysis.monthLinks;
      
    } catch (error) {
      console.log(`   ❌ Year crawl error: ${error.message}`);
      return [];
    } finally {
      await browser.close();
    }
  }

  async crawlMonthPage(monthUrl) {
    console.log(`\n📅 Crawling month page: ${monthUrl}`);
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      await page.goto(monthUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Gün linklerini ara
      const dayAnalysis = await page.evaluate(() => {
        const analysis = {
          dayLinks: [],
          allLinks: []
        };
        
        const allLinks = Array.from(document.querySelectorAll('a[href]'));
        analysis.allLinks = allLinks.map(link => ({
          text: link.textContent.trim(),
          href: link.href
        }));
        
        // Gün sayılarını ara (1-31)
        const dayPatterns = [
          /\b([1-9]|[12][0-9]|3[01])\b/,
          /gün|day|hazır/i,
          /soru|test|deneme/i
        ];
        
        analysis.dayLinks = analysis.allLinks.filter(link => 
          dayPatterns.some(pattern => 
            pattern.test(link.text) || 
            pattern.test(link.href)
          )
        );
        
        return analysis;
      });
      
      console.log(`   📊 Total links: ${dayAnalysis.allLinks.length}`);
      console.log(`   📅 Day links: ${dayAnalysis.dayLinks.length}`);
      
      if (dayAnalysis.dayLinks.length > 0) {
        console.log('   📅 Found days:');
        dayAnalysis.dayLinks.slice(0, 10).forEach((link, i) => {
          console.log(`      ${i+1}. "${link.text}" -> ${link.href}`);
        });
        if (dayAnalysis.dayLinks.length > 10) {
          console.log(`      ... and ${dayAnalysis.dayLinks.length - 10} more`);
        }
      }
      
      return dayAnalysis.dayLinks;
      
    } catch (error) {
      console.log(`   ❌ Month crawl error: ${error.message}`);
      return [];
    } finally {
      await browser.close();
    }
  }

  async saveProgress() {
    const timestamp = new Date().toISOString().split('T')[0];
    
    await fs.writeFile(
      path.join(this.outputDir, `crawling_progress_${timestamp}.json`),
      JSON.stringify(this.results, null, 2)
    );
    
    console.log(`💾 Progress saved: ${this.results.progress.totalLinks} total links found`);
  }

  async printSummary() {
    console.log('\n📋 DEEP CRAWLING SUMMARY');
    console.log('='.repeat(70));
    console.log(`📊 Progress:`);
    console.log(`   Years Processed: ${this.results.progress.years}`);
    console.log(`   Months Processed: ${this.results.progress.months}`);
    console.log(`   Days Processed: ${this.results.progress.days}`);
    console.log(`   Total Links Found: ${this.results.progress.totalLinks}`);
    console.log(`   Errors: ${this.results.errors.length}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.slice(0, 5).forEach((error, i) => {
        console.log(`   ${i+1}. ${error}`);
      });
    }
    
    console.log('='.repeat(70));
  }
}

async function main() {
  const crawler = new DeepHierarchicalCrawler();
  
  try {
    await crawler.init();
    
    // 1. Ana sayfa analizi
    console.log('🎯 PHASE 1: Analyzing main page...');
    const pageAnalysis = await crawler.analyzePage();
    
    if (!pageAnalysis) {
      throw new Error('Main page analysis failed');
    }
    
    // 2. İlk bulduğumuz linki test et
    if (pageAnalysis.yearLinks.length > 0) {
      console.log('\n🎯 PHASE 2: Testing first found link...');
      const firstLink = pageAnalysis.yearLinks[0];
      const testResult = await crawler.testSingleLink(firstLink.href);
      
      if (testResult) {
        console.log('\n✅ Test successful! Link structure detected.');
        
        // 3. İlk yılın aylarını çek
        console.log('\n🎯 PHASE 3: Crawling months for first year...');
        const monthLinks = await crawler.crawlYearPage(firstLink.href);
        
        if (monthLinks.length > 0) {
          // 4. İlk ayın günlerini çek
          console.log('\n🎯 PHASE 4: Crawling days for first month...');
          const dayLinks = await crawler.crawlMonthPage(monthLinks[0].href);
          
          // İlk günü test et
          if (dayLinks.length > 0) {
            console.log('\n🎯 PHASE 5: Testing first day link...');
            await crawler.testSingleLink(dayLinks[0].href);
          }
        }
      }
    } else {
      console.log('❌ No year links found on main page');
    }
    
    // Progress kaydet
    await crawler.saveProgress();
    await crawler.printSummary();
    
  } catch (error) {
    console.error('❌ Deep crawling error:', error.message);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DeepHierarchicalCrawler }; 