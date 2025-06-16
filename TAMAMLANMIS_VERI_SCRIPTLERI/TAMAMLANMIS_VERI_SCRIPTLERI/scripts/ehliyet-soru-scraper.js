const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class EhliyetSoruScraper {
  constructor() {
    this.browser = null;
    this.baseDir = 'ehliyet_soru_extraction';
    this.imageDir = path.join(this.baseDir, 'images');
    this.questionsData = [];
    this.imageCount = 0;
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
    
    console.log('🎯 EhliyetSoru.com Scraper initialized!');
    console.log(`📁 Output directory: ${this.baseDir}`);
  }

  async scrapeEhliyetSoru(url) {
    console.log(`\n🚀 SCRAPING: ${url}`);
    console.log('='.repeat(80));
    
    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('📝 Extracting questions with hash-based strategy...');
      
      const questions = await page.evaluate(() => {
        const results = [];
        const bodyText = document.body.innerText;
        
        // Hash-based extraction optimized for ehliyet-soru.com
        // Pattern: #category #number question... A option B option C option D option
        const hashPattern = /#(\w+)\s+#(\d+)\s+(.*?)(?=#\w+\s+#\d+|whatsapp icon|$)/gs;
        let match;
        
        while ((match = hashPattern.exec(bodyText)) !== null) {
          const category = match[1];
          const number = parseInt(match[2]);
          const content = match[3].trim();
          
          // Split content into lines for better parsing
          const lines = content.split('\n').map(line => line.trim()).filter(line => line);
          
          // Find question text (usually contains '?' or is the longest line before options)
          let questionText = '';
          let questionEndIndex = -1;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip common non-question lines
            if (line.includes('/ 50') || 
                line.includes('CEVAP AÇIKLAMASI') ||
                line.length < 10) {
              continue;
            }
            
            // Check if this line contains the question
            if (line.includes('?') || 
                (line.length > 30 && !line.match(/^[A-D]\s/) && i < 5)) {
              questionText = line;
              questionEndIndex = i;
              break;
            }
          }
          
          // If no question found with '?', take the longest meaningful line
          if (!questionText && lines.length > 0) {
            const meaningfulLines = lines.filter(line => 
              line.length > 20 && 
              !line.match(/^[A-D]\s/) && 
              !line.includes('/ 50') &&
              !line.includes('CEVAP')
            );
            
            if (meaningfulLines.length > 0) {
              questionText = meaningfulLines[0];
              questionEndIndex = lines.indexOf(questionText);
            }
          }
          
          // Extract options (A, B, C, D)
          const options = {};
          const optionPattern = /^([A-D])\s+(.+)$/;
          
          for (let i = questionEndIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            const optionMatch = line.match(optionPattern);
            
            if (optionMatch) {
              const label = optionMatch[1];
              const text = optionMatch[2];
              
              // Skip if option text is too short or contains unwanted content
              if (text.length > 1 && 
                  !text.includes('/ 50') && 
                  !text.includes('CEVAP AÇIKLAMASI')) {
                options[label] = text;
              }
            }
            
            // Stop at next question or unwanted content
            if (line.includes('/ 50') || line.includes('CEVAP AÇIKLAMASI')) {
              break;
            }
          }
          
          // Extract explanation if present
          let explanation = '';
          const explanationMatch = content.match(/CEVAP AÇIKLAMASI:\s*(.*?)(?=whatsapp|$)/s);
          if (explanationMatch) {
            explanation = explanationMatch[1].trim().split('\n')[0];
          }
          
          // Only add if we have a question and at least 3 options
          if (questionText && Object.keys(options).length >= 3) {
            results.push({
              number: number,
              question: questionText,
              category: category,
              options: options,
              explanation: explanation,
              raw: content.substring(0, 500) // For debugging
            });
          }
        }
        
        return results;
      });
      
      console.log(`✅ Extracted ${questions.length} questions using hash-based strategy`);
      
      // Extract images
      console.log('📷 Extracting and downloading images...');
      
      const allImages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height,
          className: img.className,
          // Try to associate with question by looking at parent content
          parentText: img.parentElement ? img.parentElement.innerText.substring(0, 200) : ''
        })).filter(img => 
          img.src &&
          !img.src.includes('favicon') &&
          !img.src.includes('icon') &&
          img.width > 30 && img.height > 30 &&
          !img.src.includes('logo')
        );
      });
      
      console.log(`🖼️ Found ${allImages.length} potential question images`);
      
      // Process each question and assign images
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        console.log(`📝 Processing Q${question.number}: ${question.question.substring(0, 60)}...`);
        
        // Find images related to this question
        const questionImages = allImages.filter(img => 
          img.parentText.includes(`#${question.number}`) ||
          img.parentText.includes(`${question.number} /`) ||
          img.parentText.includes(question.category) ||
          (i < allImages.length && Math.abs(allImages.indexOf(img) - i * 8) < 10) // Approximate position
        ).slice(0, 3); // Max 3 images per question
        
        // Download images
        for (let j = 0; j < questionImages.length; j++) {
          const img = questionImages[j];
          const extension = img.src.split('.').pop().split('?')[0] || 'jpg';
          const imageName = `q${question.number}_${question.category}_img${j + 1}.${extension}`;
          
          const localPath = await this.downloadImage(img.src, imageName);
          if (localPath) {
            img.localPath = localPath;
            img.fileName = imageName;
          }
        }
        
        // Enrich question object
        const enrichedQuestion = {
          id: `ehliyet_soru_${Date.now()}_${i}`,
          number: question.number,
          question: question.question,
          category: question.category,
          options: question.options,
          explanation: question.explanation,
          images: questionImages,
          sourceUrl: url,
          scrapedAt: new Date().toISOString(),
          scrapingMethod: 'hash_based_optimized',
          raw: question.raw
        };
        
        this.questionsData.push(enrichedQuestion);
        
        console.log(`   ✅ Q${question.number} processed - ${Object.keys(question.options).length} options, ${questionImages.length} images`);
      }
      
    } catch (error) {
      console.error(`❌ Scraping failed:`, error.message);
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
    console.log('\n💾 Saving extraction results...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Raw questions data
    await fs.writeFile(
      path.join(this.baseDir, `ehliyet_soru_questions_${timestamp}.json`),
      JSON.stringify(this.questionsData, null, 2)
    );

    // Clean questions for database (without raw field)
    const cleanQuestions = this.questionsData.map(q => {
      const { raw, ...cleanQuestion } = q;
      return cleanQuestion;
    });

    await fs.writeFile(
      path.join(this.baseDir, `ehliyet_soru_clean_${timestamp}.json`),
      JSON.stringify(cleanQuestions, null, 2)
    );

    // Summary report
    const categoryBreakdown = {};
    this.questionsData.forEach(q => {
      categoryBreakdown[q.category] = (categoryBreakdown[q.category] || 0) + 1;
    });

    const summary = {
      extraction_session: {
        completed_at: new Date().toISOString(),
        source: 'ehliyet-soru.com',
        total_questions: this.questionsData.length,
        target_goal: 50,
        success_rate: `${(this.questionsData.length / 50 * 100).toFixed(1)}%`,
        images_downloaded: this.imageCount,
        extraction_method: 'hash_based_optimized'
      },
      question_breakdown: {
        by_category: categoryBreakdown,
        with_images: this.questionsData.filter(q => q.images && q.images.length > 0).length,
        without_images: this.questionsData.filter(q => !q.images || q.images.length === 0).length,
        with_explanations: this.questionsData.filter(q => q.explanation && q.explanation.length > 10).length,
        average_options: this.questionsData.length > 0 ? 
          (this.questionsData.reduce((sum, q) => sum + Object.keys(q.options).length, 0) / this.questionsData.length).toFixed(1) : 0
      },
      quality_analysis: {
        complete_questions: this.questionsData.filter(q => 
          q.question && q.question.length > 10 && Object.keys(q.options).length >= 4
        ).length,
        questions_with_4_options: this.questionsData.filter(q => Object.keys(q.options).length === 4).length,
        questions_with_explanations: this.questionsData.filter(q => q.explanation && q.explanation.length > 10).length
      },
      sample_questions: this.questionsData.slice(0, 3).map(q => ({
        number: q.number,
        category: q.category,
        question: q.question.substring(0, 100) + '...',
        options_count: Object.keys(q.options).length,
        has_images: q.images && q.images.length > 0,
        has_explanation: !!(q.explanation && q.explanation.length > 10)
      }))
    };

    await fs.writeFile(
      path.join(this.baseDir, `ehliyet_soru_summary_${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );

    console.log('✅ All results saved!');
    return summary;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printSummary(summary) {
    console.log('\n🎯 EHLIYET-SORU.COM EXTRACTION COMPLETED!');
    console.log('='.repeat(70));
    console.log(`🎯 Source: ${summary.extraction_session.source}`);
    console.log(`📝 Extracted: ${summary.extraction_session.total_questions} questions`);
    console.log(`✅ Success Rate: ${summary.extraction_session.success_rate}`);
    console.log(`🖼️ Images Downloaded: ${summary.extraction_session.images_downloaded}`);
    console.log(`📚 Method: ${summary.extraction_session.extraction_method}`);
    
    console.log('\n📊 Category Breakdown:');
    Object.entries(summary.question_breakdown.by_category).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} questions`);
    });
    
    console.log('\n🔍 Quality Analysis:');
    console.log(`   Complete Questions: ${summary.quality_analysis.complete_questions}/${summary.extraction_session.total_questions}`);
    console.log(`   Questions with 4 Options: ${summary.quality_analysis.questions_with_4_options}`);
    console.log(`   Questions with Explanations: ${summary.quality_analysis.questions_with_explanations}`);
    console.log(`   Questions with Images: ${summary.question_breakdown.with_images}`);
    
    if (summary.sample_questions.length > 0) {
      console.log('\n📋 Sample Questions:');
      summary.sample_questions.forEach((q, index) => {
        console.log(`   ${index + 1}. Q${q.number} [${q.category}]: ${q.question}`);
        console.log(`      Options: ${q.options_count}, Images: ${q.has_images}, Explanation: ${q.has_explanation}`);
      });
    }
    
    console.log('\n📁 Generated Files:');
    console.log(`   - ${this.baseDir}/ehliyet_soru_questions_${new Date().toISOString().split('T')[0]}.json (with raw data)`);
    console.log(`   - ${this.baseDir}/ehliyet_soru_clean_${new Date().toISOString().split('T')[0]}.json (database ready)`);
    console.log(`   - ${this.baseDir}/ehliyet_soru_summary_${new Date().toISOString().split('T')[0]}.json (analysis report)`);
    console.log(`   - ${this.baseDir}/images/ (${summary.extraction_session.images_downloaded} files)`);
    console.log('='.repeat(70));
  }
}

async function main() {
  const scraper = new EhliyetSoruScraper();
  const testUrl = 'https://ehliyet-soru.com/test-1-haziran-2025-ehliyet-deneme-sinavi-968';
  
  try {
    await scraper.init();
    
    console.log('🎯 STEP 1: Optimized extraction from ehliyet-soru.com');
    await scraper.scrapeEhliyetSoru(testUrl);
    
    console.log('\n💾 STEP 2: Saving results and generating reports');
    const summary = await scraper.saveResults();
    
    scraper.printSummary(summary);
    
  } catch (error) {
    console.error('❌ Extraction error:', error);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EhliyetSoruScraper }; 