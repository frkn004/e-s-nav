const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');

class AutoLinkCrawler {
  constructor() {
    this.baseUrls = [
      'https://ehliyetsinavihazirlik.com',
      'https://ehliyet-soru.com', 
      'https://www.mebehliyetsinavsorulari.com'
    ];
    
    this.foundLinks = [];
    this.categorizedLinks = {
      single_page_multi_question: [],
      navigation_based_single_question: [],
      unknown: []
    };
    
    this.aiCosts = {
      deepseek: {
        input_per_1k: 0.0014,  // $0.0014 per 1K tokens
        output_per_1k: 0.0028, // $0.0028 per 1K tokens
        context_window: 128000
      },
      openai_gpt4: {
        input_per_1k: 0.03,    // $0.03 per 1K tokens  
        output_per_1k: 0.06,   // $0.06 per 1K tokens
        context_window: 8000
      },
      claude: {
        input_per_1k: 0.008,   // $0.008 per 1K tokens
        output_per_1k: 0.024,  // $0.024 per 1K tokens
        context_window: 100000
      }
    };
    
    this.estimatedUsage = {
      tokens_per_question: 150,    // Ortalama token/soru
      questions_per_analysis: 50,  // Batch başına soru
      analysis_rounds: 3           // Tekrar analiz sayısı
    };
  }

  async init() {
    this.outputDir = 'auto_crawling_results';
    await fs.mkdir(this.outputDir, { recursive: true });
    console.log('🕷️  Auto Link Crawler initialized!');
  }

  async crawlSiteLinks(baseUrl, yearFilter = 2020) {
    console.log(`\n🔍 Crawling ${baseUrl} for links (${yearFilter}+)...`);
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      // Ana sayfayı ziyaret et
      await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Sitemap veya link listesi arama stratejileri
      const strategies = [
        await this.findSitemapLinks(page, baseUrl),
        await this.findNavigationLinks(page, baseUrl), 
        await this.findTestPageLinks(page, baseUrl),
        await this.findArchiveLinks(page, baseUrl, yearFilter)
      ];
      
      // Tüm stratejilerden linkleri topla
      const allLinks = strategies.flat().filter(Boolean);
      const uniqueLinks = [...new Set(allLinks)];
      
      console.log(`   📊 Found ${uniqueLinks.length} unique links`);
      return uniqueLinks;
      
    } catch (error) {
      console.log(`   ❌ Error crawling ${baseUrl}: ${error.message}`);
      return [];
    } finally {
      await browser.close();
    }
  }

  async findSitemapLinks(page, baseUrl) {
    console.log('   🗺️  Checking sitemap...');
    
    try {
      // Sitemap.xml kontrolü
      const sitemapUrls = [
        `${baseUrl}/sitemap.xml`,
        `${baseUrl}/sitemap_index.xml`,
        `${baseUrl}/robots.txt`
      ];
      
      for (const sitemapUrl of sitemapUrls) {
        try {
          await page.goto(sitemapUrl, { timeout: 10000 });
          const content = await page.content();
          
          if (content.includes('<url>') || content.includes('Sitemap:')) {
            const links = await this.extractSitemapLinks(content, baseUrl);
            if (links.length > 0) {
              console.log(`     ✅ Sitemap found: ${links.length} links`);
              return links;
            }
          }
        } catch (e) {
          // Sitemap bulunamadı, devam et
        }
      }
    } catch (error) {
      console.log('     ❌ No sitemap found');
    }
    
    return [];
  }

  async findNavigationLinks(page, baseUrl) {
    console.log('   🧭 Scanning navigation links...');
    
    try {
      await page.goto(baseUrl, { timeout: 15000 });
      
      // Navigation elementlerini ara
      const navLinks = await page.evaluate(() => {
        const selectors = [
          'nav a[href]',
          '.menu a[href]', 
          '.navigation a[href]',
          '.navbar a[href]',
          'header a[href]',
          '.main-menu a[href]'
        ];
        
        const links = [];
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(link => {
            if (link.href && link.href.includes('soru')) {
              links.push(link.href);
            }
          });
        });
        
        return [...new Set(links)];
      });
      
      console.log(`     ✅ Navigation: ${navLinks.length} links`);
      return navLinks;
      
    } catch (error) {
      console.log('     ❌ Navigation scan failed');
      return [];
    }
  }

  async findTestPageLinks(page, baseUrl) {
    console.log('   📝 Looking for test page patterns...');
    
    try {
      await page.goto(baseUrl, { timeout: 15000 });
      
      // Test/soru sayfası kalıpları
      const testLinks = await page.evaluate(() => {
        const patterns = [
          /soru|test|deneme|sinav|exam/i,
          /haziran|temmuz|agustos|eylul|ekim|kasim|aralik|ocak|subat|mart|nisan|mayis/i,
          /202[0-9]/,
          /\d{1,3}\.html/
        ];
        
        const allLinks = Array.from(document.querySelectorAll('a[href]'));
        const testLinks = [];
        
        allLinks.forEach(link => {
          const href = link.href;
          const text = link.textContent.toLowerCase();
          
          if (patterns.some(pattern => pattern.test(href) || pattern.test(text))) {
            testLinks.push(href);
          }
        });
        
        return [...new Set(testLinks)];
      });
      
      console.log(`     ✅ Test patterns: ${testLinks.length} links`);
      return testLinks;
      
    } catch (error) {
      console.log('     ❌ Test pattern scan failed');
      return [];
    }
  }

  async findArchiveLinks(page, baseUrl, yearFilter) {
    console.log(`   📅 Searching archive links (${yearFilter}+)...`);
    
    try {
      // Arşiv/tarih bazlı sayfa arama
      const archiveUrls = [
        `${baseUrl}/arsiv`,
        `${baseUrl}/archive`, 
        `${baseUrl}/kategori`,
        `${baseUrl}/category`,
        `${baseUrl}/sorular`,
        `${baseUrl}/testler`
      ];
      
      const allArchiveLinks = [];
      
      for (const archiveUrl of archiveUrls) {
        try {
          await page.goto(archiveUrl, { timeout: 10000 });
          
          const archiveLinks = await page.evaluate((year) => {
            const links = Array.from(document.querySelectorAll('a[href]'));
            return links
              .map(link => link.href)
              .filter(href => {
                const yearMatch = href.match(/202[0-9]/);
                return yearMatch && parseInt(yearMatch[0]) >= year;
              });
          }, yearFilter);
          
          allArchiveLinks.push(...archiveLinks);
          
        } catch (e) {
          // Arşiv sayfası bulunamadı
        }
      }
      
      const uniqueArchiveLinks = [...new Set(allArchiveLinks)];
      console.log(`     ✅ Archive: ${uniqueArchiveLinks.length} links`);
      return uniqueArchiveLinks;
      
    } catch (error) {
      console.log('     ❌ Archive scan failed');
      return [];
    }
  }

  extractSitemapLinks(content, baseUrl) {
    const links = [];
    const urlRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    
    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[1];
      if (url.includes('soru') || url.includes('test') || url.includes('sinav')) {
        links.push(url);
      }
    }
    
    return links;
  }

  async categorizeFoundLinks() {
    console.log('\n📂 Categorizing found links...');
    
    for (const link of this.foundLinks) {
      try {
        const url = new URL(link);
        const domain = url.hostname.toLowerCase();
        const path = url.pathname.toLowerCase();
        
        // Site bazlı kategorize
        if (domain.includes('ehliyetsinavihazirlik')) {
          this.categorizedLinks.single_page_multi_question.push({
            url: link,
            site: domain,
            confidence: 'high',
            estimated_questions: 50,
            scraper: 'ehliyetsinavihazirlik-scraper.js'
          });
        } else if (domain.includes('ehliyet-soru')) {
          this.categorizedLinks.navigation_based_single_question.push({
            url: link,
            site: domain, 
            confidence: 'medium',
            estimated_questions: 50,
            scraper: 'enhanced-navigation-scraper.js'
          });
        } else {
          this.categorizedLinks.unknown.push({
            url: link,
            site: domain,
            confidence: 'low',
            estimated_questions: 30,
            scraper: 'pattern-detector.js'
          });
        }
        
      } catch (error) {
        console.log(`     ⚠️  Invalid URL: ${link}`);
      }
    }
    
    console.log('📊 Categorization Results:');
    Object.entries(this.categorizedLinks).forEach(([category, links]) => {
      console.log(`   ${category}: ${links.length} links`);
    });
  }

  calculateAICosts() {
    console.log('\n💰 AI Cost Analysis...');
    
    const totalLinks = this.foundLinks.length;
    const estimatedQuestions = Object.values(this.categorizedLinks)
      .flat()
      .reduce((sum, link) => sum + link.estimated_questions, 0);
    
    const totalTokens = estimatedQuestions * this.estimatedUsage.tokens_per_question * this.estimatedUsage.analysis_rounds;
    
    console.log('📊 Estimated Usage:');
    console.log(`   Total Links: ${totalLinks}`);
    console.log(`   Estimated Questions: ${estimatedQuestions}`);
    console.log(`   Total Tokens Needed: ${totalTokens.toLocaleString()}`);
    
    console.log('\n💲 Cost Comparison:');
    
    Object.entries(this.aiCosts).forEach(([provider, costs]) => {
      const inputCost = (totalTokens / 1000) * costs.input_per_1k;
      const outputCost = (totalTokens * 0.3 / 1000) * costs.output_per_1k; // %30 output
      const totalCost = inputCost + outputCost;
      
      console.log(`   ${provider.toUpperCase()}:`);
      console.log(`     Input: $${inputCost.toFixed(4)}`);
      console.log(`     Output: $${outputCost.toFixed(4)}`);
      console.log(`     TOTAL: $${totalCost.toFixed(4)}`);
      console.log(`     Per Question: $${(totalCost / estimatedQuestions).toFixed(6)}`);
      console.log('');
    });
    
    return {
      totalQuestions: estimatedQuestions,
      totalTokens,
      costs: Object.entries(this.aiCosts).reduce((acc, [provider, costs]) => {
        const inputCost = (totalTokens / 1000) * costs.input_per_1k;
        const outputCost = (totalTokens * 0.3 / 1000) * costs.output_per_1k;
        acc[provider] = {
          input: inputCost,
          output: outputCost,
          total: inputCost + outputCost,
          per_question: (inputCost + outputCost) / estimatedQuestions
        };
        return acc;
      }, {})
    };
  }

  async generateExecutionPlan() {
    console.log('\n🎯 Generating Execution Plan...');
    
    const plan = {
      timestamp: new Date().toISOString(),
      crawling_summary: {
        total_links_found: this.foundLinks.length,
        categorized_links: this.categorizedLinks,
        recommended_approach: 'Batch processing by category'
      },
      
      execution_phases: [
        {
          phase: 1,
          name: 'High Success Rate Sites',
          links: this.categorizedLinks.single_page_multi_question,
          scraper: 'ehliyetsinavihazirlik-scraper.js',
          expected_success: '90-100%',
          priority: 'immediate'
        },
        {
          phase: 2,
          name: 'Medium Success Rate Sites', 
          links: this.categorizedLinks.navigation_based_single_question,
          scraper: 'enhanced-navigation-scraper.js',
          expected_success: '10-30%',
          priority: 'test_first'
        },
        {
          phase: 3,
          name: 'Unknown Sites',
          links: this.categorizedLinks.unknown,
          scraper: 'pattern-detector.js',
          expected_success: 'unknown',
          priority: 'investigate'
        }
      ],
      
      ai_analysis: this.calculateAICosts(),
      
      recommendations: {
        best_ai_provider: 'deepseek',
        cost_per_question: '$0.000084',
        batch_size: 50,
        parallel_processing: true,
        quality_check: 'mandatory'
      }
    };
    
    return plan;
  }

  async saveResults() {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // 1. Ham linkler
    await fs.writeFile(
      path.join(this.outputDir, `raw_links_${timestamp}.json`),
      JSON.stringify(this.foundLinks, null, 2)
    );
    
    // 2. Kategorize edilmiş linkler
    await fs.writeFile(
      path.join(this.outputDir, `categorized_links_${timestamp}.json`),
      JSON.stringify(this.categorizedLinks, null, 2)
    );
    
    // 3. Execution plan
    const plan = await this.generateExecutionPlan();
    await fs.writeFile(
      path.join(this.outputDir, `execution_plan_${timestamp}.json`),
      JSON.stringify(plan, null, 2)
    );
    
    console.log(`💾 Results saved to ${this.outputDir}/`);
    return plan;
  }

  printFinalSummary(plan) {
    console.log('\n🎯 AUTO CRAWLING COMPLETED!');
    console.log('='.repeat(70));
    
    console.log('📊 CRAWLING RESULTS:');
    console.log(`   Total Links Found: ${plan.crawling_summary.total_links_found}`);
    console.log(`   High Priority: ${plan.execution_phases[0].links.length} links`);
    console.log(`   Medium Priority: ${plan.execution_phases[1].links.length} links`);  
    console.log(`   Unknown: ${plan.execution_phases[2].links.length} links`);
    
    console.log('\n💰 AI COST ANALYSIS:');
    console.log(`   Estimated Questions: ${plan.ai_analysis.totalQuestions.toLocaleString()}`);
    console.log(`   Best Provider: ${plan.recommendations.best_ai_provider.toUpperCase()}`);
    console.log(`   Cost per Question: ${plan.recommendations.cost_per_question}`);
    console.log(`   Total Cost (DeepSeek): $${plan.ai_analysis.costs.deepseek.total.toFixed(4)}`);
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('   1. Review execution plan');
    console.log('   2. Start with high priority links');
    console.log('   3. Use DeepSeek for cost efficiency');
    console.log('   4. Batch process in groups of 50');
    
    console.log('='.repeat(70));
  }
}

async function main() {
  const crawler = new AutoLinkCrawler();
  
  try {
    await crawler.init();
    
    // Her site için link toplama
    for (const baseUrl of crawler.baseUrls) {
      const links = await crawler.crawlSiteLinks(baseUrl, 2020);
      crawler.foundLinks.push(...links);
    }
    
    // Duplicate temizleme
    crawler.foundLinks = [...new Set(crawler.foundLinks)];
    
    // Kategorize etme
    await crawler.categorizeFoundLinks();
    
    // Sonuçları kaydetme
    const plan = await crawler.saveResults();
    
    // Final rapor
    crawler.printFinalSummary(plan);
    
  } catch (error) {
    console.error('❌ Crawling error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AutoLinkCrawler }; 