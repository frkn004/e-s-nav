const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class SpecificSiteScraper {
  constructor() {
    this.browser = null;
    this.baseDir = 'specific_site_test';
    this.imageDir = path.join(this.baseDir, 'images');
    this.questionsData = [];
    this.imageCount = 0;
  }

  async init() {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(this.imageDir, { recursive: true });
    
    this.browser = await puppeteer.launch({
      headless: false, // Görerek test edelim
      devtools: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-images=false'
      ]
    });
    
    console.log('🚀 Specific Site Scraper initialized!');
    console.log(`📁 Output directory: ${this.baseDir}`);
    console.log(`🖼️  Images directory: ${this.imageDir}`);
  }

  async analyzeSiteStructure(url) {
    console.log(`🔍 Analyzing site structure: ${url}`);
    
    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait a bit more for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const analysis = await page.evaluate(() => {
        // Look for different question patterns
        const bodyText = document.body.innerText;
        const bodyHTML = document.body.innerHTML;
        
        // Check for common question indicators
        const questionPatterns = [
          /soru\s*\d+/gi,
          /\d+\.\s*/g,
          /\d+\)\s*/g,
          /a\)\s*.*b\)\s*.*c\)\s*.*d\)/gi
        ];
        
        const foundPatterns = {};
        questionPatterns.forEach((pattern, index) => {
          const matches = bodyText.match(pattern);
          foundPatterns[`pattern_${index}`] = matches ? matches.length : 0;
        });
        
        // Look for images
        const images = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height,
          className: img.className
        }));
        
        // Look for forms and inputs
        const forms = Array.from(document.querySelectorAll('form'));
        const inputs = Array.from(document.querySelectorAll('input'));
        const selects = Array.from(document.querySelectorAll('select'));
        
        // Look for tables
        const tables = Array.from(document.querySelectorAll('table'));
        const tableInfo = tables.map(table => ({
          rows: table.rows.length,
          cells: table.rows[0] ? table.rows[0].cells.length : 0,
          hasQuestionContent: table.innerHTML.includes('soru') || table.innerHTML.includes('A)') || table.innerHTML.includes('B)')
        }));
        
        // Look for divs with potential question content
        const divs = Array.from(document.querySelectorAll('div'));
        const questionDivs = divs.filter(div => {
          const text = div.innerText;
          return text && (
            text.includes('soru') ||
            text.match(/\d+\.\s/) ||
            text.includes('A)') ||
            text.includes('B)')
          );
        }).map(div => ({
          className: div.className,
          id: div.id,
          textLength: div.innerText.length,
          hasImages: div.querySelectorAll('img').length > 0
        }));
        
        return {
          title: document.title,
          url: window.location.href,
          patterns: foundPatterns,
          images: images.length,
          imageDetails: images.slice(0, 5), // First 5 images for analysis
          forms: forms.length,
          inputs: inputs.length,
          selects: selects.length,
          tables: tableInfo,
          questionDivs: questionDivs.length,
          questionDivDetails: questionDivs.slice(0, 3), // First 3 for analysis
          bodyTextLength: bodyText.length,
          containsABCD: bodyText.includes('A)') && bodyText.includes('B)') && bodyText.includes('C)') && bodyText.includes('D)'),
          sampleText: bodyText.substring(0, 1000)
        };
      });
      
      console.log('\n📊 Site Structure Analysis:');
      console.log('='.repeat(50));
      console.log(`Title: ${analysis.title}`);
      console.log(`Images found: ${analysis.images}`);
      console.log(`Forms: ${analysis.forms}, Inputs: ${analysis.inputs}`);
      console.log(`Tables: ${analysis.tables.length}`);
      console.log(`Question divs: ${analysis.questionDivs}`);
      console.log(`Contains A/B/C/D options: ${analysis.containsABCD}`);
      console.log(`Body text length: ${analysis.bodyTextLength}`);
      
      console.log('\n🎯 Pattern Analysis:');
      Object.entries(analysis.patterns).forEach(([pattern, count]) => {
        console.log(`  ${pattern}: ${count} matches`);
      });
      
      if (analysis.imageDetails.length > 0) {
        console.log('\n🖼️ Sample Images:');
        analysis.imageDetails.forEach((img, index) => {
          console.log(`  ${index + 1}. ${img.src} (${img.width}x${img.height})`);
        });
      }
      
      if (analysis.questionDivDetails.length > 0) {
        console.log('\n📝 Sample Question Divs:');
        analysis.questionDivDetails.forEach((div, index) => {
          console.log(`  ${index + 1}. class: "${div.className}", id: "${div.id}", text: ${div.textLength} chars, images: ${div.hasImages}`);
        });
      }
      
      console.log('\n📄 Sample Text (first 500 chars):');
      console.log(analysis.sampleText.substring(0, 500));
      
      return analysis;
      
    } catch (error) {
      console.error('❌ Analysis error:', error.message);
      return null;
    } finally {
      // Keep page open for manual inspection
      console.log('\n⏳ Page kept open for 30 seconds for manual inspection...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      await page.close();
    }
  }

  async scrapeQuestions(url) {
    console.log(`\n📝 Starting question extraction from: ${url}`);
    
    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const questions = await page.evaluate(() => {
        const results = [];
        
        // Strategy 1: Look for table-based questions
        const tables = Array.from(document.querySelectorAll('table'));
        console.log('Found tables:', tables.length);
        
        tables.forEach((table, tableIndex) => {
          const rows = Array.from(table.rows);
          
          rows.forEach((row, rowIndex) => {
            const cells = Array.from(row.cells);
            const rowText = row.innerText.trim();
            
            // Look for question patterns in this row
            if (rowText.match(/\d+\.\s/) || rowText.includes('soru')) {
              console.log(`Potential question in table ${tableIndex}, row ${rowIndex}:`, rowText.substring(0, 100));
              
              // Try to extract question and options
              const questionMatch = rowText.match(/(\d+)\.\s*(.*?)(?=A\)|$)/s);
              if (questionMatch) {
                const questionNumber = questionMatch[1];
                const questionText = questionMatch[2].trim();
                
                // Look for options
                const optionMatches = rowText.match(/([A-D])\)\s*([^A-D]*?)(?=[A-D]\)|$)/g);
                const options = [];
                
                if (optionMatches) {
                  optionMatches.forEach(optionMatch => {
                    const optionParse = optionMatch.match(/([A-D])\)\s*(.*)/);
                    if (optionParse) {
                      options.push({
                        label: optionParse[1],
                        text: optionParse[2].trim()
                      });
                    }
                  });
                }
                
                if (questionText && options.length >= 4) {
                  // Look for images in this row/cell
                  const images = Array.from(row.querySelectorAll('img')).map(img => ({
                    src: img.src,
                    alt: img.alt || '',
                    width: img.width,
                    height: img.height
                  }));
                  
                  results.push({
                    questionNumber: questionNumber,
                    questionText: questionText,
                    options: options,
                    images: images,
                    source: 'table',
                    sourceDetails: `table_${tableIndex}_row_${rowIndex}`
                  });
                }
              }
            }
          });
        });
        
        // Strategy 2: Look for div-based questions
        const allText = document.body.innerText;
        const questionPattern = /(\d+)\.\s*(.*?)(?=\d+\.|$)/gs;
        let match;
        let questionIndex = 0;
        
        while ((match = questionPattern.exec(allText)) !== null && questionIndex < 50) {
          const questionNumber = match[1];
          const content = match[2].trim();
          
          // Look for A) B) C) D) pattern in content
          if (content.includes('A)') && content.includes('B)') && content.includes('C)') && content.includes('D)')) {
            // Extract question text (before first option)
            const questionTextMatch = content.match(/^(.*?)A\)/s);
            const questionText = questionTextMatch ? questionTextMatch[1].trim() : '';
            
            // Extract options
            const optionMatches = content.match(/([A-D])\)\s*([^A-D]*?)(?=[A-D]\)|$)/g);
            const options = [];
            
            if (optionMatches) {
              optionMatches.forEach(optionMatch => {
                const optionParse = optionMatch.match(/([A-D])\)\s*(.*)/s);
                if (optionParse) {
                  options.push({
                    label: optionParse[1],
                    text: optionParse[2].trim()
                  });
                }
              });
            }
            
            if (questionText && options.length >= 4) {
              results.push({
                questionNumber: questionNumber,
                questionText: questionText,
                options: options,
                images: [], // Will be populated later
                source: 'text_pattern',
                sourceDetails: `pattern_match_${questionIndex}`
              });
              
              questionIndex++;
            }
          }
        }
        
        console.log('Extraction results:', results.length, 'questions found');
        return results;
      });
      
      console.log(`✅ Extracted ${questions.length} questions`);
      
      // Download images for each question
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        console.log(`📷 Processing images for question ${i + 1}...`);
        
        // If no images found in question, look for images near question in page
        if (question.images.length === 0) {
          // Try to find images related to this question
          const questionImages = await page.evaluate((qNum) => {
            // Look for images in the vicinity of question number
            const questionElements = Array.from(document.querySelectorAll('*')).filter(el => 
              el.innerText && el.innerText.includes(`${qNum}.`)
            );
            
            const nearbyImages = [];
            questionElements.forEach(el => {
              // Look for images in parent/siblings
              const parent = el.parentElement;
              if (parent) {
                const images = Array.from(parent.querySelectorAll('img'));
                images.forEach(img => {
                  nearbyImages.push({
                    src: img.src,
                    alt: img.alt || '',
                    width: img.width,
                    height: img.height
                  });
                });
              }
            });
            
            return nearbyImages;
          }, question.questionNumber);
          
          question.images = questionImages;
        }
        
        // Download images
        for (let j = 0; j < question.images.length; j++) {
          const img = question.images[j];
          if (img.src && !img.src.includes('data:') && !img.src.includes('favicon')) {
            const extension = img.src.split('.').pop().split('?')[0] || 'jpg';
            const imageName = `q${question.questionNumber}_img${j + 1}.${extension}`;
            
            const localPath = await this.downloadImage(img.src, imageName);
            if (localPath) {
              img.localPath = localPath;
              img.fileName = imageName;
            }
          }
        }
        
        // Add to our collection
        question.id = `specific_site_${Date.now()}_${i}`;
        question.scrapedAt = new Date().toISOString();
        question.sourceUrl = url;
        this.questionsData.push(question);
      }
      
    } catch (error) {
      console.error('❌ Scraping error:', error.message);
    } finally {
      await page.close();
    }
  }

  async downloadImage(imageUrl, imageName) {
    try {
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream',
        timeout: 15000,
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
          console.log(`  ✅ Downloaded: ${imageName}`);
          resolve(imagePath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`  ❌ Image download failed: ${imageUrl} - ${error.message}`);
      return null;
    }
  }

  async saveResults() {
    console.log('\n💾 Saving extraction results...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Raw questions data
    await fs.writeFile(
      path.join(this.baseDir, `extracted_questions_${timestamp}.json`),
      JSON.stringify(this.questionsData, null, 2)
    );

    // Summary report
    const summary = {
      extraction_session: {
        completed_at: new Date().toISOString(),
        total_questions: this.questionsData.length,
        target_goal: 50,
        success_rate: `${(this.questionsData.length / 50 * 100).toFixed(1)}%`,
        images_downloaded: this.imageCount
      },
      question_breakdown: {
        with_images: this.questionsData.filter(q => q.images && q.images.length > 0).length,
        without_images: this.questionsData.filter(q => !q.images || q.images.length === 0).length,
        average_options: this.questionsData.length > 0 ? 
          (this.questionsData.reduce((sum, q) => sum + q.options.length, 0) / this.questionsData.length).toFixed(1) : 0
      },
      sample_questions: this.questionsData.slice(0, 3).map(q => ({
        number: q.questionNumber,
        question: q.questionText.substring(0, 100) + '...',
        options_count: q.options.length,
        has_images: q.images && q.images.length > 0,
        source: q.source
      }))
    };

    await fs.writeFile(
      path.join(this.baseDir, `extraction_summary_${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );

    console.log('✅ Results saved!');
    return summary;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printSummary(summary) {
    console.log('\n🎉 SPECIFIC SITE EXTRACTION COMPLETED!');
    console.log('='.repeat(60));
    console.log(`🎯 Target: 50 questions`);
    console.log(`📝 Extracted: ${summary.extraction_session.total_questions} questions`);
    console.log(`✅ Success Rate: ${summary.extraction_session.success_rate}`);
    console.log(`🖼️  Images Downloaded: ${summary.extraction_session.images_downloaded}`);
    console.log(`📊 Questions with Images: ${summary.question_breakdown.with_images}`);
    console.log(`📊 Questions without Images: ${summary.question_breakdown.without_images}`);
    console.log(`📊 Average Options per Question: ${summary.question_breakdown.average_options}`);
    
    if (summary.sample_questions.length > 0) {
      console.log('\n📋 Sample Questions:');
      summary.sample_questions.forEach((q, index) => {
        console.log(`   ${index + 1}. Q${q.number}: ${q.question}`);
        console.log(`      Options: ${q.options_count}, Images: ${q.has_images}, Source: ${q.source}`);
      });
    }
    
    console.log('\n📁 Generated Files:');
    console.log(`   - ${this.baseDir}/extracted_questions_${new Date().toISOString().split('T')[0]}.json`);
    console.log(`   - ${this.baseDir}/extraction_summary_${new Date().toISOString().split('T')[0]}.json`);
    console.log(`   - ${this.baseDir}/images/ (${summary.extraction_session.images_downloaded} files)`);
    console.log('='.repeat(60));
  }
}

async function main() {
  const scraper = new SpecificSiteScraper();
  const testUrl = 'https://ehliyetsinavihazirlik.com/index.php/e-sinavlar-haziran-sorulari-1.html';
  
  try {
    await scraper.init();
    
    // Step 1: Analyze site structure
    console.log('🔍 STEP 1: Analyzing site structure...');
    const analysis = await scraper.analyzeSiteStructure(testUrl);
    
    if (analysis) {
      // Step 2: Extract questions
      console.log('\n📝 STEP 2: Extracting questions...');
      await scraper.scrapeQuestions(testUrl);
      
      // Step 3: Save results
      console.log('\n💾 STEP 3: Saving results...');
      const summary = await scraper.saveResults();
      
      scraper.printSummary(summary);
    }
    
  } catch (error) {
    console.error('❌ Extraction error:', error);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
} 