const { EhliyetScraper } = require('./enhanced-scraper');
const { DeepSeekAPI, estimateTokenCount } = require('../lib/deepseek-api');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

class AIDataPipeline {
  constructor() {
    this.scraper = new EhliyetScraper();
    this.deepseek = new DeepSeekAPI(process.env.DEEPSEEK_API_KEY);
    this.prisma = new PrismaClient();
    this.results = {
      scraped: 0,
      analyzed: 0,
      imported: 0,
      errors: []
    };
  }

  async init() {
    console.log('🚀 Initializing AI Data Pipeline...');
    await this.scraper.init();
    await this.prisma.$connect();
  }

  async runFullPipeline() {
    console.log('📊 Starting full data collection and AI analysis pipeline...\n');

    try {
      // Step 1: Scrape questions
      console.log('📡 STEP 1: Scraping questions from websites...');
      await this.scraper.scrapeAll();
      this.results.scraped = this.scraper.questionsData.length;
      console.log(`✅ Scraped ${this.results.scraped} questions\n`);

      if (this.results.scraped === 0) {
        console.log('❌ No questions scraped. Exiting pipeline.');
        return;
      }

      // Step 2: AI Analysis
      console.log('🤖 STEP 2: AI Analysis with DeepSeek...');
      const analyzedQuestions = await this.analyzeWithAI(this.scraper.questionsData);
      this.results.analyzed = analyzedQuestions.length;
      console.log(`✅ Analyzed ${this.results.analyzed} questions\n`);

      // Step 3: Import to database
      console.log('💾 STEP 3: Importing to database...');
      const imported = await this.importToDatabase(analyzedQuestions);
      this.results.imported = imported;
      console.log(`✅ Imported ${this.results.imported} questions\n`);

      // Step 4: Generate reports
      console.log('📈 STEP 4: Generating reports...');
      await this.generateReports(analyzedQuestions);
      console.log('✅ Reports generated\n');

      // Step 5: Prepare fine-tuning data
      console.log('🎯 STEP 5: Preparing fine-tuning data...');
      await this.prepareFinetuning(analyzedQuestions);
      console.log('✅ Fine-tuning data prepared\n');

      this.printSummary();

    } catch (error) {
      console.error('❌ Pipeline error:', error);
      this.results.errors.push(error.message);
    } finally {
      await this.cleanup();
    }
  }

  async analyzeWithAI(questions) {
    console.log(`🤖 Starting AI analysis of ${questions.length} questions...`);
    
    let totalCost = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    
    // Process in batches for better performance
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(questions.length/batchSize)}`);
      
      const batchPromises = batch.map(async (question) => {
        try {
          // Estimate input tokens
          const inputText = JSON.stringify(question);
          const inputTokens = estimateTokenCount(inputText);
          totalTokensIn += inputTokens;
          
          const analyzed = await this.deepseek.analyzeQuestion(question);
          
          // Estimate output tokens
          const outputText = JSON.stringify(analyzed.ai_analysis);
          const outputTokens = estimateTokenCount(outputText);
          totalTokensOut += outputTokens;
          
          // Calculate cost
          const cost = this.deepseek.estimateCost(inputTokens, outputTokens);
          totalCost += cost.totalCost;
          
          return analyzed;
        } catch (error) {
          console.error(`Failed to analyze question ${question.id}:`, error.message);
          return this.deepseek.createFallbackAnalysis(question);
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Batch error for question ${i + index}:`, result.reason);
          results.push(this.deepseek.createFallbackAnalysis(batch[index]));
        }
      });
      
      // Rate limiting
      if (i + batchSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`💰 AI Analysis Cost: $${totalCost.toFixed(4)}`);
    console.log(`📊 Tokens: ${totalTokensIn} in, ${totalTokensOut} out`);
    
    return results;
  }

  async importToDatabase(questions) {
    console.log(`💾 Importing ${questions.length} questions to database...`);
    
    let imported = 0;
    let errors = 0;
    
    for (const question of questions) {
      try {
        // Check if question already exists
        const existing = await this.prisma.question.findFirst({
          where: {
            question_text: question.questionText,
            source_url: question.sourceUrl
          }
        });
        
        if (existing) {
          console.log(`⚠️ Question already exists: ${question.questionNumber}`);
          continue;
        }
        
        // Prepare question data
        const questionData = {
          question_text: question.questionText,
          category: question.category || 'genel',
          difficulty: question.ai_analysis?.difficulty || 'orta',
          options: JSON.stringify(question.options),
          correct_answer: question.correctAnswer || 'A',
          explanation: question.explanation || question.ai_analysis?.enhanced_explanation || '',
          image_paths: question.downloadedImages ? JSON.stringify(question.downloadedImages.map(img => img.localPath)) : null,
          source_url: question.sourceUrl || '',
          ai_analysis: question.ai_analysis ? JSON.stringify(question.ai_analysis) : null,
          quality_score: question.ai_analysis?.quality_score || 7,
          topics: question.ai_analysis?.topics ? JSON.stringify(question.ai_analysis.topics) : JSON.stringify(['genel']),
          created_at: new Date()
        };
        
        // Insert question
        await this.prisma.question.create({
          data: questionData
        });
        
        imported++;
        
        if (imported % 10 === 0) {
          console.log(`✅ Imported ${imported}/${questions.length} questions`);
        }
        
      } catch (error) {
        console.error(`Failed to import question ${question.questionNumber}:`, error.message);
        errors++;
        this.results.errors.push(`Import error: ${error.message}`);
      }
    }
    
    console.log(`✅ Successfully imported ${imported} questions`);
    if (errors > 0) {
      console.log(`⚠️ ${errors} questions failed to import`);
    }
    
    return imported;
  }

  async generateReports(questions) {
    const reports = {
      summary: {
        total_questions: questions.length,
        by_category: {},
        by_difficulty: {},
        by_quality: {},
        avg_quality_score: 0,
        with_images: 0,
        with_ai_analysis: 0
      },
      top_quality_questions: [],
      low_quality_questions: [],
      category_distribution: {},
      recommendations: []
    };
    
    // Calculate statistics
    let totalQuality = 0;
    let qualityCount = 0;
    
    questions.forEach(q => {
      // Category distribution
      const category = q.category || 'genel';
      reports.summary.by_category[category] = (reports.summary.by_category[category] || 0) + 1;
      
      // Difficulty distribution
      const difficulty = q.ai_analysis?.difficulty || 'orta';
      reports.summary.by_difficulty[difficulty] = (reports.summary.by_difficulty[difficulty] || 0) + 1;
      
      // Quality analysis
      if (q.ai_analysis?.quality_score) {
        const score = q.ai_analysis.quality_score;
        totalQuality += score;
        qualityCount++;
        
        const qualityRange = score >= 8 ? 'high' : score >= 6 ? 'medium' : 'low';
        reports.summary.by_quality[qualityRange] = (reports.summary.by_quality[qualityRange] || 0) + 1;
        
        // Top and low quality questions
        if (score >= 9) {
          reports.top_quality_questions.push({
            id: q.id,
            question: q.questionText.substring(0, 100) + '...',
            category: q.category,
            score: score
          });
        } else if (score <= 5) {
          reports.low_quality_questions.push({
            id: q.id,
            question: q.questionText.substring(0, 100) + '...',
            category: q.category,
            score: score
          });
        }
      }
      
      // Other counts
      if (q.downloadedImages?.length > 0) reports.summary.with_images++;
      if (q.ai_analysis) reports.summary.with_ai_analysis++;
    });
    
    reports.summary.avg_quality_score = qualityCount > 0 ? (totalQuality / qualityCount).toFixed(2) : 0;
    
    // Generate recommendations
    reports.recommendations = this.generateRecommendations(reports.summary);
    
    // Save reports
    const reportsDir = path.join('scraped_data', 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    await fs.writeFile(
      path.join(reportsDir, 'analysis_report.json'),
      JSON.stringify(reports, null, 2)
    );
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(reports);
    await fs.writeFile(
      path.join(reportsDir, 'analysis_report.html'),
      htmlReport
    );
    
    console.log(`📊 Reports saved to ${reportsDir}`);
    return reports;
  }

  generateRecommendations(summary) {
    const recommendations = [];
    
    // Category balance recommendations
    const categories = Object.keys(summary.by_category);
    const totalQuestions = summary.total_questions;
    
    categories.forEach(category => {
      const percentage = (summary.by_category[category] / totalQuestions) * 100;
      if (percentage < 15) {
        recommendations.push(`${category} kategorisinde daha fazla soru eklenmeli (mevcut: %${percentage.toFixed(1)})`);
      }
    });
    
    // Quality recommendations
    if (summary.avg_quality_score < 7) {
      recommendations.push('Ortalama soru kalitesi düşük, daha fazla AI analizi ve düzenleme gerekli');
    }
    
    // Image recommendations
    const imagePercentage = (summary.with_images / totalQuestions) * 100;
    if (imagePercentage < 30) {
      recommendations.push(`Görsel içeren soru oranı düşük (%${imagePercentage.toFixed(1)}), daha fazla görsel soru eklenmeli`);
    }
    
    return recommendations;
  }

  generateHTMLReport(reports) {
    return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ehliyet Soru Analiz Raporu</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
        .stat { display: inline-block; margin: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
        .category { background: #e3f2fd; }
        .difficulty { background: #fff3e0; }
        .quality { background: #e8f5e8; }
        .recommendation { background: #fff9c4; padding: 10px; margin: 5px 0; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Ehliyet Soru Analiz Raporu</h1>
      <p>Tarih: ${new Date().toLocaleString('tr-TR')}</p>
      
      <div class="card">
        <h2>Genel İstatistikler</h2>
        <div class="stat">Toplam Soru: ${reports.summary.total_questions}</div>
        <div class="stat">Ortalama Kalite: ${reports.summary.avg_quality_score}/10</div>
        <div class="stat">Görsel Sorular: ${reports.summary.with_images}</div>
        <div class="stat">AI Analizi: ${reports.summary.with_ai_analysis}</div>
      </div>
      
      <div class="card category">
        <h2>Kategori Dağılımı</h2>
        ${Object.entries(reports.summary.by_category).map(([cat, count]) => 
          `<div class="stat">${cat}: ${count}</div>`
        ).join('')}
      </div>
      
      <div class="card difficulty">
        <h2>Zorluk Dağılımı</h2>
        ${Object.entries(reports.summary.by_difficulty).map(([diff, count]) => 
          `<div class="stat">${diff}: ${count}</div>`
        ).join('')}
      </div>
      
      <div class="card quality">
        <h2>Kalite Dağılımı</h2>
        ${Object.entries(reports.summary.by_quality).map(([qual, count]) => 
          `<div class="stat">${qual}: ${count}</div>`
        ).join('')}
      </div>
      
      <div class="card">
        <h2>Öneriler</h2>
        ${reports.recommendations.map(rec => 
          `<div class="recommendation">• ${rec}</div>`
        ).join('')}
      </div>
      
      <div class="card">
        <h2>En Kaliteli Sorular (Top 10)</h2>
        <table>
          <tr><th>Kategori</th><th>Soru</th><th>Puan</th></tr>
          ${reports.top_quality_questions.slice(0, 10).map(q => 
            `<tr><td>${q.category}</td><td>${q.question}</td><td>${q.score}</td></tr>`
          ).join('')}
        </table>
      </div>
    </body>
    </html>`;
  }

  async prepareFinetuning(questions) {
    console.log('🎯 Preparing fine-tuning dataset...');
    
    const finetuningData = await this.deepseek.prepareFinetuningData(questions);
    
    // Save fine-tuning data
    const finetuningDir = path.join('scraped_data', 'finetuning');
    await fs.mkdir(finetuningDir, { recursive: true });
    
    // Save in JSONL format (required for fine-tuning)
    const jsonlData = finetuningData.map(item => JSON.stringify(item)).join('\n');
    await fs.writeFile(
      path.join(finetuningDir, 'ehliyet_training_data.jsonl'),
      jsonlData
    );
    
    // Save metadata
    const metadata = {
      total_examples: finetuningData.length,
      created_at: new Date().toISOString(),
      source_questions: questions.length,
      categories: [...new Set(questions.map(q => q.category))],
      estimated_training_cost: `$${(finetuningData.length * 0.0001).toFixed(4)}`
    };
    
    await fs.writeFile(
      path.join(finetuningDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    console.log(`✅ Fine-tuning data prepared: ${finetuningData.length} examples`);
    console.log(`📁 Files saved to: ${finetuningDir}`);
  }

  printSummary() {
    console.log('\n🎉 PIPELINE COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`📊 Scraped Questions: ${this.results.scraped}`);
    console.log(`🤖 AI Analyzed: ${this.results.analyzed}`);
    console.log(`💾 Database Imported: ${this.results.imported}`);
    console.log(`❌ Errors: ${this.results.errors.length}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\n📁 Output files:');
    console.log('- scraped_data/raw_questions.json');
    console.log('- scraped_data/questions_for_db.json');
    console.log('- scraped_data/reports/analysis_report.json');
    console.log('- scraped_data/reports/analysis_report.html');
    console.log('- scraped_data/finetuning/ehliyet_training_data.jsonl');
    console.log('='.repeat(50));
  }

  async cleanup() {
    console.log('🧹 Cleaning up...');
    await this.scraper.close();
    await this.prisma.$disconnect();
  }
}

// Main execution function
async function main() {
  const pipeline = new AIDataPipeline();
  
  try {
    await pipeline.init();
    await pipeline.runFullPipeline();
  } catch (error) {
    console.error('❌ Main execution error:', error);
  }
}

// Export for use in other modules
module.exports = { AIDataPipeline };

// Run if called directly
if (require.main === module) {
  // Check environment variables
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('❌ DEEPSEEK_API_KEY environment variable is required');
    process.exit(1);
  }
  
  main().catch(console.error);
} 