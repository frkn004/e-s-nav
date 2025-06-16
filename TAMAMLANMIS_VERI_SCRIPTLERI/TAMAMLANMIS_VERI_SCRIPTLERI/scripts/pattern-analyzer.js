const puppeteer = require('puppeteer');
const fs = require('fs').promises;

class PatternAnalyzer {
  constructor() {
    this.browser = null;
    this.realLinks = [];
    this.baseUrl = 'https://ehliyet-soru.com';
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('🧠 Pattern Analyzer initialized!');
  }

  async collectRealLinks() {
    console.log('🔍 Collecting real test links from website...');
    
    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    try {
      // Ana sayfa analiz
      console.log('📄 Scanning homepage for test links...');
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const homeLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({
            href: a.href,
            text: a.innerText.trim(),
            title: a.title || ''
          }))
          .filter(link => 
            (link.href.includes('test') || link.href.includes('sinav')) &&
            link.href.startsWith('https://ehliyet-soru.com/')
          );
      });
      
      console.log(`✅ Found ${homeLinks.length} test links from homepage`);
      this.realLinks.push(...homeLinks);
      
      // Sitemap analiz
      try {
        console.log('📄 Checking sitemap...');
        await page.goto(`${this.baseUrl}/sitemap.xml`, { waitUntil: 'networkidle2', timeout: 15000 });
        
        const sitemapContent = await page.content();
        const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/gi);
        
        if (urlMatches) {
          const sitemapLinks = urlMatches
            .map(match => match.replace(/<\/?loc>/gi, ''))
            .filter(url => url.includes('test') || url.includes('sinav'))
            .map(url => ({
              href: url,
              text: 'From sitemap',
              title: ''
            }));
          
          console.log(`✅ Found ${sitemapLinks.length} test links from sitemap`);
          this.realLinks.push(...sitemapLinks);
        }
      } catch (error) {
        console.log('⚠️ Sitemap not accessible');
      }
      
      // Test birkaç genel sayfa pattern'i
      const testPaths = [
        '/sinavlar',
        '/testler', 
        '/deneme-sinavlari',
        '/ehliyet-sinavlari',
        '/kategori/trafik',
        '/kategori/motor'
      ];
      
      for (let testPath of testPaths) {
        try {
          console.log(`📄 Checking: ${testPath}`);
          await page.goto(`${this.baseUrl}${testPath}`, { waitUntil: 'networkidle2', timeout: 10000 });
          
          const pathLinks = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
              .map(a => ({
                href: a.href,
                text: a.innerText.trim(),
                title: a.title || ''
              }))
              .filter(link => 
                (link.href.includes('test') || link.href.includes('sinav')) &&
                link.href.startsWith('https://ehliyet-soru.com/')
              );
          });
          
          console.log(`  ✅ Found ${pathLinks.length} additional links`);
          this.realLinks.push(...pathLinks);
          
        } catch (error) {
          console.log(`  ⚠️ ${testPath} not accessible`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error collecting links:', error.message);
    } finally {
      await page.close();
    }
    
    // Remove duplicates
    const uniqueLinks = [];
    const seenUrls = new Set();
    
    this.realLinks.forEach(link => {
      if (!seenUrls.has(link.href)) {
        seenUrls.add(link.href);
        uniqueLinks.push(link);
      }
    });
    
    this.realLinks = uniqueLinks;
    console.log(`\n📊 Total unique test links found: ${this.realLinks.length}`);
  }

  analyzePatterns() {
    console.log('\n🧠 Analyzing URL patterns...');
    
    if (this.realLinks.length === 0) {
      console.log('❌ No links to analyze');
      return null;
    }
    
    // URL'leri analiz et
    const patterns = {
      byYear: {},
      byMonth: {},
      commonPrefixes: {},
      commonSuffixes: {},
      numberRanges: {
        min: 9999,
        max: 0,
        found: []
      }
    };
    
    console.log('\n📋 Found Test Links:');
    this.realLinks.forEach((link, index) => {
      console.log(`${index + 1}. ${link.href}`);
      if (link.text && link.text !== 'From sitemap') {
        console.log(`   Text: "${link.text}"`);
      }
      
      // Pattern analizi
      const url = link.href;
      
      // Yıl analizi (2020-2025)
      const yearMatch = url.match(/20(2[0-5])/);
      if (yearMatch) {
        const year = '20' + yearMatch[1];
        patterns.byYear[year] = (patterns.byYear[year] || 0) + 1;
      }
      
      // Ay analizi
      const months = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 
                     'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
      months.forEach(month => {
        if (url.includes(month)) {
          patterns.byMonth[month] = (patterns.byMonth[month] || 0) + 1;
        }
      });
      
      // Sayı analizi
      const numbers = url.match(/\d+/g);
      if (numbers) {
        numbers.forEach(num => {
          const n = parseInt(num);
          if (n > 0 && n < 10000) { // Reasonable range
            patterns.numberRanges.found.push(n);
            patterns.numberRanges.min = Math.min(patterns.numberRanges.min, n);
            patterns.numberRanges.max = Math.max(patterns.numberRanges.max, n);
          }
        });
      }
      
      // Prefix/suffix analizi
      const pathPart = url.replace(this.baseUrl, '');
      const prefix = pathPart.split('-')[0];
      const suffix = pathPart.split('-').pop();
      
      if (prefix) {
        patterns.commonPrefixes[prefix] = (patterns.commonPrefixes[prefix] || 0) + 1;
      }
      if (suffix && suffix !== prefix) {
        patterns.commonSuffixes[suffix] = (patterns.commonSuffixes[suffix] || 0) + 1;
      }
    });
    
    console.log('\n📊 Pattern Analysis Results:');
    console.log('='.repeat(50));
    
    // Yıl dağılımı
    if (Object.keys(patterns.byYear).length > 0) {
      console.log('\n📅 Year Distribution:');
      Object.entries(patterns.byYear)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([year, count]) => {
          console.log(`   ${year}: ${count} tests`);
        });
    }
    
    // Ay dağılımı
    if (Object.keys(patterns.byMonth).length > 0) {
      console.log('\n🗓️ Month Distribution:');
      Object.entries(patterns.byMonth)
        .sort(([,a], [,b]) => b - a)
        .forEach(([month, count]) => {
          console.log(`   ${month}: ${count} tests`);
        });
    }
    
    // Sayı aralıkları
    if (patterns.numberRanges.found.length > 0) {
      console.log('\n🔢 Number Ranges:');
      console.log(`   Min: ${patterns.numberRanges.min}`);
      console.log(`   Max: ${patterns.numberRanges.max}`);
      console.log(`   Unique numbers: ${[...new Set(patterns.numberRanges.found)].length}`);
    }
    
    // En yaygın prefix'ler
    console.log('\n🔤 Common Prefixes:');
    Object.entries(patterns.commonPrefixes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([prefix, count]) => {
        console.log(`   "${prefix}": ${count} times`);
      });
    
    return patterns;
  }

  generateSmartPatterns(analysis) {
    console.log('\n🎯 Generating smart URL patterns based on analysis...');
    
    if (!analysis || this.realLinks.length === 0) {
      console.log('❌ No analysis data available');
      return [];
    }
    
    // Gerçek linklerden pattern çıkar
    const smartPatterns = [];
    
    this.realLinks.forEach(link => {
      const url = link.href.replace(this.baseUrl + '/', '');
      
      // Yıl ve sayıları değişken yap
      let pattern = url
        .replace(/20(2[0-5])/g, '{year}')  // Yıl
        .replace(/\d{3,4}/g, '{id}')       // 3-4 haneli ID'ler
        .replace(/\d{1,2}/g, '{num}');     // 1-2 haneli sayılar
      
      // Ay isimlerini değişken yap
      const months = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 
                     'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
      months.forEach(month => {
        pattern = pattern.replace(new RegExp(month, 'g'), '{month}');
      });
      
      smartPatterns.push(pattern);
    });
    
    // Unique pattern'leri al
    const uniquePatterns = [...new Set(smartPatterns)];
    
    console.log('\n🎯 Smart Patterns Generated:');
    uniquePatterns.forEach((pattern, index) => {
      console.log(`${index + 1}. ${this.baseUrl}/${pattern}`);
    });
    
    return uniquePatterns;
  }

  async testPatternsWithSamples(patterns) {
    console.log('\n🧪 Testing patterns with sample data...');
    
    if (patterns.length === 0) {
      console.log('❌ No patterns to test');
      return [];
    }
    
    const months = ['mayis', 'nisan', 'mart', 'subat'];
    const years = [2024, 2025];
    const testNumbers = [1, 2, 3, 5, 10];
    const testIds = [900, 910, 920, 930, 937, 938, 939, 940, 941];
    
    const workingPatterns = [];
    
    for (let pattern of patterns.slice(0, 3)) { // Test first 3 patterns
      console.log(`\n🔍 Testing pattern: ${pattern}`);
      
      let foundWorking = false;
      
      for (let year of years) {
        for (let month of months) {
          for (let num of testNumbers) {
            for (let id of testIds) {
              const testUrl = this.baseUrl + '/' + pattern
                .replace('{year}', year)
                .replace('{month}', month)
                .replace('{num}', num)
                .replace('{id}', id);
              
              const isValid = await this.quickValidateUrl(testUrl);
              
              if (isValid) {
                console.log(`  ✅ Working: ${testUrl}`);
                if (!workingPatterns.includes(pattern)) {
                  workingPatterns.push(pattern);
                  foundWorking = true;
                }
                break; // Found one working, move to next pattern
              }
            }
            if (foundWorking) break;
          }
          if (foundWorking) break;
        }
        if (foundWorking) break;
      }
      
      if (!foundWorking) {
        console.log(`  ❌ Pattern not working: ${pattern}`);
      }
    }
    
    return workingPatterns;
  }

  async quickValidateUrl(url) {
    const page = await this.browser.newPage();
    
    try {
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 8000 
      });
      
      if (!response || response.status() !== 200) {
        return false;
      }
      
      const hasQuestions = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        return bodyText.includes('#trafik') || 
               bodyText.includes('#motor') ||
               bodyText.includes('soru');
      });
      
      return hasQuestions;
      
    } catch (error) {
      return false;
    } finally {
      await page.close();
    }
  }

  async saveResults(patterns, workingPatterns) {
    console.log('\n💾 Saving pattern analysis results...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    const results = {
      analysis_date: new Date().toISOString(),
      real_links_found: this.realLinks.length,
      discovered_links: this.realLinks,
      all_patterns: patterns,
      working_patterns: workingPatterns,
      recommended_action: workingPatterns.length > 0 ? 
        'Use working patterns for bulk scraping' : 
        'Manual link collection recommended'
    };
    
    await fs.writeFile(
      `pattern_analysis_${timestamp}.json`,
      JSON.stringify(results, null, 2)
    );
    
    // Working pattern'leri URL generator için kaydet
    if (workingPatterns.length > 0) {
      await fs.writeFile(
        `working_patterns_${timestamp}.txt`,
        workingPatterns.join('\n')
      );
    }
    
    console.log(`✅ Results saved to pattern_analysis_${timestamp}.json`);
    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printSummary(results) {
    console.log('\n🎉 PATTERN ANALYSIS COMPLETED!');
    console.log('='.repeat(60));
    console.log(`🔗 Real Links Found: ${results.real_links_found}`);
    console.log(`🎯 Working Patterns: ${results.working_patterns.length}`);
    console.log(`💡 Recommendation: ${results.recommended_action}`);
    
    if (results.working_patterns.length > 0) {
      console.log('\n✅ Working Patterns:');
      results.working_patterns.forEach((pattern, index) => {
        console.log(`   ${index + 1}. ${this.baseUrl}/${pattern}`);
      });
      
      console.log('\n🚀 Next Steps:');
      console.log('1. Use these patterns to generate 2020-2025 URLs');
      console.log('2. Run bulk scraping with generated URLs');
      console.log('3. Expect ~1000-5000 valid test pages');
    } else {
      console.log('\n📋 Available Real Links:');
      results.discovered_links.slice(0, 10).forEach((link, index) => {
        console.log(`   ${index + 1}. ${link.href}`);
      });
      
      if (results.discovered_links.length > 10) {
        console.log(`   ... and ${results.discovered_links.length - 10} more`);
      }
    }
    console.log('='.repeat(60));
  }
}

async function main() {
  const analyzer = new PatternAnalyzer();
  
  try {
    await analyzer.init();
    
    await analyzer.collectRealLinks();
    const analysis = analyzer.analyzePatterns();
    const smartPatterns = analyzer.generateSmartPatterns(analysis);
    const workingPatterns = await analyzer.testPatternsWithSamples(smartPatterns);
    
    const results = await analyzer.saveResults(analysis, workingPatterns);
    analyzer.printSummary(results);
    
  } catch (error) {
    console.error('❌ Pattern analysis error:', error);
  } finally {
    await analyzer.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
} 