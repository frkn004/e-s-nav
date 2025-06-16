const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class NavigationScraper {
  constructor() {
    this.browser = null;
    this.baseDir = 'navigation_scraper_test';
    this.imageDir = path.join(this.baseDir, 'images');
    this.questionsData = [];
    this.imageCount = 0;
    this.currentQuestionNumber = 1;
    this.maxQuestions = 50;
  }

  async init() {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(this.imageDir, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: false, // Daha hızlı olsun
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-images=false'
      ]
    });
    
    console.log('🧭 Navigation Scraper initialized!');
    console.log(`📁 Output directory: ${this.baseDir}`);
    console.log(`🎯 Target: ${this.maxQuestions} questions`);
  }

  async scrapeWithNavigation(startUrl) {
    console.log(`\n🚀 NAVIGATION SCRAPING: ${startUrl}`);
    console.log('='.repeat(80));
    
    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    try {
      await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('🔍 Analyzing navigation structure...');
      
      // Check current page structure first
      const initialAnalysis = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        
        // Look for navigation elements
        const nextButtons = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.innerText?.toLowerCase() || '';
          const classList = Array.from(el.classList || []).join(' ').toLowerCase();
          return text.includes('sonraki') || 
                 text.includes('next') || 
                 text.includes('ileri') ||
                 text.includes('→') ||
                 classList.includes('next') ||
                 classList.includes('forward');
        });
        
        // Look for question indicators
        const questionIndicators = [
          bodyText.match(/(\d+)\s*\/\s*(\d+)/), // "1 / 50" format
          bodyText.match(/soru\s*(\d+)/i),       // "Soru 1" format
          bodyText.match(/#(\d+)/),              // "#1" format
        ].filter(Boolean);
        
        // Look for current question content
        const hasQuestion = bodyText.includes('?') || 
                          bodyText.includes('aşağıdaki') ||
                          bodyText.includes('hangisi');
        
        const hasOptions = bodyText.includes('A)') && 
                         bodyText.includes('B)') && 
                         bodyText.includes('C)');
        
        return {
          hasNavigation: nextButtons.length > 0,
          navigationElements: nextButtons.length,
          questionIndicators: questionIndicators,
          hasQuestion: hasQuestion,
          hasOptions: hasOptions,
          bodyLength: bodyText.length,
          sampleText: bodyText.substring(0, 500)
        };
      });
      
      console.log('📊 INITIAL PAGE ANALYSIS:');
      console.log(`   Navigation elements: ${initialAnalysis.navigationElements}`);
      console.log(`   Has question: ${initialAnalysis.hasQuestion}`);
      console.log(`   Has options: ${initialAnalysis.hasOptions}`);
      console.log(`   Question indicators: ${initialAnalysis.questionIndicators.length}`);
      
      if (initialAnalysis.questionIndicators.length > 0) {
        console.log(`   Detected: ${JSON.stringify(initialAnalysis.questionIndicators[0])}`);
      }
      
      console.log(`\n📄 Sample content: ${initialAnalysis.sampleText.substring(0, 200)}...`);
      
      // Start scraping questions if structure looks good
      if (initialAnalysis.hasQuestion && initialAnalysis.hasOptions) {
        console.log('\n✅ Good structure detected! Starting question extraction...');
        
        for (let i = 0; i < this.maxQuestions; i++) {
          console.log(`\n📝 Processing question ${i + 1}/${this.maxQuestions}...`);
          
          // Extract current question
          const questionData = await this.extractCurrentQuestion(page, i + 1);
          
          if (questionData) {
            // Download images for this question
            const images = await this.downloadQuestionImages(page, i + 1);
            questionData.images = images;
            
            this.questionsData.push(questionData);
            console.log(`   ✅ Q${i + 1} extracted: ${questionData.question.substring(0, 60)}...`);
          } else {
            console.log(`   ❌ Q${i + 1} extraction failed`);
          }
          
          // Navigate to next question (except for last one)
          if (i < this.maxQuestions - 1) {
            const navigated = await this.navigateToNext(page);
            if (!navigated) {
              console.log(`   ⚠️ Navigation failed, stopping at question ${i + 1}`);
              break;
            }
            
            // Wait for new page to load
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } else {
        console.log('❌ Page structure not suitable for navigation scraping');
      }
      
    } catch (error) {
      console.error(`❌ Navigation scraping failed:`, error.message);
    } finally {
      await page.close();
    }
  }

  async extractCurrentQuestion(page, questionNumber) {
    try {
      const questionData = await page.evaluate((qNum) => {
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n').map(line => line.trim()).filter(line => line);
        
        // Find question text (usually contains '?')
        let questionText = '';
        let questionIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Skip navigation elements and short lines
          if (line.length < 10 || 
              line.includes('whatsapp') ||
              line.includes('telegram') ||
              line.includes('print') ||
              line.includes('icon')) {
            continue;
          }
          
          // Look for question (contains ? and is meaningful length)
          if (line.includes('?') && line.length > 20) {
            questionText = line;
            questionIndex = i;
            break;
          }
        }
        
        // If no question with ?, look for descriptive text
        if (!questionText) {
          const meaningfulLines = lines.filter(line => 
            line.length > 30 && 
            !line.match(/^[A-D]\s/) &&
            (line.includes('aşağıdaki') || 
             line.includes('hangisi') ||
             line.includes('nedir') ||
             line.includes('nasıl'))
          );
          
          if (meaningfulLines.length > 0) {
            questionText = meaningfulLines[0];
            questionIndex = lines.indexOf(questionText);
          }
        }
        
        // Extract options (A, B, C, D)
        const options = {};
        const optionPattern = /^([A-D])\s+(.+)$/;
        
        if (questionIndex >= 0) {
          for (let i = questionIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            const optionMatch = line.match(optionPattern);
            
            if (optionMatch) {
              const label = optionMatch[1];
              const text = optionMatch[2];
              
              if (text.length > 1) {
                options[label] = text;
              }
            }
          }
        }
        
        // Extract category if present (look for #category pattern)
        let category = 'unknown';
        const categoryMatch = bodyText.match(/#(\w+)/);
        if (categoryMatch) {
          category = categoryMatch[1];
        }
        
        // Extract explanation if present
        let explanation = '';
        const explanationMatch = bodyText.match(/CEVAP AÇIKLAMASI:?\s*(.*?)(?=\n\n|$)/s);
        if (explanationMatch) {
          explanation = explanationMatch[1].trim();
        }
        
        if (questionText && Object.keys(options).length >= 3) {
          return {
            id: `nav_${Date.now()}_${qNum}`,
            number: qNum,
            question: questionText,
            category: category,
            options: options,
            explanation: explanation,
            sourceUrl: window.location.href,
            scrapedAt: new Date().toISOString(),
            scrapingMethod: 'navigation_based'
          };
        }
        
        return null;
      }, questionNumber);
      
      return questionData;
      
    } catch (error) {
      console.error(`   ❌ Question extraction error:`, error.message);
      return null;
    }
  }

  async downloadQuestionImages(page, questionNumber) {
    try {
      const images = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height,
          className: img.className
        })).filter(img => 
          img.src &&
          !img.src.includes('favicon') &&
          !img.src.includes('icon') &&
          !img.src.includes('logo') &&
          img.width > 50 && img.height > 50
        );
      });
      
      const downloadedImages = [];
      
      for (let i = 0; i < Math.min(images.length, 3); i++) {
        const img = images[i];
        const extension = img.src.split('.').pop().split('?')[0] || 'jpg';
        const imageName = `nav_q${questionNumber}_img${i + 1}.${extension}`;
        
        const localPath = await this.downloadImage(img.src, imageName);
        if (localPath) {
          img.localPath = localPath;
          img.fileName = imageName;
          downloadedImages.push(img);
        }
      }
      
      return downloadedImages;
      
    } catch (error) {
      console.error(`   ❌ Image download error:`, error.message);
      return [];
    }
  }

  async navigateToNext(page) {
    try {
      // Look for next button and click it
      const navigated = await page.evaluate(() => {
        // Try different navigation strategies
        const strategies = [
          // Strategy 1: Look for "Sonraki" or "Next" text
          () => {
            const buttons = Array.from(document.querySelectorAll('*')).filter(el => {
              const text = el.innerText?.toLowerCase() || '';
              return text.includes('sonraki') || 
                     text.includes('next') || 
                     text.includes('ileri') ||
                     text.includes('→');
            });
            
            if (buttons.length > 0) {
              buttons[0].click();
              return true;
            }
            return false;
          },
          
          // Strategy 2: Look for navigation links
          () => {
            const links = Array.from(document.querySelectorAll('a')).filter(a => {
              const href = a.href || '';
              const text = a.innerText?.toLowerCase() || '';
              return href.includes('soru') && 
                     (text.includes('sonraki') || text.includes('next'));
            });
            
            if (links.length > 0) {
              links[0].click();
              return true;
            }
            return false;
          },
          
          // Strategy 3: Look for buttons with navigation classes
          () => {
            const navButtons = Array.from(document.querySelectorAll('button, input[type="button"], .btn')).filter(btn => {
              const classList = Array.from(btn.classList || []).join(' ').toLowerCase();
              const text = btn.innerText?.toLowerCase() || '';
              return classList.includes('next') || 
                     classList.includes('forward') ||
                     text.includes('sonraki');
            });
            
            if (navButtons.length > 0) {
              navButtons[0].click();
              return true;
            }
            return false;
          }
        ];
        
        // Try each strategy
        for (const strategy of strategies) {
          if (strategy()) {
            return true;
          }
        }
        
        return false;
      });
      
      if (navigated) {
        console.log(`   🧭 Navigated to next question`);
        return true;
      } else {
        console.log(`   ❌ No navigation element found`);
        return false;
      }
      
    } catch (error) {
      console.error(`   ❌ Navigation error:`, error.message);
      return false;
    }
  }

  async downloadImage(imageUrl, imageName) {
    try {
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const imagePath = path.join(this.imageDir, imageName);
      const writer = require('fs').createWriteStream(imagePath);
      
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          this.imageCount++;
          console.log(`     📥 Downloaded: ${imageName}`);
          resolve(imagePath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`     ❌ Image download failed: ${imageUrl} - ${error.message}`);
      return null;
    }
  }

  async saveResults() {
    console.log('\n💾 Saving navigation scraping results...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Raw questions data
    await fs.writeFile(
      path.join(this.baseDir, `navigation_questions_${timestamp}.json`),
      JSON.stringify(this.questionsData, null, 2)
    );

    // Summary report
    const categoryBreakdown = {};
    this.questionsData.forEach(q => {
      categoryBreakdown[q.category] = (categoryBreakdown[q.category] || 0) + 1;
    });

    const summary = {
      extraction_session: {
        completed_at: new Date().toISOString(),
        method: 'navigation_based',
        total_questions: this.questionsData.length,
        target_goal: this.maxQuestions,
        success_rate: `${(this.questionsData.length / this.maxQuestions * 100).toFixed(1)}%`,
        images_downloaded: this.imageCount
      },
      question_breakdown: {
        by_category: categoryBreakdown,
        with_images: this.questionsData.filter(q => q.images && q.images.length > 0).length,
        with_explanations: this.questionsData.filter(q => q.explanation && q.explanation.length > 10).length,
        average_options: this.questionsData.length > 0 ? 
          (this.questionsData.reduce((sum, q) => sum + Object.keys(q.options).length, 0) / this.questionsData.length).toFixed(1) : 0
      }
    };

    await fs.writeFile(
      path.join(this.baseDir, `navigation_summary_${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );

    console.log('✅ Navigation results saved!');
    return summary;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printSummary(summary) {
    console.log('\n🧭 NAVIGATION SCRAPING COMPLETED!');
    console.log('='.repeat(70));
    console.log(`📝 Extracted: ${summary.extraction_session.total_questions} questions`);
    console.log(`✅ Success Rate: ${summary.extraction_session.success_rate}`);
    console.log(`🖼️ Images Downloaded: ${summary.extraction_session.images_downloaded}`);
    
    console.log('\n📊 Category Breakdown:');
    Object.entries(summary.question_breakdown.by_category).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} questions`);
    });
    
    console.log(`\n📊 Questions with Images: ${summary.question_breakdown.with_images}`);
    console.log(`📊 Questions with Explanations: ${summary.question_breakdown.with_explanations}`);
    console.log(`📊 Average Options per Question: ${summary.question_breakdown.average_options}`);
    
    console.log('\n📁 Generated Files:');
    console.log(`   - ${this.baseDir}/navigation_questions_${new Date().toISOString().split('T')[0]}.json`);
    console.log(`   - ${this.baseDir}/navigation_summary_${new Date().toISOString().split('T')[0]}.json`);
    console.log('='.repeat(70));
  }
}

async function main() {
  const scraper = new NavigationScraper();
  const startUrl = 'https://ehliyet-soru.com/test-1-haziran-2025-ehliyet-deneme-sinavi-968';
  
  try {
    await scraper.init();
    
    console.log('🧭 NAVIGATION-BASED SCRAPING TEST');
    await scraper.scrapeWithNavigation(startUrl);
    
    const summary = await scraper.saveResults();
    scraper.printSummary(summary);
    
  } catch (error) {
    console.error('❌ Navigation scraping error:', error);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { NavigationScraper }; 