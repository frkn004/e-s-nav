const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');

class AutoLinkDiscoverer {
  constructor() {
    this.browser = null;
    this.discoveredLinks = new Set();
    this.validTestLinks = [];
    this.baseUrl = 'https://ehliyet-soru.com';
    this.startYear = 2020;
    this.currentYear = new Date().getFullYear();
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('🕵️ Auto Link Discoverer initialized!');
    console.log(`🎯 Target: ${this.baseUrl}`);
    console.log(`📅 Years: ${this.startYear}-${this.currentYear}`);
  }

  // Ana sayfa ve kategori sayfalarını tara
  async discoverFromMainPages() {
    console.log('\n🔍 Phase 1: Discovering from main pages...');
    
    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    try {
      // Ana sayfa
      console.log('📄 Scanning homepage...');
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Tüm linkleri topla
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.href)
          .filter(href => href.includes('test') || href.includes('sinav'));
      });
      
      console.log(`✅ Found ${links.length} potential test links from homepage`);
      links.forEach(link => this.discoveredLinks.add(link));
      
      // Kategori sayfaları
      const categoryPages = [
        '/kategori/trafik-sorulari',
        '/kategori/motor-sorulari', 
        '/kategori/ilk-yardim-sorulari',
        '/sinavlar',
        '/testler',
        '/deneme-sinavlari'
      ];
      
      for (let categoryPath of categoryPages) {
        try {
          console.log(`📄 Scanning: ${categoryPath}`);
          await page.goto(`${this.baseUrl}${categoryPath}`, { 
            waitUntil: 'networkidle2', 
            timeout: 15000 
          });
          
          const categoryLinks = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
              .map(a => a.href)
              .filter(href => href.includes('test') || href.includes('sinav'));
          });
          
          console.log(`  ✅ Found ${categoryLinks.length} links`);
          categoryLinks.forEach(link => this.discoveredLinks.add(link));
          
        } catch (error) {
          console.log(`  ⚠️ Category ${categoryPath} not accessible`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error in main page discovery:', error.message);
    } finally {
      await page.close();
    }
  }

  // Sitemap.xml kontrolü
  async checkSitemap() {
    console.log('\n🔍 Phase 2: Checking sitemap...');
    
    const page = await this.browser.newPage();
    
    const sitemapUrls = [
      `${this.baseUrl}/sitemap.xml`,
      `${this.baseUrl}/sitemap_index.xml`,
      `${this.baseUrl}/robots.txt`
    ];
    
    for (let sitemapUrl of sitemapUrls) {
      try {
        console.log(`📄 Checking: ${sitemapUrl}`);
        await page.goto(sitemapUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        
        const content = await page.content();
        
        if (sitemapUrl.includes('robots.txt')) {
          // robots.txt'den sitemap linklerini çıkar
          const sitemapMatches = content.match(/Sitemap:\s*(https?:\/\/[^\s]+)/gi);
          if (sitemapMatches) {
            console.log(`  📋 Found ${sitemapMatches.length} sitemap references`);
            // Bu sitemap'leri de kontrol et
          }
        } else {
          // XML sitemap'ten URL'leri çıkar
          const urlMatches = content.match(/<loc>(.*?)<\/loc>/gi);
          if (urlMatches) {
            const urls = urlMatches.map(match => 
              match.replace(/<\/?loc>/gi, '')
            ).filter(url => 
              url.includes('test') || url.includes('sinav')
            );
            
            console.log(`  ✅ Found ${urls.length} test URLs in sitemap`);
            urls.forEach(url => this.discoveredLinks.add(url));
          }
        }
        
      } catch (error) {
        console.log(`  ⚠️ ${sitemapUrl} not accessible`);
      }
    }
    
    await page.close();
  }

  // Pattern-based URL generation (2020-2024)
  async generatePatternUrls() {
    console.log('\n🔍 Phase 3: Generating pattern-based URLs...');
    
    const months = [
      'ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran',
      'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'
    ];
    
    const patterns = [
      'test-{num}-{month}-{year}-ehliyet-deneme-sinavi-{id}',
      'test-{num}-{month}-{year}-ehliyet-sinavi-{id}',
      '{month}-{year}-ehliyet-test-{num}-{id}',
      'ehliyet-sinav-{month}-{year}-test-{num}',
      'deneme-sinavi-{num}-{month}-{year}-{id}'
    ];
    
    console.log(`🎯 Generating URLs for years ${this.startYear}-${this.currentYear}`);
    
    for (let year = this.startYear; year <= this.currentYear; year++) {
      for (let month of months) {
        for (let testNum = 1; testNum <= 31; testNum++) { // Max 31 test per month
          for (let pattern of patterns) {
            // ID range: test numarasına göre tahmini ID
            const baseId = (year - 2020) * 12 * 31 + months.indexOf(month) * 31 + testNum;
            
            for (let idOffset = -2; idOffset <= 2; idOffset++) { // ±2 ID variation
              const testId = baseId + idOffset + 500; // Base offset
              
              const url = `${this.baseUrl}/${pattern}`
                .replace('{num}', testNum)
                .replace('{month}', month)
                .replace('{year}', year)
                .replace('{id}', testId);
              
              this.discoveredLinks.add(url);
            }
          }
        }
      }
    }
    
    console.log(`✅ Generated ${this.discoveredLinks.size} potential URLs`);
  }

  // URL'leri validate et (gerçek test sayfası mı kontrol et)
  async validateLinks() {
    console.log('\n🔍 Phase 4: Validating discovered links...');
    
    const linkArray = Array.from(this.discoveredLinks);
    console.log(`📊 Total links to validate: ${linkArray.length}`);
    
    // Filter obvious invalid patterns first
    const filteredLinks = linkArray.filter(link => {
      // 2020-2024 yılları arasında olmalı
      const yearMatch = link.match(/20(2[0-4])/);
      if (!yearMatch) return false;
      
      // Test pattern'i içermeli
      if (!link.includes('test') && !link.includes('sinav')) return false;
      
      // Gerçek domain olmalı
      if (!link.startsWith(this.baseUrl)) return false;
      
      return true;
    });
    
    console.log(`📋 Filtered to ${filteredLinks.length} potential valid links`);
    
    // Batch validation (10'ar URL test et)
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < filteredLinks.length; i += batchSize) {
      batches.push(filteredLinks.slice(i, i + batchSize));
    }
    
    console.log(`📦 Processing ${batches.length} validation batches...`);
    
    for (let batchIndex = 0; batchIndex < Math.min(batches.length, 50); batchIndex++) { // Max 500 URL test
      const batch = batches[batchIndex];
      console.log(`\n📦 Batch ${batchIndex + 1}/${Math.min(batches.length, 50)}`);
      
      const validationPromises = batch.map(url => this.validateSingleUrl(url));
      const results = await Promise.allSettled(validationPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          this.validTestLinks.push(result.value);
          console.log(`  ✅ Valid: ${batch[index]}`);
        }
      });
      
      console.log(`📊 Progress: ${this.validTestLinks.length} valid URLs found so far`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async validateSingleUrl(url) {
    const page = await this.browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 10000 
      });
      
      // 200 status ve ehliyet içeriği kontrolü
      if (!response || response.status() !== 200) {
        return null;
      }
      
      const pageContent = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        const hasQuestions = bodyText.includes('#trafik') || 
                          bodyText.includes('#motor') ||
                          bodyText.includes('soru') ||
                          bodyText.includes('a)') ||
                          bodyText.includes('b)');
        
        const questionCount = (bodyText.match(/#\w+\s*#\d+/g) || []).length;
        
        return {
          hasQuestions,
          questionCount,
          title: document.title,
          bodyLength: bodyText.length
        };
      });
      
      // Geçerli test sayfası kriterleri
      if (pageContent.hasQuestions && 
          pageContent.questionCount >= 40 && // En az 40 soru (50'ye yakın)
          pageContent.bodyLength > 5000) { // Yeterli içerik
        
        return {
          url,
          questionCount: pageContent.questionCount,
          title: pageContent.title,
          validatedAt: new Date().toISOString()
        };
      }
      
      return null;
      
    } catch (error) {
      return null;
    } finally {
      await page.close();
    }
  }

  async saveResults() {
    console.log('\n💾 Saving discovery results...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    const outputDir = 'discovered_links';
    
    await fs.mkdir(outputDir, { recursive: true });
    
    // Valid test links
    await fs.writeFile(
      path.join(outputDir, `valid_test_links_${timestamp}.json`),
      JSON.stringify(this.validTestLinks, null, 2)
    );
    
    // Just URLs for processing
    const urlList = this.validTestLinks.map(link => link.url);
    await fs.writeFile(
      path.join(outputDir, `urls_for_scraping_${timestamp}.txt`),
      urlList.join('\n')
    );
    
    // Summary report
    const summary = {
      discovery_session: {
        started_at: new Date().toISOString(),
        target_website: this.baseUrl,
        year_range: `${this.startYear}-${this.currentYear}`
      },
      statistics: {
        total_discovered_links: this.discoveredLinks.size,
        valid_test_links: this.validTestLinks.length,
        estimated_questions: this.validTestLinks.length * 50, // 50 soru per test
        success_rate: `${(this.validTestLinks.length / Math.min(this.discoveredLinks.size, 500) * 100).toFixed(1)}%`
      },
      breakdown_by_year: this.getYearlyBreakdown(),
      top_question_counts: this.validTestLinks
        .sort((a, b) => b.questionCount - a.questionCount)
        .slice(0, 10)
        .map(link => ({
          url: link.url,
          questions: link.questionCount,
          title: link.title?.substring(0, 100)
        })),
      files_generated: [
        `valid_test_links_${timestamp}.json`,
        `urls_for_scraping_${timestamp}.txt`,
        `discovery_summary_${timestamp}.json`
      ]
    };
    
    await fs.writeFile(
      path.join(outputDir, `discovery_summary_${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('✅ Results saved to:', outputDir);
    return summary;
  }

  getYearlyBreakdown() {
    const breakdown = {};
    
    this.validTestLinks.forEach(link => {
      const yearMatch = link.url.match(/20(2[0-4])/);
      if (yearMatch) {
        const year = '20' + yearMatch[1];
        breakdown[year] = (breakdown[year] || 0) + 1;
      }
    });
    
    return breakdown;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printSummary(summary) {
    console.log('\n🎉 AUTO LINK DISCOVERY COMPLETED!');
    console.log('='.repeat(60));
    console.log(`🌐 Target Website: ${summary.discovery_session.target_website}`);
    console.log(`📅 Year Range: ${summary.discovery_session.year_range}`);
    console.log(`🔗 Valid Test Links: ${summary.statistics.valid_test_links}`);
    console.log(`📝 Estimated Questions: ${summary.statistics.estimated_questions} (50 per test)`);
    console.log(`✅ Success Rate: ${summary.statistics.success_rate}`);
    
    console.log('\n📊 Breakdown by Year:');
    Object.entries(summary.breakdown_by_year)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([year, count]) => {
        console.log(`   ${year}: ${count} tests (≈${count * 50} questions)`);
      });
    
    console.log('\n📁 Generated Files:');
    summary.files_generated.forEach(file => {
      console.log(`   - discovered_links/${file}`);
    });
    
    console.log('\n🚀 Next Step:');
    console.log(`   node scripts/url-processor.js file discovered_links/urls_for_scraping_${new Date().toISOString().split('T')[0]}.txt`);
    console.log('='.repeat(60));
  }
}

async function main() {
  const discoverer = new AutoLinkDiscoverer();
  
  try {
    await discoverer.init();
    
    await discoverer.discoverFromMainPages();
    await discoverer.checkSitemap();
    await discoverer.generatePatternUrls();
    await discoverer.validateLinks();
    
    const summary = await discoverer.saveResults();
    discoverer.printSummary(summary);
    
  } catch (error) {
    console.error('❌ Discovery error:', error);
  } finally {
    await discoverer.close();
  }
}

module.exports = { AutoLinkDiscoverer };

if (require.main === module) {
  main().catch(console.error);
} 