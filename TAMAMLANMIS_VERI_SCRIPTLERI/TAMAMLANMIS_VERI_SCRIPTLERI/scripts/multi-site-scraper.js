const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class MultiSiteScraper {
  constructor() {
    this.browser = null;
    this.baseDir = 'multi_site_test';
    this.imageDir = path.join(this.baseDir, 'images');
    this.questionsData = [];
    this.imageCount = 0;
    this.sitesAnalyzed = [];
  }

  async init() {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(this.imageDir, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-images=false'
      ]
    });
    
    console.log('🚀 Multi-Site Scraper initialized!');
    console.log(`📁 Output directory: ${this.baseDir}`);
  }

  async analyzeSiteStructure(url) {
    console.log(`\n🔍 ANALYZING: ${url}`);
    console.log('='.repeat(80));
    
    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const analysis = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const bodyHTML = document.body.innerHTML;
        
        // Question detection patterns
        const questionPatterns = [
          { name: 'numbered_questions', pattern: /\d+\.\s+[^\.]*\?/g },
          { name: 'hash_questions', pattern: /#\w+\s+#\d+/g },
          { name: 'soru_keyword', pattern: /soru\s*\d+/gi },
          { name: 'option_patterns', pattern: /[A-D]\)\s+[^\n]+/g },
          { name: 'abcd_pattern', pattern: /A\)\s+.*B\)\s+.*C\)\s+.*D\)/gs }
        ];
        
        const patternResults = {};
        questionPatterns.forEach(p => {
          const matches = bodyText.match(p.pattern);
          patternResults[p.name] = matches ? matches.length : 0;
        });
        
        // Image analysis
        const images = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height,
          className: img.className,
          isQuestionImage: img.src.includes('soru') || img.alt.includes('soru') || 
                         img.parentElement?.innerText.includes('soru') || false
        }));
        
        // Structure analysis
        const structure = {
          title: document.title,
          url: window.location.href,
          totalImages: images.length,
          questionImages: images.filter(img => img.isQuestionImage).length,
          bodyLength: bodyText.length,
          hasQuestionStructure: bodyText.includes('A)') && bodyText.includes('B)') && bodyText.includes('C)'),
          patterns: patternResults
        };
        
        // Sample content extraction
        const potentialQuestions = [];
        
        // Try different extraction strategies
        
        // Strategy 1: Look for numbered questions
        const numberedQuestions = bodyText.match(/(\d+)\.\s+(.*?)(?=\d+\.|$)/gs);
        if (numberedQuestions) {
          numberedQuestions.slice(0, 3).forEach((match, index) => {
            const lines = match.split('\n').filter(line => line.trim());
            potentialQuestions.push({
              strategy: 'numbered',
              number: index + 1,
              content: lines.slice(0, 5).join(' ').substring(0, 200) + '...'
            });
          });
        }
        
        // Strategy 2: Look for hash-tagged questions  
        const hashQuestions = bodyText.match(/#\w+\s+#\d+\s+(.*?)(?=#\w+|$)/gs);
        if (hashQuestions) {
          hashQuestions.slice(0, 3).forEach((match, index) => {
            potentialQuestions.push({
              strategy: 'hash_tagged',
              number: index + 1,
              content: match.substring(0, 200) + '...'
            });
          });
        }
        
        // Strategy 3: Look for div-based questions
        const questionDivs = Array.from(document.querySelectorAll('div')).filter(div => {
          const text = div.innerText;
          return text && (
            text.match(/\d+\.\s/) ||
            text.includes('soru') ||
            (text.includes('A)') && text.includes('B)'))
          );
        });
        
        questionDivs.slice(0, 3).forEach((div, index) => {
          potentialQuestions.push({
            strategy: 'div_based',
            number: index + 1,
            content: div.innerText.substring(0, 200) + '...'
          });
        });
        
        return {
          ...structure,
          sampleQuestions: potentialQuestions,
          extractionStrategies: {
            numbered_found: numberedQuestions ? numberedQuestions.length : 0,
            hash_found: hashQuestions ? hashQuestions.length : 0,
            div_found: questionDivs.length
          }
        };
      });
      
      // Print analysis
      console.log(`📊 SITE ANALYSIS RESULTS:`);
      console.log(`   Title: ${analysis.title}`);
      console.log(`   Total Images: ${analysis.totalImages}`);
      console.log(`   Question Images: ${analysis.questionImages}`);
      console.log(`   Has Question Structure: ${analysis.hasQuestionStructure}`);
      console.log(`   Body Length: ${(analysis.bodyLength / 1024).toFixed(1)}KB`);
      
      console.log(`\n🎯 PATTERN DETECTION:`);
      Object.entries(analysis.patterns).forEach(([pattern, count]) => {
        console.log(`   ${pattern}: ${count} matches`);
      });
      
      console.log(`\n🔧 EXTRACTION STRATEGIES:`);
      Object.entries(analysis.extractionStrategies).forEach(([strategy, count]) => {
        console.log(`   ${strategy}: ${count} items`);
      });
      
      if (analysis.sampleQuestions.length > 0) {
        console.log(`\n📝 SAMPLE DETECTED CONTENT:`);
        analysis.sampleQuestions.forEach((sample, index) => {
          console.log(`   ${index + 1}. [${sample.strategy}] ${sample.content}`);
        });
      }
      
      this.sitesAnalyzed.push(analysis);
      return analysis;
      
    } catch (error) {
      console.error(`❌ Analysis failed for ${url}:`, error.message);
      return null;
    } finally {
      console.log('\n⏳ Page kept open for 10 seconds for manual inspection...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      await page.close();
    }
  }

  async testExtractionStrategies(url, analysis) {
    console.log(`\n⚡ TESTING EXTRACTION STRATEGIES: ${url}`);
    console.log('='.repeat(80));
    
    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const extractionResults = await page.evaluate(() => {
        const results = {
          strategies: [],
          totalExtracted: 0,
          bestStrategy: null
        };
        
        // Strategy 1: Hash-based extraction (for ehliyet-soru.com)
        const hashStrategy = () => {
          const questions = [];
          const hashMatches = document.body.innerText.match(/#\w+\s+#\d+\s+(.*?)(?=#\w+\s+#\d+|$)/gs);
          
          if (hashMatches) {
            hashMatches.forEach((match, index) => {
              const lines = match.split('\n').filter(line => line.trim());
              const questionLine = lines.find(line => line.includes('?') || line.length > 20);
              
              if (questionLine) {
                // Look for options in the match
                const optionMatches = match.match(/([A-D])\s+([^\n]*)/g);
                const options = {};
                
                if (optionMatches) {
                  optionMatches.forEach(opt => {
                    const parts = opt.match(/([A-D])\s+(.*)/);
                    if (parts) {
                      options[parts[1]] = parts[2].trim();
                    }
                  });
                }
                
                questions.push({
                  number: index + 1,
                  question: questionLine.replace(/#\w+\s+#\d+/, '').trim(),
                  options: options,
                  raw: match.substring(0, 300)
                });
              }
            });
          }
          
          return questions;
        };
        
        // Strategy 2: Sequential number extraction
        const sequentialStrategy = () => {
          const questions = [];
          const bodyText = document.body.innerText;
          
          // Look for pattern: number. question text A) option B) option etc.
          const questionPattern = /(\d+)\s*\/\s*\d+\s*(.*?)(?=\d+\s*\/\s*\d+|$)/gs;
          let match;
          
          while ((match = questionPattern.exec(bodyText)) !== null) {
            const number = match[1];
            const content = match[2];
            
            // Extract question text (before options)
            const questionMatch = content.match(/^(.*?)(?=[A-D]\s)/s);
            const questionText = questionMatch ? questionMatch[1].trim() : '';
            
            // Extract options
            const optionMatches = content.match(/([A-D])\s+([^\n]*?)(?=[A-D]\s|$)/gs);
            const options = {};
            
            if (optionMatches) {
              optionMatches.forEach(opt => {
                const parts = opt.match(/([A-D])\s+(.*)/s);
                if (parts) {
                  options[parts[1]] = parts[2].trim();
                }
              });
            }
            
            if (questionText && Object.keys(options).length >= 3) {
              questions.push({
                number: parseInt(number),
                question: questionText,
                options: options,
                raw: content.substring(0, 300)
              });
            }
          }
          
          return questions;
        };
        
        // Strategy 3: DOM-based extraction
        const domStrategy = () => {
          const questions = [];
          
          // Look for specific patterns in the DOM
          const questionElements = Array.from(document.querySelectorAll('*')).filter(el => {
            const text = el.innerText;
            return text && text.match(/\d+\s*\/\s*\d+/) && text.includes('?');
          });
          
          questionElements.forEach((el, index) => {
            const text = el.innerText;
            const numberMatch = text.match(/(\d+)\s*\/\s*\d+/);
            
            if (numberMatch) {
              questions.push({
                number: parseInt(numberMatch[1]),
                question: text.substring(0, 200) + '...',
                options: {},
                raw: text.substring(0, 300),
                element: el.tagName
              });
            }
          });
          
          return questions;
        };
        
        // Test all strategies
        const hashResults = hashStrategy();
        const sequentialResults = sequentialStrategy();
        const domResults = domStrategy();
        
        results.strategies = [
          { name: 'hash_based', count: hashResults.length, questions: hashResults.slice(0, 2) },
          { name: 'sequential', count: sequentialResults.length, questions: sequentialResults.slice(0, 2) },
          { name: 'dom_based', count: domResults.length, questions: domResults.slice(0, 2) }
        ];
        
        // Determine best strategy
        const bestStrategy = results.strategies.reduce((best, current) => 
          current.count > best.count ? current : best, results.strategies[0]);
        
        results.bestStrategy = bestStrategy.name;
        results.totalExtracted = Math.max(...results.strategies.map(s => s.count));
        
        return results;
      });
      
      console.log(`🎯 EXTRACTION TEST RESULTS:`);
      extractionResults.strategies.forEach(strategy => {
        console.log(`   ${strategy.name}: ${strategy.count} questions found`);
        
        if (strategy.questions.length > 0) {
          console.log(`     Sample questions:`);
          strategy.questions.forEach((q, i) => {
            console.log(`       ${i + 1}. Q${q.number}: ${q.question.substring(0, 80)}...`);
            if (Object.keys(q.options).length > 0) {
              console.log(`          Options: ${Object.keys(q.options).join(', ')}`);
            }
          });
        }
      });
      
      console.log(`\n🏆 BEST STRATEGY: ${extractionResults.bestStrategy} (${extractionResults.totalExtracted} questions)`);
      
      return extractionResults;
      
    } catch (error) {
      console.error(`❌ Extraction test failed:`, error.message);
      return null;
    } finally {
      await page.close();
    }
  }

  async saveAnalysisResults() {
    const timestamp = new Date().toISOString().split('T')[0];
    
    const report = {
      analysis_session: {
        completed_at: new Date().toISOString(),
        sites_analyzed: this.sitesAnalyzed.length,
        timestamp: timestamp
      },
      site_analysis: this.sitesAnalyzed.map(site => ({
        url: site.url,
        title: site.title,
        structure_quality: site.hasQuestionStructure ? 'good' : 'poor',
        total_images: site.totalImages,
        question_images: site.questionImages,
        extraction_potential: Math.max(...Object.values(site.extractionStrategies || {})),
        recommended_strategy: this.getRecommendedStrategy(site)
      })),
      summary: {
        total_sites: this.sitesAnalyzed.length,
        sites_with_good_structure: this.sitesAnalyzed.filter(s => s.hasQuestionStructure).length,
        total_images_found: this.sitesAnalyzed.reduce((sum, s) => sum + s.totalImages, 0),
        recommended_sites: this.sitesAnalyzed
          .filter(s => s.hasQuestionStructure && s.totalImages > 10)
          .map(s => s.url)
      }
    };
    
    await fs.writeFile(
      path.join(this.baseDir, `site_analysis_${timestamp}.json`),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📊 FINAL ANALYSIS REPORT:');
    console.log('='.repeat(60));
    console.log(`🎯 Sites Analyzed: ${report.summary.total_sites}`);
    console.log(`✅ Good Structure: ${report.summary.sites_with_good_structure}`);
    console.log(`🖼️ Total Images: ${report.summary.total_images_found}`);
    console.log(`🏆 Recommended Sites: ${report.summary.recommended_sites.length}`);
    
    if (report.summary.recommended_sites.length > 0) {
      console.log('\n🎯 RECOMMENDED SITES FOR SCRAPING:');
      report.summary.recommended_sites.forEach((url, index) => {
        console.log(`   ${index + 1}. ${url}`);
      });
    }
    
    return report;
  }

  getRecommendedStrategy(siteAnalysis) {
    const strategies = siteAnalysis.extractionStrategies || {};
    
    if (strategies.hash_found > 10) return 'hash_based';
    if (strategies.numbered_found > 10) return 'numbered';
    if (strategies.div_found > 10) return 'dom_based';
    
    return 'custom_needed';
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const scraper = new MultiSiteScraper();
  
  const testUrls = [
    'https://ehliyet-soru.com/test-1-haziran-2025-ehliyet-deneme-sinavi-968',
    'https://www.mebehliyetsinavsorulari.com/1-haziran-2025-ehliyet-sinav-sorulari'
  ];
  
  try {
    await scraper.init();
    
    console.log('🔍 PHASE 1: Site Structure Analysis');
    console.log('='.repeat(80));
    
    for (const url of testUrls) {
      const analysis = await scraper.analyzeSiteStructure(url);
      
      if (analysis && analysis.hasQuestionStructure) {
        console.log('🔧 PHASE 2: Testing Extraction Strategies');
        await scraper.testExtractionStrategies(url, analysis);
      }
    }
    
    console.log('\n💾 PHASE 3: Generating Analysis Report');
    const report = await scraper.saveAnalysisResults();
    
  } catch (error) {
    console.error('❌ Multi-site analysis error:', error);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MultiSiteScraper }; 