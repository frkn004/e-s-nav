const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class SingleLinkFullTest {
  constructor() {
    this.testUrl = 'https://ehliyetsinavihazirlik.com/index.php/e-sinavlar-haziran-sorulari-1.html';
    this.outputDir = 'single_link_test_results';
    this.extractedQuestions = [];
    this.images = [];
    this.metadata = {};
  }

  async init() {
    await fs.mkdir(this.outputDir, { recursive: true });
    console.log('🧪 Single Link Full Test initialized!');
    console.log(`🎯 Test URL: ${this.testUrl}`);
  }

  async extractFullData() {
    console.log('\n📡 PHASE 1: Extracting complete data...');
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      console.log(`📄 Loading page...`);
      await page.goto(this.testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Tam sayfa analizi
      const fullData = await page.evaluate(() => {
        const bodyText = document.body.textContent;
        const fullHTML = document.documentElement.outerHTML;
        
        // Soru çekme - gelişmiş pattern matching
        const questions = [];
        
        // Method 1: "Soru X" pattern ile
        const soruMatches = bodyText.match(/Soru\s*(\d+)[.:]?\s*([^?]+\?)/gi);
        if (soruMatches) {
          soruMatches.forEach((match, index) => {
            const questionNumber = index + 1;
            const questionText = match.replace(/^Soru\s*\d+[.:]?\s*/, '').trim();
            
            questions.push({
              number: questionNumber,
              text: questionText,
              method: 'soru_pattern',
              raw: match
            });
          });
        }
        
        // Method 2: Numbered questions (1., 2., 3., ...)
        const numberedPattern = /(\d+)\.\s*([^?]+\?)/g;
        const numberedMatches = [...bodyText.matchAll(numberedPattern)];
        
        const numberedQuestions = [];
        numberedMatches.forEach(match => {
          const number = parseInt(match[1]);
          if (number >= 1 && number <= 50) {
            numberedQuestions.push({
              number: number,
              text: match[2].trim(),
              method: 'numbered_pattern',
              raw: match[0]
            });
          }
        });
        
        // Method 3: Question mark ile biten cümleler
        const questionMarkPattern = /[A-ZÜĞŞIÖÇ][^.!?]*\?/g;
        const questionMarkMatches = [...bodyText.matchAll(questionMarkPattern)];
        
        const questionMarkQuestions = questionMarkMatches.slice(0, 50).map((match, index) => ({
          number: index + 1,
          text: match[0].trim(),
          method: 'question_mark_pattern',
          raw: match[0]
        }));
        
                 // Seçenekleri çek - Basit ve güvenilir pattern
         const optionPattern = /([A-D])\)/g;
         const optionMatches = [...bodyText.matchAll(optionPattern)];
        
                 const options = [];
         optionMatches.forEach((match, index) => {
           options.push({
             letter: match[1],
             text: `Seçenek ${match[1]}`, // Basit metin
             raw: match[0],
             index: index + 1
           });
         });
        
        // Görselleri topla
        const images = Array.from(document.querySelectorAll('img[src]')).map((img, index) => ({
          index: index + 1,
          src: img.src,
          alt: img.alt || '',
          title: img.title || '',
          isQuestionImage: img.src.includes('soru') || img.src.includes('question')
        }));
        
        // Metadata
        const metadata = {
          pageTitle: document.title,
          url: window.location.href,
          totalTextLength: bodyText.length,
          optionCount: options.length,
          estimatedQuestions: Math.floor(options.length / 4),
          imageCount: images.length,
          questionImageCount: images.filter(img => img.isQuestionImage).length,
          extractionMethods: {
            soruPattern: questions.length,
            numberedPattern: numberedQuestions.length,
            questionMarkPattern: questionMarkQuestions.length
          }
        };
        
        return {
          questions: {
            soruMethod: questions,
            numberedMethod: numberedQuestions,
            questionMarkMethod: questionMarkQuestions
          },
          options: options,
          images: images,
          metadata: metadata,
          rawText: bodyText.substring(0, 2000)
        };
      });
      
      this.extractedQuestions = fullData.questions;
      this.images = fullData.images;
      this.metadata = fullData.metadata;
      this.options = fullData.options;
      this.rawText = fullData.rawText;
      
      console.log('✅ Data extraction completed!');
      console.log(`📊 Found ${this.metadata.optionCount} options → ${this.metadata.estimatedQuestions} questions`);
      console.log(`🖼️  Found ${this.metadata.imageCount} images (${this.metadata.questionImageCount} question-related)`);
      
      return fullData;
      
    } catch (error) {
      console.error('❌ Extraction error:', error.message);
      throw error;
    } finally {
      await browser.close();
    }
  }

  async analyzeQuestions() {
    console.log('\n🔍 PHASE 2: Analyzing extracted questions...');
    
    // En iyi method'u belirle
    const methods = this.extractedQuestions;
    let bestMethod = 'soruMethod';
    let bestQuestions = methods.soruMethod;
    
    if (methods.numberedMethod.length === 50) {
      bestMethod = 'numberedMethod';
      bestQuestions = methods.numberedMethod;
    } else if (methods.questionMarkMethod.length === 50) {
      bestMethod = 'questionMarkMethod';
      bestQuestions = methods.questionMarkMethod;
    }
    
    console.log(`🏆 Best extraction method: ${bestMethod}`);
    console.log(`📚 Questions found: ${bestQuestions.length}`);
    
    // Seçenekleri gruplara böl (her 4 seçenek = 1 soru)
    const groupedOptions = [];
    for (let i = 0; i < this.options.length; i += 4) {
      const group = this.options.slice(i, i + 4);
      if (group.length === 4) {
        groupedOptions.push({
          questionNumber: Math.floor(i / 4) + 1,
          options: group
        });
      }
    }
    
    // Final sorular
    const finalQuestions = [];
    for (let i = 0; i < Math.min(bestQuestions.length, groupedOptions.length); i++) {
      finalQuestions.push({
        id: i + 1,
        question: bestQuestions[i],
        options: groupedOptions[i]?.options || [],
        extractionMethod: bestMethod,
        hasImage: this.images.some(img => img.isQuestionImage),
        timestamp: new Date().toISOString()
      });
    }
    
    this.finalQuestions = finalQuestions;
    
    console.log(`✅ Analysis completed: ${finalQuestions.length} complete questions`);
    
    return finalQuestions;
  }

  async saveResults() {
    console.log('\n💾 PHASE 3: Saving results...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Ana sonuç dosyası
    const result = {
      testInfo: {
        url: this.testUrl,
        timestamp: new Date().toISOString(),
        extractionMethod: 'advanced_pattern_matching',
        success: true
      },
      summary: {
        totalQuestions: this.finalQuestions.length,
        totalOptions: this.options.length,
        totalImages: this.images.length,
        questionImages: this.images.filter(img => img.isQuestionImage).length,
        pageTitle: this.metadata.pageTitle
      },
      questions: this.finalQuestions,
      metadata: this.metadata,
      extractionMethods: this.extractedQuestions,
      rawSample: this.rawText
    };
    
    await fs.writeFile(
      path.join(this.outputDir, `full_test_${timestamp}.json`),
      JSON.stringify(result, null, 2)
    );
    
    // Sadece sorular
    await fs.writeFile(
      path.join(this.outputDir, `questions_only_${timestamp}.json`),
      JSON.stringify(this.finalQuestions, null, 2)
    );
    
    // Özet rapor
    const summary = {
      date: timestamp,
      url: this.testUrl,
      totalQuestions: this.finalQuestions.length,
      averageQuestionLength: this.finalQuestions.reduce((sum, q) => sum + q.question.text.length, 0) / this.finalQuestions.length,
      hasImages: this.images.length > 0,
      extractionSuccess: this.finalQuestions.length === 50 ? 'PERFECT' : 'PARTIAL',
      estimatedTimePerPage: '30-45 seconds',
      recommendedForProduction: this.finalQuestions.length >= 40
    };
    
    await fs.writeFile(
      path.join(this.outputDir, `summary_${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );
    
    console.log(`✅ Results saved to ${this.outputDir}/`);
    
    return summary;
  }

  async printDetailedResults() {
    console.log('\n📋 DETAILED TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`🎯 Test URL: ${this.testUrl}`);
    console.log(`📚 Questions Extracted: ${this.finalQuestions.length}`);
    console.log(`📝 Options Found: ${this.options.length}`);
    console.log(`🖼️  Images Found: ${this.images.length}`);
    console.log(`📄 Page Title: ${this.metadata.pageTitle}`);
    
    console.log('\n🔍 EXTRACTION METHODS COMPARISON:');
    Object.entries(this.metadata.extractionMethods).forEach(([method, count]) => {
      console.log(`   ${method}: ${count} questions`);
    });
    
    console.log('\n📚 SAMPLE QUESTIONS:');
    this.finalQuestions.slice(0, 3).forEach((q, i) => {
      console.log(`\n   Question ${q.id}:`);
      console.log(`   Q: ${q.question.text.substring(0, 100)}...`);
      q.options.forEach(opt => {
        console.log(`      ${opt.letter}) ${opt.text.substring(0, 50)}...`);
      });
    });
    
    console.log('\n🖼️  SAMPLE IMAGES:');
    this.images.slice(0, 5).forEach((img, i) => {
      console.log(`   ${i+1}. ${img.src.split('/').pop()} ${img.isQuestionImage ? '(question-related)' : ''}`);
    });
    
    console.log('\n⏱️  PERFORMANCE ESTIMATES:');
    console.log(`   Single page time: ~30-45 seconds`);
    console.log(`   255 pages estimated time: ${Math.round(255 * 37.5 / 60)} minutes`);
    console.log(`   Success rate: ${this.finalQuestions.length >= 40 ? '🟢 HIGH' : '🟡 MEDIUM'}`);
    
    console.log('='.repeat(80));
  }

  async runFullTest() {
    const startTime = Date.now();
    
    try {
      await this.init();
      await this.extractFullData();
      await this.analyzeQuestions();
      const summary = await this.saveResults();
      await this.printDetailedResults();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n🎉 FULL TEST COMPLETED in ${duration} seconds!`);
      
      return {
        success: true,
        duration: duration,
        questionsFound: this.finalQuestions.length,
        summary: summary
      };
      
    } catch (error) {
      console.error('❌ Full test error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

async function main() {
  const tester = new SingleLinkFullTest();
  const result = await tester.runFullTest();
  
  if (result.success) {
    console.log('\n✅ Ready for production scaling!');
  } else {
    console.log('\n❌ Need to fix issues before scaling');
  }
}

if (require.main === module) {
  console.log('🧪 Starting Single Link Full Test...');
  main().catch(console.error);
}

module.exports = { SingleLinkFullTest }; 