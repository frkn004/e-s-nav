const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class UltraDeepCrawler {
  constructor() {
    this.baseUrl = 'https://ehliyetsinavihazirlik.com/index.php/ehliyet-sinav-sorulari.html';
    this.years = [2020, 2021, 2022, 2023, 2024, 2025];
    
    this.discoveredUrls = new Set(); // Duplicate kontrolü
    this.hierarchyMap = {};
    
    this.results = {
      totalUrls: 0,
      yearPages: 0,
      monthPages: 0,
      dayPages: 0,
      duplicatesSkipped: 0,
      errors: [],
      startTime: new Date().toISOString()
    };
    
    this.outputDir = 'ultra_deep_discovery';
  }

  async init() {
    await fs.mkdir(this.outputDir, { recursive: true });
    console.log('🕷️  Ultra Deep Crawler initialized!');
    console.log(`🎯 Target Years: ${this.years.join(', ')}`);
    console.log('📊 Expected structure: Year → Month → Day pages');
  }

  async crawlLevel1_Years() {
    console.log('\n🎯 LEVEL 1: Discovering year pages...');
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      console.log(`📄 Loading main page: ${this.baseUrl}`);
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Yıl linklerini keşfet
      const yearLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links
          .filter(link => {
            const text = link.textContent;
            const href = link.href;
            return /202[0-5]/.test(text) || /202[0-5]/.test(href);
          })
          .map(link => ({
            year: link.textContent.match(/202[0-5]/)?.[0],
            url: link.href,
            text: link.textContent.trim()
          }));
      });
      
      console.log(`📅 Found ${yearLinks.length} year links:`);
      yearLinks.forEach(link => {
        console.log(`   ${link.year}: ${link.url}`);
        this.hierarchyMap[link.year] = { url: link.url, months: {} };
      });
      
      this.results.yearPages = yearLinks.length;
      return yearLinks;
      
    } catch (error) {
      console.error('❌ Level 1 error:', error.message);
      this.results.errors.push(`Level 1: ${error.message}`);
      return [];
    } finally {
      await browser.close();
    }
  }

  async crawlLevel2_Months(yearLinks) {
    console.log('\n🎯 LEVEL 2: Discovering month pages for each year...');
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    let totalMonthLinks = [];
    
    try {
      for (const yearData of yearLinks) {
        console.log(`\n📆 Processing year ${yearData.year}...`);
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        
        try {
          await page.goto(yearData.url, { waitUntil: 'networkidle2', timeout: 30000 });
          
          // Ay linklerini keşfet
          const monthLinks = await page.evaluate(() => {
            const monthNames = [
              'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran',
              'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık',
              'january', 'february', 'march', 'april', 'may', 'june',
              'july', 'august', 'september', 'october', 'november', 'december'
            ];
            
            const monthMap = {
              'ocak': 'ocak', 'january': 'ocak',
              'şubat': 'subat', 'february': 'subat', 
              'mart': 'mart', 'march': 'mart',
              'nisan': 'nisan', 'april': 'nisan',
              'mayıs': 'mayis', 'may': 'mayis',
              'haziran': 'haziran', 'june': 'haziran',
              'temmuz': 'temmuz', 'july': 'temmuz',
              'ağustos': 'agustos', 'august': 'agustos',
              'eylül': 'eylul', 'september': 'eylul',
              'ekim': 'ekim', 'october': 'ekim',
              'kasım': 'kasim', 'november': 'kasim',
              'aralık': 'aralik', 'december': 'aralik'
            };
            
            function extractMonth(text, href) {
              const combined = (text + ' ' + href).toLowerCase();
              for (const [key, value] of Object.entries(monthMap)) {
                if (combined.includes(key)) return value;
              }
              return 'unknown';
            }
            
            const links = Array.from(document.querySelectorAll('a[href]'));
            return links
              .filter(link => {
                const text = link.textContent.toLowerCase();
                const href = link.href.toLowerCase();
                
                // Ay ismi içeren linkler
                return monthNames.some(month => 
                  text.includes(month) || href.includes(month)
                ) && (text.includes('ayı') || text.includes('sorulari') || href.includes('soru'));
              })
              .map(link => ({
                month: extractMonth(link.textContent, link.href),
                url: link.href,
                text: link.textContent.trim()
              }));
          });
          
          // Year ekleme
          monthLinks.forEach(month => {
            month.year = yearData.year;
          });
          
          console.log(`   📊 Found ${monthLinks.length} month links for ${yearData.year}`);
          monthLinks.forEach(month => {
            console.log(`      ${month.month}: ${month.url}`);
          });
          
          // Hierarchy'ye ekle
          monthLinks.forEach(month => {
            if (!this.hierarchyMap[yearData.year].months[month.month]) {
              this.hierarchyMap[yearData.year].months[month.month] = {
                url: month.url,
                days: []
              };
            }
          });
          
          totalMonthLinks.push(...monthLinks);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.log(`   ❌ Error processing year ${yearData.year}: ${error.message}`);
          this.results.errors.push(`Year ${yearData.year}: ${error.message}`);
        } finally {
          await page.close();
        }
      }
      
      this.results.monthPages = totalMonthLinks.length;
      console.log(`\n✅ Level 2 completed: ${totalMonthLinks.length} total month pages`);
      return totalMonthLinks;
      
    } catch (error) {
      console.error('❌ Level 2 error:', error.message);
      this.results.errors.push(`Level 2: ${error.message}`);
      return [];
    } finally {
      await browser.close();
    }
  }

  extractMonth(text, href) {
    const monthMap = {
      'ocak': 'ocak', 'january': 'ocak',
      'şubat': 'subat', 'february': 'subat', 
      'mart': 'mart', 'march': 'mart',
      'nisan': 'nisan', 'april': 'nisan',
      'mayıs': 'mayis', 'may': 'mayis',
      'haziran': 'haziran', 'june': 'haziran',
      'temmuz': 'temmuz', 'july': 'temmuz',
      'ağustos': 'agustos', 'august': 'agustos',
      'eylül': 'eylul', 'september': 'eylul',
      'ekim': 'ekim', 'october': 'ekim',
      'kasım': 'kasim', 'november': 'kasim',
      'aralık': 'aralik', 'december': 'aralik'
    };
    
    const combined = (text + ' ' + href).toLowerCase();
    for (const [key, value] of Object.entries(monthMap)) {
      if (combined.includes(key)) return value;
    }
    return 'unknown';
  }

  async crawlLevel3_Days(monthLinks) {
    console.log('\n🎯 LEVEL 3: Discovering day pages for each month...');
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    let allDayLinks = [];
    
    try {
      // Batch'lere böl (aynı anda çok fazla sayfa açmamak için)
      const batchSize = 5;
      for (let i = 0; i < monthLinks.length; i += batchSize) {
        const batch = monthLinks.slice(i, i + batchSize);
        
        console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(monthLinks.length/batchSize)}`);
        
        const batchPromises = batch.map(async (monthData) => {
          const page = await browser.newPage();
          
          try {
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            
            console.log(`   📅 Processing ${monthData.year} ${monthData.month}...`);
            await page.goto(monthData.url, { waitUntil: 'networkidle2', timeout: 20000 });
            
                         // Gün linklerini keşfet
             const dayLinks = await page.evaluate(() => {
               function extractDay(text) {
                 const dayMatch = text.match(/\b(\d{1,2})\b/);
                 return dayMatch ? parseInt(dayMatch[1]) : 0;
               }
               
               const links = Array.from(document.querySelectorAll('a[href]'));
               return links
                 .filter(link => {
                   const text = link.textContent.trim();
                   const href = link.href;
                   
                   // Gün pattern'leri
                   return (
                     /\b([1-9]|[12][0-9]|3[01])\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)/i.test(text) ||
                     /\b([1-9]|[12][0-9]|3[01])\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i.test(text) ||
                     /e-sinav.*\d+/i.test(href) ||
                     (/\d{1,2}/.test(text) && text.length < 20 && href.includes('soru'))
                   );
                 })
                 .map(link => ({
                   day: extractDay(link.textContent),
                   url: link.href,
                   text: link.textContent.trim()
                 }));
             });
             
             // Month ve year ekleme
             dayLinks.forEach(day => {
               day.month = monthData.month;
               day.year = monthData.year;
             });
            
            console.log(`      📊 Found ${dayLinks.length} day links`);
            
            // Duplicate kontrolü
            const uniqueDayLinks = dayLinks.filter(dayLink => {
              if (this.discoveredUrls.has(dayLink.url)) {
                this.results.duplicatesSkipped++;
                return false;
              }
              this.discoveredUrls.add(dayLink.url);
              return true;
            });
            
            console.log(`      ✅ ${uniqueDayLinks.length} unique day links added`);
            
            return uniqueDayLinks;
            
          } catch (error) {
            console.log(`      ❌ Error: ${error.message}`);
            this.results.errors.push(`${monthData.year}-${monthData.month}: ${error.message}`);
            return [];
          } finally {
            await page.close();
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        const batchDayLinks = batchResults.flat();
        allDayLinks.push(...batchDayLinks);
        
        // Batch arası bekleme
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      this.results.dayPages = allDayLinks.length;
      this.results.totalUrls = this.discoveredUrls.size;
      
      console.log(`\n✅ Level 3 completed: ${allDayLinks.length} day pages discovered`);
      console.log(`📊 Total unique URLs: ${this.results.totalUrls}`);
      console.log(`🔄 Duplicates skipped: ${this.results.duplicatesSkipped}`);
      
      return allDayLinks;
      
    } catch (error) {
      console.error('❌ Level 3 error:', error.message);
      this.results.errors.push(`Level 3: ${error.message}`);
      return [];
    } finally {
      await browser.close();
    }
  }

  extractDay(text) {
    const dayMatch = text.match(/\b(\d{1,2})\b/);
    return dayMatch ? parseInt(dayMatch[1]) : 0;
  }

  async saveDiscoveryResults() {
    const timestamp = new Date().toISOString().split('T')[0];
    
    const discoveryReport = {
      summary: {
        totalUniqueUrls: this.results.totalUrls,
        yearPages: this.results.yearPages,
        monthPages: this.results.monthPages,
        dayPages: this.results.dayPages,
        duplicatesSkipped: this.results.duplicatesSkipped,
        errors: this.results.errors.length,
        discoveryTime: this.results.startTime,
        completedTime: new Date().toISOString()
      },
      allUrls: Array.from(this.discoveredUrls),
      hierarchy: this.hierarchyMap,
      errors: this.results.errors
    };
    
    await fs.writeFile(
      path.join(this.outputDir, `ultra_deep_discovery_${timestamp}.json`),
      JSON.stringify(discoveryReport, null, 2)
    );
    
    // URL listesini ayrı dosyaya kaydet
    await fs.writeFile(
      path.join(this.outputDir, `all_urls_${timestamp}.txt`),
      Array.from(this.discoveredUrls).join('\n')
    );
    
    console.log(`💾 Discovery results saved to ${this.outputDir}/`);
    return discoveryReport;
  }

  async runUltraDeepDiscovery() {
    const startTime = Date.now();
    
    try {
      console.log('🚀 STARTING ULTRA DEEP DISCOVERY...');
      console.log('⚠️  This will discover ALL possible exam URLs (2020-2025)');
      
      // Level 1: Yılları keşfet
      const yearLinks = await this.crawlLevel1_Years();
      
      if (yearLinks.length === 0) {
        throw new Error('No year links found');
      }
      
      // Level 2: Ayları keşfet
      const monthLinks = await this.crawlLevel2_Months(yearLinks);
      
      if (monthLinks.length === 0) {
        throw new Error('No month links found');
      }
      
      // Level 3: Günleri keşfet
      const dayLinks = await this.crawlLevel3_Days(monthLinks);
      
      // Sonuçları kaydet
      const report = await this.saveDiscoveryResults();
      
      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
      
      console.log('\n🎉 ULTRA DEEP DISCOVERY COMPLETED!');
      console.log('='.repeat(80));
      console.log(`⏱️  Duration: ${duration} minutes`);
      console.log(`📊 Years Processed: ${this.results.yearPages}`);
      console.log(`📊 Months Processed: ${this.results.monthPages}`);
      console.log(`📊 Days Discovered: ${this.results.dayPages}`);
      console.log(`🔗 Total Unique URLs: ${this.results.totalUrls}`);
      console.log(`🔄 Duplicates Skipped: ${this.results.duplicatesSkipped}`);
      console.log(`❌ Errors: ${this.results.errors.length}`);
      
      console.log('\n📈 ESTIMATED QUESTION EXTRACTION:');
      console.log(`   Estimated Pages: ${this.results.totalUrls}`);
      console.log(`   Estimated Questions: ${(this.results.totalUrls * 50).toLocaleString()}`);
      console.log(`   Estimated Time: ${Math.round(this.results.totalUrls * 40 / 60)} minutes`);
      console.log(`   DeepSeek Cost: $${((this.results.totalUrls * 50 * 150 / 1000) * 0.0014 * 1.3).toFixed(2)}`);
      
      console.log('='.repeat(80));
      
      return report;
      
    } catch (error) {
      console.error('❌ Ultra deep discovery error:', error.message);
      this.results.errors.push(`Main: ${error.message}`);
      return null;
    }
  }
}

async function main() {
  const crawler = new UltraDeepCrawler();
  
  try {
    await crawler.init();
    const report = await crawler.runUltraDeepDiscovery();
    
    if (report && report.summary.totalUniqueUrls > 1000) {
      console.log('\n🚀 Ready to start mass question extraction!');
      console.log('💡 Next step: Run production crawler with discovered URLs');
    }
    
  } catch (error) {
    console.error('❌ Main error:', error.message);
  }
}

if (require.main === module) {
  console.log('🕷️  Starting Ultra Deep URL Discovery...');
  console.log('🎯 Target: ALL exam pages from 2020-2025');
  main().catch(console.error);
}

module.exports = { UltraDeepCrawler }; 