const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class EhliyetSinaviHazirlikScraper {
  constructor() {
    this.browser = null;
    this.baseDir = 'ehliyetsinavihazirlik_scraper_test';
    this.imageDir = path.join(this.baseDir, 'images');
    this.questionsData = [];
    this.imageCount = 0;
    this.targetQuestions = 50;
  }

  async init() {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(this.imageDir, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-images=false'
      ]
    });
    
    console.log('🎯 EhliyetSinaviHazirlik Scraper initialized!');
    console.log(`📁 Output directory: ${this.baseDir}`);
    console.log(`🎯 Target: ${this.targetQuestions} questions`);
  }

  async scrapeEhliyetSinaviHazirlik(url) {
    console.log(`\n🚀 SCRAPING EHLIYETSINAVIHAZIRLIK: ${url}`);
    console.log('='.repeat(80));
    
    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('🔍 Analyzing page structure...');
      
      // Comprehensive page analysis
      const pageAnalysis = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const bodyHtml = document.body.innerHTML;
        
        // Look for question patterns
        const questionMarkers = [
          bodyText.match(/\d+\./g) || [],          // "1.", "2.", etc.
          bodyText.match(/\d+\)\s/g) || [],        // "1) ", "2) " etc.
          bodyText.match(/Soru\s*\d+/gi) || [],    // "Soru 1", "Soru 2"
          bodyText.match(/\?\s*[A-D]\s*\)/g) || [] // "? A)", "? B)" patterns
        ];
        
        // Look for option patterns
        const optionPatterns = [
          bodyText.match(/[A-D]\s*\)/g) || [],     // "A)", "B)", "C)", "D)"
          bodyText.match(/[A-D]\s*-/g) || [],      // "A-", "B-", "C-", "D-"
          bodyText.match(/[A-D]\s*\./g) || []      // "A.", "B.", "C.", "D."
        ];
        
        // Count images
        const images = Array.from(document.querySelectorAll('img')).filter(img => 
          img.src && 
          !img.src.includes('favicon') && 
          !img.src.includes('icon') &&
          !img.src.includes('logo') &&
          img.width > 30 && img.height > 30
        );
        
        // Look for question containers
        const questionContainers = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.innerText || '';
          const html = el.innerHTML || '';
          return text.includes('?') && 
                 text.length > 20 && 
                 text.length < 500 &&
                 (html.includes('A)') || html.includes('B)') || html.includes('C)'));
        });
        
        // Look for structured lists or tables
        const lists = document.querySelectorAll('ul, ol, table');
        const divs = Array.from(document.querySelectorAll('div')).filter(div => {
          const text = div.innerText || '';
          return text.includes('?') && text.includes('A)');
        });
        
        return {
          pageLength: bodyText.length,
          questionMarkers: questionMarkers.map(arr => arr.length),
          optionPatterns: optionPatterns.map(arr => arr.length),
          totalImages: images.length,
          questionContainers: questionContainers.length,
          structuredElements: lists.length,
          questionDivs: divs.length,
          sampleText: bodyText.substring(0, 1000),
          sampleHtml: bodyHtml.substring(0, 2000)
        };
      });
      
      console.log('📊 PAGE ANALYSIS:');
      console.log(`   Page length: ${pageAnalysis.pageLength} characters`);
      console.log(`   Question markers: ${JSON.stringify(pageAnalysis.questionMarkers)}`);
      console.log(`   Option patterns: ${JSON.stringify(pageAnalysis.optionPatterns)}`);
      console.log(`   Images found: ${pageAnalysis.totalImages}`);
      console.log(`   Question containers: ${pageAnalysis.questionContainers}`);
      console.log(`   Question divs: ${pageAnalysis.questionDivs}`);
      console.log(`   Structured elements: ${pageAnalysis.structuredElements}`);
      
      console.log(`\n📄 Sample content: ${pageAnalysis.sampleText.substring(0, 300)}...`);
      
      // Try different extraction strategies
      console.log('\n🎯 Trying multiple extraction strategies...');
      
      // Strategy 1: DOM-based extraction
      console.log('\n📋 Strategy 1: DOM-based extraction...');
      const domQuestions = await this.extractQuestionsDOM(page);
      console.log(`   Found ${domQuestions.length} questions via DOM`);
      
      // Strategy 2: Text pattern extraction
      console.log('\n📋 Strategy 2: Text pattern extraction...');
      const textQuestions = await this.extractQuestionsText(page);
      console.log(`   Found ${textQuestions.length} questions via text patterns`);
      
      // Strategy 3: Sequential extraction
      console.log('\n📋 Strategy 3: Sequential extraction...');
      const sequentialQuestions = await this.extractQuestionsSequential(page);
      console.log(`   Found ${sequentialQuestions.length} questions via sequential`);
      
      // Strategy 4: Container-based extraction
      console.log('\n📋 Strategy 4: Container-based extraction...');
      const containerQuestions = await this.extractQuestionsContainer(page);
      console.log(`   Found ${containerQuestions.length} questions via containers`);
      
      // Choose best strategy
      const strategies = [
        { name: 'DOM', questions: domQuestions },
        { name: 'Text', questions: textQuestions },
        { name: 'Sequential', questions: sequentialQuestions },
        { name: 'Container', questions: containerQuestions }
      ];
      
      const bestStrategy = strategies.reduce((best, current) => 
        current.questions.length > best.questions.length ? current : best
      );
      
      console.log(`\n🏆 Best strategy: ${bestStrategy.name} with ${bestStrategy.questions.length} questions`);
      
      // Use best strategy results
      this.questionsData = bestStrategy.questions.slice(0, this.targetQuestions);
      
      // Download images for extracted questions
      console.log('\n🖼️ Downloading images...');
      await this.downloadAllImages(page);
      
    } catch (error) {
      console.error(`❌ Scraping failed:`, error.message);
    } finally {
      await page.close();
    }
  }

  async extractQuestionsDOM(page) {
    try {
      return await page.evaluate(() => {
        const questions = [];
        let questionId = 1;
        
        // Helper function to parse question from text
        function parseQuestionFromText(text, questionNumber) {
          try {
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);
            
            // Find question text
            let questionText = '';
            let questionIndex = -1;
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              if (line.includes('?') && line.length > 20) {
                questionText = line;
                questionIndex = i;
                break;
              }
            }
            
            if (!questionText) {
              const meaningfulLines = lines.filter(line => 
                line.length > 30 && 
                !line.match(/^[A-D]\s/) &&
                (line.includes('aşağıdaki') || 
                 line.includes('hangisi') ||
                 line.includes('nedir'))
              );
              
              if (meaningfulLines.length > 0) {
                questionText = meaningfulLines[0];
                questionIndex = lines.indexOf(questionText);
              }
            }
            
            // Extract options
            const options = {};
            const optionPattern = /^([A-D])\s*[\)\-\.]\s*(.+)$/;
            
            if (questionIndex >= 0) {
              for (let i = questionIndex + 1; i < lines.length; i++) {
                const line = lines[i];
                const optionMatch = line.match(optionPattern);
                
                if (optionMatch) {
                  const label = optionMatch[1];
                  const text = optionMatch[2];
                  
                  if (text && text.length > 1) {
                    options[label] = text;
                  }
                }
              }
            }
            
            if (questionText && Object.keys(options).length >= 3) {
              return {
                id: `ehliyetsinavihazirlik_${Date.now()}_${questionNumber}`,
                question: questionText,
                options: options,
                category: 'unknown',
                explanation: '',
                sourceUrl: window.location.href,
                scrapedAt: new Date().toISOString()
              };
            }
            
            return null;
          } catch (error) {
            console.error('Parse error:', error);
            return null;
          }
        }
        
        // Look for common question patterns in DOM
        const selectors = [
          'div',
          'p', 
          'li',
          '.question', 
          '.soru',
          '[data-question]', 
          '[data-soru]'
        ];
        
        // Try to find questions with CSS selectors
        for (const selector of selectors) {
          try {
            const elements = document.querySelectorAll(selector);
            
            elements.forEach(el => {
              const text = el.innerText || '';
              if (text.includes('?') && text.includes('A)') && text.includes('B)') && text.length > 50) {
                const question = parseQuestionFromText(text, questionId++);
                if (question && questions.length < 50) {
                  questions.push(question);
                }
              }
            });
            
            if (questions.length > 0) break;
          } catch (e) {
            continue;
          }
        }
        
        return questions;
      });
    } catch (error) {
      console.error(`   ❌ DOM extraction error:`, error.message);
      return [];
    }
  }

  async extractQuestionsText(page) {
    try {
      return await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const questions = [];
        
        // Helper function to parse question from text
        function parseQuestionFromText(text, questionNumber) {
          try {
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);
            
            let questionText = '';
            let questionIndex = -1;
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              if (line.includes('?') && line.length > 20) {
                questionText = line;
                questionIndex = i;
                break;
              }
            }
            
            if (!questionText) {
              const meaningfulLines = lines.filter(line => 
                line.length > 30 && 
                !line.match(/^[A-D]\s/) &&
                (line.includes('aşağıdaki') || 
                 line.includes('hangisi') ||
                 line.includes('nedir'))
              );
              
              if (meaningfulLines.length > 0) {
                questionText = meaningfulLines[0];
                questionIndex = lines.indexOf(questionText);
              }
            }
            
            const options = {};
            const optionPattern = /^([A-D])\s*[\)\-\.]\s*(.+)$/;
            
            if (questionIndex >= 0) {
              for (let i = questionIndex + 1; i < lines.length; i++) {
                const line = lines[i];
                const optionMatch = line.match(optionPattern);
                
                if (optionMatch) {
                  const label = optionMatch[1];
                  const text = optionMatch[2];
                  
                  if (text && text.length > 1) {
                    options[label] = text;
                  }
                }
              }
            }
            
            if (questionText && Object.keys(options).length >= 3) {
              return {
                id: `text_${Date.now()}_${questionNumber}`,
                question: questionText,
                options: options,
                category: 'unknown',
                explanation: '',
                sourceUrl: window.location.href,
                scrapedAt: new Date().toISOString(),
                scrapingMethod: 'text_pattern'
              };
            }
            
            return null;
          } catch (error) {
            return null;
          }
        }
        
        // Split by potential question markers
        const markers = [
          /\n\d+\./g,           // "1.", "2.", etc.
          /\n\d+\)\s/g,         // "1) ", "2) " etc.
          /\nSoru\s*\d+/gi,     // "Soru 1", "Soru 2"
        ];
        
        for (const marker of markers) {
          const parts = bodyText.split(marker);
          
          for (let i = 1; i < parts.length && questions.length < 50; i++) {
            const part = parts[i].trim();
            
            if (part.includes('?') && part.includes('A)') && part.includes('B)')) {
              const question = parseQuestionFromText(part, i);
              if (question) {
                questions.push(question);
              }
            }
          }
          
          if (questions.length > 0) break;
        }
        
        return questions;
      });
    } catch (error) {
      console.error(`   ❌ Text extraction error:`, error.message);
      return [];
    }
  }

  async extractQuestionsSequential(page) {
    try {
      return await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n').map(line => line.trim()).filter(line => line);
        const questions = [];
        let currentQuestion = null;
        let questionNumber = 1;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check if line starts a new question
          if (line.match(/^\d+\./) || line.match(/^Soru\s*\d+/i)) {
            if (currentQuestion && currentQuestion.question && Object.keys(currentQuestion.options).length >= 3) {
              questions.push({
                ...currentQuestion,
                id: `seq_${Date.now()}_${questionNumber}`,
                number: questionNumber++,
                scrapingMethod: 'sequential_text'
              });
            }
            
            currentQuestion = {
              question: '',
              options: {},
              category: 'unknown',
              explanation: ''
            };
            
            // Remove question number from line
            const cleanLine = line.replace(/^\d+\.\s*/, '').replace(/^Soru\s*\d+\s*[:.]\s*/i, '');
            if (cleanLine) {
              currentQuestion.question = cleanLine;
            }
          }
          // Check if line contains question text (has ?)
          else if (line.includes('?') && line.length > 20 && currentQuestion && !currentQuestion.question) {
            currentQuestion.question = line;
          }
          // Check if line is an option
          else if (line.match(/^[A-D]\s*[\)\-\.]\s*(.+)/) && currentQuestion) {
            const optionMatch = line.match(/^([A-D])\s*[\)\-\.]\s*(.+)/);
            if (optionMatch) {
              currentQuestion.options[optionMatch[1]] = optionMatch[2];
            }
          }
          // Continue question text if it doesn't end with ?
          else if (currentQuestion && currentQuestion.question && !currentQuestion.question.includes('?') && 
                   line.length > 10 && !line.match(/^[A-D]\s/)) {
            currentQuestion.question += ' ' + line;
          }
        }
        
        // Add last question if valid
        if (currentQuestion && currentQuestion.question && Object.keys(currentQuestion.options).length >= 3) {
          questions.push({
            ...currentQuestion,
            id: `seq_${Date.now()}_${questionNumber}`,
            number: questionNumber,
            scrapingMethod: 'sequential_text'
          });
        }
        
        return questions;
      });
    } catch (error) {
      console.error(`   ❌ Sequential extraction error:`, error.message);
      return [];
    }
  }

  async extractQuestionsContainer(page) {
    try {
      return await page.evaluate(() => {
        const questions = [];
        let questionId = 1;
        
        // Helper function to parse question from text
        function parseQuestionFromText(text, questionNumber) {
          try {
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);
            
            let questionText = '';
            let questionIndex = -1;
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              if (line.includes('?') && line.length > 20) {
                questionText = line;
                questionIndex = i;
                break;
              }
            }
            
            if (!questionText) {
              const meaningfulLines = lines.filter(line => 
                line.length > 30 && 
                !line.match(/^[A-D]\s/) &&
                (line.includes('aşağıdaki') || 
                 line.includes('hangisi') ||
                 line.includes('nedir'))
              );
              
              if (meaningfulLines.length > 0) {
                questionText = meaningfulLines[0];
                questionIndex = lines.indexOf(questionText);
              }
            }
            
            const options = {};
            const optionPattern = /^([A-D])\s*[\)\-\.]\s*(.+)$/;
            
            if (questionIndex >= 0) {
              for (let i = questionIndex + 1; i < lines.length; i++) {
                const line = lines[i];
                const optionMatch = line.match(optionPattern);
                
                if (optionMatch) {
                  const label = optionMatch[1];
                  const text = optionMatch[2];
                  
                  if (text && text.length > 1) {
                    options[label] = text;
                  }
                }
              }
            }
            
            if (questionText && Object.keys(options).length >= 3) {
              return {
                id: `container_${Date.now()}_${questionNumber}`,
                question: questionText,
                options: options,
                category: 'unknown',
                explanation: '',
                sourceUrl: window.location.href,
                scrapedAt: new Date().toISOString(),
                scrapingMethod: 'container_based'
              };
            }
            
            return null;
          } catch (error) {
            return null;
          }
        }
        
        // Look for containers that might hold questions
        const containers = Array.from(document.querySelectorAll('div, section, article')).filter(container => {
          const text = container.innerText || '';
          const childCount = container.children.length;
          
          return text.includes('?') && 
                 text.includes('A)') && 
                 text.includes('B)') &&
                 text.length > 100 &&
                 text.length < 2000 &&
                 childCount < 10; // Not too complex
        });
        
        containers.forEach(container => {
          const text = container.innerText;
          
          // Try to parse as single question
          const question = parseQuestionFromText(text, questionId++);
          if (question && questions.length < 50) {
            questions.push(question);
          }
        });
        
        return questions;
      });
    } catch (error) {
      console.error(`   ❌ Container extraction error:`, error.message);
      return [];
    }
  }

  async downloadAllImages(page) {
    try {
      const images = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map((img, index) => ({
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height,
          index: index
        })).filter(img => 
          img.src &&
          !img.src.includes('favicon') &&
          !img.src.includes('icon') &&
          !img.src.includes('logo') &&
          img.width > 30 && img.height > 30
        );
      });
      
      console.log(`   Found ${images.length} relevant images`);
      
      for (let i = 0; i < Math.min(images.length, 100); i++) {
        const img = images[i];
        const extension = img.src.split('.').pop().split('?')[0] || 'jpg';
        const imageName = `ehliyetsinavihazirlik_img${i + 1}.${extension}`;
        
        const localPath = await this.downloadImage(img.src, imageName);
        if (localPath) {
          this.imageCount++;
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Image download error:`, error.message);
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
    console.log('\n💾 Saving EhliyetSinaviHazirlik results...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Raw questions data
    await fs.writeFile(
      path.join(this.baseDir, `ehliyetsinavihazirlik_questions_${timestamp}.json`),
      JSON.stringify(this.questionsData, null, 2)
    );

    // Summary report
    const categoryBreakdown = {};
    this.questionsData.forEach(q => {
      const cat = q.category || 'unknown';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    const summary = {
      extraction_session: {
        completed_at: new Date().toISOString(),
        method: 'multi_strategy',
        site: 'ehliyetsinavihazirlik.com',
        total_questions: this.questionsData.length,
        target_goal: this.targetQuestions,
        success_rate: `${(this.questionsData.length / this.targetQuestions * 100).toFixed(1)}%`,
        images_downloaded: this.imageCount
      },
      question_breakdown: {
        by_category: categoryBreakdown,
        by_scraping_method: this.questionsData.reduce((acc, q) => {
          const method = q.scrapingMethod || 'unknown';
          acc[method] = (acc[method] || 0) + 1;
          return acc;
        }, {}),
        with_explanations: this.questionsData.filter(q => q.explanation && q.explanation.length > 10).length,
        average_options: this.questionsData.length > 0 ? 
          (this.questionsData.reduce((sum, q) => sum + Object.keys(q.options || {}).length, 0) / this.questionsData.length).toFixed(1) : 0
      }
    };

    await fs.writeFile(
      path.join(this.baseDir, `ehliyetsinavihazirlik_summary_${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );

    console.log('✅ EhliyetSinaviHazirlik results saved!');
    return summary;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printSummary(summary) {
    console.log('\n🎯 EHLIYETSINAVIHAZIRLIK SCRAPING COMPLETED!');
    console.log('='.repeat(70));
    console.log(`📝 Extracted: ${summary.extraction_session.total_questions} questions`);
    console.log(`✅ Success Rate: ${summary.extraction_session.success_rate}`);
    console.log(`🖼️ Images Downloaded: ${summary.extraction_session.images_downloaded}`);
    
    console.log('\n📊 Category Breakdown:');
    Object.entries(summary.question_breakdown.by_category).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} questions`);
    });
    
    console.log('\n📊 Scraping Method Breakdown:');
    Object.entries(summary.question_breakdown.by_scraping_method).forEach(([method, count]) => {
      console.log(`   ${method}: ${count} questions`);
    });
    
    console.log(`\n📊 Questions with Explanations: ${summary.question_breakdown.with_explanations}`);
    console.log(`📊 Average Options per Question: ${summary.question_breakdown.average_options}`);
    
    console.log('\n📁 Generated Files:');
    console.log(`   - ${this.baseDir}/ehliyetsinavihazirlik_questions_${new Date().toISOString().split('T')[0]}.json`);
    console.log(`   - ${this.baseDir}/ehliyetsinavihazirlik_summary_${new Date().toISOString().split('T')[0]}.json`);
    console.log('='.repeat(70));
  }
}

async function main() {
  const scraper = new EhliyetSinaviHazirlikScraper();
  const url = 'https://ehliyetsinavihazirlik.com/index.php/e-sinavlar-haziran-sorulari-1.html';
  
  try {
    await scraper.init();
    
    console.log('🎯 EHLIYETSINAVIHAZIRLIK MULTI-STRATEGY SCRAPING TEST');
    await scraper.scrapeEhliyetSinaviHazirlik(url);
    
    const summary = await scraper.saveResults();
    scraper.printSummary(summary);
    
  } catch (error) {
    console.error('❌ EhliyetSinaviHazirlik scraping error:', error);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EhliyetSinaviHazirlikScraper }; 