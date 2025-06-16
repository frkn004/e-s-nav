const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class EnhancedNavigationScraper {
  constructor() {
    this.browser = null;
    this.baseDir = 'enhanced_navigation_test';
    this.imageDir = path.join(this.baseDir, 'images');
    this.questionsData = [];
    this.imageCount = 0;
    this.maxQuestions = 50;
    this.debugMode = true;
  }

  async init() {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(this.imageDir, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: this.debugMode,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-images=false'
      ]
    });
    
    console.log('🔧 Enhanced Navigation Scraper initialized!');
    console.log(`📁 Output directory: ${this.baseDir}`);
    console.log(`🎯 Target: ${this.maxQuestions} questions`);
  }

  async scrapeWithEnhancedNavigation(startUrl) {
    console.log(`\n🚀 ENHANCED NAVIGATION SCRAPING: ${startUrl}`);
    console.log('='.repeat(80));
    
    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    try {
      await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('🔍 Deep page analysis...');
      
      // Enhanced page analysis
      const pageAnalysis = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const bodyHtml = document.body.innerHTML;
        
        // Extract all text content in organized way
        const lines = bodyText.split('\n').map(line => line.trim()).filter(line => line);
        
        // Look for question patterns more thoroughly
        const questionIndicators = {
          numbered: lines.filter(line => line.match(/^\d+\./)),
          hasQuestion: lines.filter(line => line.includes('?')),
          hasOptions: lines.filter(line => line.match(/^[A-D](\s|$)/)),
          categories: lines.filter(line => line.startsWith('#')),
          navigation: lines.filter(line => line.toLowerCase().includes('sonraki') || line.toLowerCase().includes('next')),
        };
        
        // Find actual question/answer structure
        let questionStructure = [];
        let currentQ = {};
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Category detection
          if (line.startsWith('#') && line.length < 20) {
            if (currentQ.question) {
              questionStructure.push({...currentQ});
            }
            currentQ = { category: line, lineIndex: i };
          }
          // Question detection (has ? and meaningful length)
          else if (line.includes('?') && line.length > 20 && line.length < 300) {
            currentQ.question = line;
            currentQ.questionLineIndex = i;
          }
          // Option detection
          else if (line.match(/^[A-D](\s|$)/) && currentQ.question) {
            if (!currentQ.options) currentQ.options = {};
            const optionLetter = line.charAt(0);
            const optionText = line.substring(1).trim();
            currentQ.options[optionLetter] = optionText;
          }
        }
        
        if (currentQ.question) {
          questionStructure.push({...currentQ});
        }
        
        return {
          pageLength: bodyText.length,
          totalLines: lines.length,
          questionIndicators: questionIndicators,
          questionStructure: questionStructure,
          sampleLines: lines.slice(0, 50),
          hashPattern: bodyText.match(/#\w+/g) || [],
          urlHash: window.location.hash,
          currentUrl: window.location.href
        };
      });
      
      console.log('📊 ENHANCED PAGE ANALYSIS:');
      console.log(`   Page length: ${pageAnalysis.pageLength} characters`);
      console.log(`   Total lines: ${pageAnalysis.totalLines}`);
      console.log(`   Numbered lines: ${pageAnalysis.questionIndicators.numbered.length}`);
      console.log(`   Lines with ?: ${pageAnalysis.questionIndicators.hasQuestion.length}`);
      console.log(`   Option lines: ${pageAnalysis.questionIndicators.hasOptions.length}`);
      console.log(`   Categories: ${pageAnalysis.questionIndicators.categories.length}`);
      console.log(`   Navigation elements: ${pageAnalysis.questionIndicators.navigation.length}`);
      console.log(`   Hash pattern: ${JSON.stringify(pageAnalysis.hashPattern)}`);
      console.log(`   Current URL: ${pageAnalysis.currentUrl}`);
      console.log(`   URL Hash: ${pageAnalysis.urlHash}`);
      
      console.log('\n📝 DETECTED QUESTION STRUCTURE:');
      if (pageAnalysis.questionStructure.length > 0) {
        const firstQ = pageAnalysis.questionStructure[0];
        console.log(`   Category: ${firstQ.category || 'N/A'}`);
        console.log(`   Question: ${firstQ.question?.substring(0, 80) || 'N/A'}...`);
        console.log(`   Options: ${Object.keys(firstQ.options || {}).length}`);
        if (firstQ.options) {
          Object.entries(firstQ.options).forEach(([key, value]) => {
            console.log(`     ${key}: ${value.substring(0, 40)}...`);
          });
        }
      } else {
        console.log(`   ❌ No clear question structure detected`);
      }
      
      console.log('\n📄 SAMPLE CONTENT:');
      pageAnalysis.sampleLines.slice(0, 20).forEach((line, i) => {
        const lineNum = (i + 1).toString().padStart(2, ' ');
        console.log(`   ${lineNum}: ${line.substring(0, 60)}${line.length > 60 ? '...' : ''}`);
      });
      
      // Start enhanced extraction
      console.log('\n🎯 Starting enhanced question extraction...');
      
      for (let i = 0; i < this.maxQuestions; i++) {
        console.log(`\n📝 Processing question ${i + 1}/${this.maxQuestions}...`);
        
        // Extract current question using enhanced method
        const questionData = await this.extractCurrentQuestionEnhanced(page, i + 1);
        
        if (questionData) {
          // Download images for this question
          const images = await this.downloadQuestionImages(page, i + 1);
          questionData.images = images;
          
          this.questionsData.push(questionData);
          console.log(`   ✅ Q${i + 1} extracted: ${questionData.question.substring(0, 60)}...`);
          console.log(`   📊 Options: ${Object.keys(questionData.options).length}, Category: ${questionData.category}`);
        } else {
          console.log(`   ❌ Q${i + 1} extraction failed`);
          
          // Debug current page content
          if (this.debugMode) {
            await this.debugCurrentPage(page, i + 1);
          }
        }
        
        // Navigate to next question (except for last one)
        if (i < this.maxQuestions - 1) {
          const navigated = await this.navigateToNextEnhanced(page);
          if (!navigated) {
            console.log(`   ⚠️ Navigation failed, stopping at question ${i + 1}`);
            break;
          }
          
          // Wait for new page to load
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
    } catch (error) {
      console.error(`❌ Enhanced navigation scraping failed:`, error.message);
    } finally {
      await page.close();
    }
  }

  async extractCurrentQuestionEnhanced(page, questionNumber) {
    try {
      const questionData = await page.evaluate((qNum) => {
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n').map(line => line.trim()).filter(line => line);
        
        // Enhanced question detection strategy
        let category = 'unknown';
        let questionText = '';
        let options = {};
        let explanation = '';
        
        // Strategy 1: Hash-based detection (ehliyet-soru.com style)
        const hashMatch = bodyText.match(/#(\w+)/);
        if (hashMatch) {
          category = hashMatch[1];
        }
        
        // Strategy 2: Find question by looking for comprehensive patterns
        const questionCandidates = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Skip navigation, header, footer lines
          if (line.length < 15 || 
              line.includes('whatsapp') ||
              line.includes('facebook') ||
              line.includes('instagram') ||
              line.includes('menu') ||
              line.includes('©') ||
              line.includes('anasayfa') ||
              line.toLowerCase().includes('sınav') ||
              line.toLowerCase().includes('test') ||
              line.includes('⊕') ||
              line.match(/^\d+\s*\/\s*\d+$/)) {
            continue;
          }
          
          // Look for question patterns
          if (line.includes('?') && line.length > 25) {
            questionCandidates.push({
              text: line,
              index: i,
              score: line.length + (line.includes('aşağıdaki') ? 10 : 0) + (line.includes('hangisi') ? 10 : 0)
            });
          }
        }
        
        // Select best question candidate
        if (questionCandidates.length > 0) {
          const bestQuestion = questionCandidates.sort((a, b) => b.score - a.score)[0];
          questionText = bestQuestion.text;
          
          // Extract options starting from question line
          const startIndex = bestQuestion.index + 1;
          const optionPattern = /^([A-D])(\s+(.+))?$/;
          
          for (let i = startIndex; i < Math.min(startIndex + 10, lines.length); i++) {
            const line = lines[i];
            const optionMatch = line.match(optionPattern);
            
            if (optionMatch) {
              const label = optionMatch[1];
              let text = optionMatch[3] || '';
              
              // If option text is empty, check next line
              if (!text && i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                if (nextLine && !nextLine.match(/^[A-D](\s|$)/) && nextLine.length > 2) {
                  text = nextLine;
                }
              }
              
              if (text && text.length > 0) {
                options[label] = text;
              }
            }
          }
        }
        
        // Strategy 3: Alternative patterns for ehliyet-soru.com
        if (!questionText || Object.keys(options).length < 3) {
          // Look for DOM structure
          const questionElements = Array.from(document.querySelectorAll('*')).filter(el => {
            const text = el.innerText || '';
            return text.includes('?') && 
                   text.length > 20 && 
                   text.length < 500 &&
                   !el.querySelector('script, style, iframe');
          });
          
          if (questionElements.length > 0) {
            const element = questionElements[0];
            const elementText = element.innerText;
            const elementLines = elementText.split('\n').map(line => line.trim()).filter(line => line);
            
            // Extract from DOM element
            for (let i = 0; i < elementLines.length; i++) {
              const line = elementLines[i];
              
              if (line.includes('?') && line.length > 20 && !questionText) {
                questionText = line;
              }
              
              const optionMatch = line.match(/^([A-D])\s*(.+)$/);
              if (optionMatch && optionMatch[2]) {
                options[optionMatch[1]] = optionMatch[2];
              }
            }
          }
        }
        
        // Strategy 4: Look for specific ehliyet-soru.com format
        if (!questionText || Object.keys(options).length < 3) {
          // Try to find question in specific DOM structure
          const divs = Array.from(document.querySelectorAll('div, p, section'));
          
          for (const div of divs) {
            const text = div.innerText || '';
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            
            let foundQuestion = '';
            let foundOptions = {};
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              if (line.includes('?') && line.length > 20 && line.length < 300) {
                foundQuestion = line;
              }
              
              const optMatch = line.match(/^([A-D])\s*(.+)$/);
              if (optMatch && optMatch[2] && optMatch[2].length > 2) {
                foundOptions[optMatch[1]] = optMatch[2];
              }
            }
            
            if (foundQuestion && Object.keys(foundOptions).length >= 3) {
              questionText = foundQuestion;
              options = foundOptions;
              break;
            }
          }
        }
        
        // Return question if we have sufficient data
        if (questionText && Object.keys(options).length >= 3) {
          return {
            id: `enhanced_nav_${Date.now()}_${qNum}`,
            number: qNum,
            question: questionText,
            category: category,
            options: options,
            explanation: explanation,
            sourceUrl: window.location.href,
            scrapedAt: new Date().toISOString(),
            scrapingMethod: 'enhanced_navigation'
          };
        }
        
        return null;
      }, questionNumber);
      
      return questionData;
      
    } catch (error) {
      console.error(`   ❌ Enhanced question extraction error:`, error.message);
      return null;
    }
  }

  async debugCurrentPage(page, questionNumber) {
    try {
      console.log(`\n🔧 DEBUG Q${questionNumber}:`);
      
      const debugInfo = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n').map(line => line.trim()).filter(line => line && line.length > 3);
        
        return {
          url: window.location.href,
          hash: window.location.hash,
          title: document.title,
          bodyLength: bodyText.length,
          lineCount: lines.length,
          firstLines: lines.slice(0, 30),
          questionLines: lines.filter(line => line.includes('?')),
          optionLines: lines.filter(line => line.match(/^[A-D](\s|$)/)),
          categoryLines: lines.filter(line => line.startsWith('#'))
        };
      });
      
      console.log(`   URL: ${debugInfo.url}`);
      console.log(`   Hash: ${debugInfo.hash}`);
      console.log(`   Title: ${debugInfo.title}`);
      console.log(`   Lines: ${debugInfo.lineCount}, Body: ${debugInfo.bodyLength} chars`);
      console.log(`   Question lines: ${debugInfo.questionLines.length}`);
      console.log(`   Option lines: ${debugInfo.optionLines.length}`);
      console.log(`   Category lines: ${debugInfo.categoryLines.length}`);
      
      if (debugInfo.questionLines.length > 0) {
        console.log(`   First question: ${debugInfo.questionLines[0].substring(0, 80)}...`);
      }
      
      if (debugInfo.optionLines.length > 0) {
        console.log(`   First options: ${debugInfo.optionLines.slice(0, 4).join(' | ')}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Debug error:`, error.message);
    }
  }

  async navigateToNextEnhanced(page) {
    try {
      const navigated = await page.evaluate(() => {
        // Enhanced navigation strategies for ehliyet-soru.com
        const strategies = [
          // Strategy 1: Hash-based navigation (increment number)
          () => {
            const currentHash = window.location.hash;
            const hashMatch = currentHash.match(/#(\w+)\s*#(\d+)/);
            if (hashMatch) {
              const category = hashMatch[1];
              const currentNum = parseInt(hashMatch[2]);
              const nextHash = `#${category} #${currentNum + 1}`;
              window.location.hash = nextHash;
              return true;
            }
            return false;
          },
          
          // Strategy 2: Look for URL patterns
          () => {
            const currentUrl = window.location.href;
            const urlMatch = currentUrl.match(/(\d+)$/);
            if (urlMatch) {
              const currentNum = parseInt(urlMatch[1]);
              const newUrl = currentUrl.replace(/\d+$/, (currentNum + 1).toString());
              window.location.href = newUrl;
              return true;
            }
            return false;
          },
          
          // Strategy 3: Click next button
          () => {
            const nextButtons = Array.from(document.querySelectorAll('*')).filter(el => {
              const text = el.innerText?.toLowerCase() || '';
              const title = el.title?.toLowerCase() || '';
              const className = el.className?.toLowerCase() || '';
              
              return (text.includes('sonraki') || 
                     text.includes('next') || 
                     text.includes('ileri') ||
                     text.includes('→') ||
                     title.includes('sonraki') ||
                     className.includes('next')) && 
                     el.offsetWidth > 0 && el.offsetHeight > 0;
            });
            
            if (nextButtons.length > 0) {
              nextButtons[0].click();
              return true;
            }
            return false;
          },
          
          // Strategy 4: Keyboard navigation
          () => {
            // Try arrow key
            const event = new KeyboardEvent('keydown', {
              key: 'ArrowRight',
              code: 'ArrowRight',
              keyCode: 39
            });
            document.dispatchEvent(event);
            
            // Small delay and check if URL changed
            setTimeout(() => {}, 100);
            return true; // Will be verified by caller
          }
        ];
        
        // Try each strategy
        for (const strategy of strategies) {
          try {
            if (strategy()) {
              return true;
            }
          } catch (e) {
            continue;
          }
        }
        
        return false;
      });
      
      if (navigated) {
        console.log(`   🧭 Enhanced navigation succeeded`);
        return true;
      } else {
        console.log(`   ❌ Enhanced navigation failed`);
        return false;
      }
      
    } catch (error) {
      console.error(`   ❌ Enhanced navigation error:`, error.message);
      return false;
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
        const imageName = `enhanced_nav_q${questionNumber}_img${i + 1}.${extension}`;
        
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
    console.log('\n💾 Saving enhanced navigation results...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Raw questions data
    await fs.writeFile(
      path.join(this.baseDir, `enhanced_nav_questions_${timestamp}.json`),
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
        method: 'enhanced_navigation',
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
      path.join(this.baseDir, `enhanced_nav_summary_${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );

    console.log('✅ Enhanced navigation results saved!');
    return summary;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printSummary(summary) {
    console.log('\n🔧 ENHANCED NAVIGATION SCRAPING COMPLETED!');
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
    console.log(`   - ${this.baseDir}/enhanced_nav_questions_${new Date().toISOString().split('T')[0]}.json`);
    console.log(`   - ${this.baseDir}/enhanced_nav_summary_${new Date().toISOString().split('T')[0]}.json`);
    console.log('='.repeat(70));
  }
}

async function main() {
  const scraper = new EnhancedNavigationScraper();
  const startUrl = 'https://ehliyet-soru.com/test-1-haziran-2025-ehliyet-deneme-sinavi-968';
  
  try {
    await scraper.init();
    
    console.log('🔧 ENHANCED NAVIGATION-BASED SCRAPING TEST');
    await scraper.scrapeWithEnhancedNavigation(startUrl);
    
    const summary = await scraper.saveResults();
    scraper.printSummary(summary);
    
  } catch (error) {
    console.error('❌ Enhanced navigation scraping error:', error);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EnhancedNavigationScraper }; 