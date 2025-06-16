const { DeepSeekAPI } = require('../lib/deepseek-api');
const fs = require('fs').promises;
const path = require('path');

class DataAnalyzer {
  constructor() {
    this.deepseek = new DeepSeekAPI(process.env.DEEPSEEK_API_KEY);
    this.analysisResults = [];
    this.totalCost = 0;
  }

  async analyzeScrapedData() {
    console.log('🤖 Starting AI analysis of scraped data...');
    
    // Toplanan veriyi oku
    const rawData = await fs.readFile('scraped_data/scraped_questions.json', 'utf8');
    const questions = JSON.parse(rawData);
    
    console.log(`📊 Found ${questions.length} questions to analyze`);
    
    // İlk 10 soruyu analiz et (demo için)
    const samplesToAnalyze = questions.slice(0, 10);
    
    console.log(`🔬 Analyzing first ${samplesToAnalyze.length} questions...\n`);
    
    for (let i = 0; i < samplesToAnalyze.length; i++) {
      const question = samplesToAnalyze[i];
      console.log(`\n📝 Analyzing question ${i + 1}/${samplesToAnalyze.length}`);
      console.log(`Category: ${question.category}`);
      console.log(`Question: ${question.questionText.substring(0, 100)}...`);
      
      try {
        const analysis = await this.analyzeQuestion(question);
        this.analysisResults.push(analysis);
        
        console.log(`✅ Analysis completed`);
        console.log(`   Difficulty: ${analysis.ai_analysis?.difficulty || 'N/A'}`);
        console.log(`   Quality Score: ${analysis.ai_analysis?.quality_score || 'N/A'}/10`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Analysis failed: ${error.message}`);
      }
    }
    
    await this.saveAnalysisResults();
    this.printSummary();
  }

  async analyzeQuestion(questionData) {
    // DeepSeek'e soru analizi yaptır
    const prompt = `Bu ehliyet sorusunu detaylı analiz et:

SORU: ${questionData.questionText}

SEÇENEKLER:
${questionData.options.map(opt => `${opt.label}) ${opt.text}`).join('\n')}

MEVCUT AÇIKLAMA: ${questionData.explanation || 'Yok'}

LÜTFEN ŞU ANALİZİ YAP:
1. Zorluk seviyesi (kolay/orta/zor)
2. Soru kalitesi (1-10 puan)
3. Hangi alt konulara ait (detaylı)
4. Doğru cevap hangisi ve neden
5. Açıklamanın kalitesi nasıl
6. Öğrenci için öneriler

JSON formatında yanıt ver:
{
  "difficulty": "orta",
  "quality_score": 8,
  "sub_topics": ["kavşak kuralları", "trafik işaretleri"],
  "correct_answer": "C",
  "reasoning": "Doğru cevap C çünkü...",
  "explanation_quality": "iyi",
  "study_tips": ["Kavşak kurallarını tekrar et", "Görsel örnekleri incele"],
  "improvements": ["Açıklamaya görsel eklenebilir"]
}`;

    const messages = [
      {
        role: 'system',
        content: 'Sen ehliyet eğitimi uzmanısın. Soruları analiz edip öğretici içerik üretiyorsun. Her zaman Türkçe yanıt ver ve verilen JSON formatını kullan.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const result = await this.deepseek.chatCompletion(messages, {
      temperature: 0.3,
      max_tokens: 1000
    });

    if (result.success) {
      try {
        // JSON çıktısını parse et
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          
          // Maliyet hesapla
          if (result.usage) {
            const cost = this.deepseek.estimateCost(
              result.usage.prompt_tokens || 0,
              result.usage.completion_tokens || 0
            );
            this.totalCost += cost.totalCost;
          }
          
          return {
            ...questionData,
            ai_analysis: analysis,
            analysis_metadata: {
              analyzed_at: new Date().toISOString(),
              model: 'deepseek-chat',
              cost: result.usage
            }
          };
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError.message);
      }
    }

    // Fallback analysis
    return {
      ...questionData,
      ai_analysis: {
        difficulty: 'orta',
        quality_score: 7,
        sub_topics: [questionData.category],
        correct_answer: 'A',
        reasoning: 'Otomatik analiz yapılamadı',
        explanation_quality: 'belirsiz',
        study_tips: ['Bu konuyu tekrar edin'],
        improvements: ['Manuel inceleme gerekli']
      }
    };
  }

  async saveAnalysisResults() {
    console.log('\n💾 Saving analysis results...');
    
    // Detaylı analiz sonuçları
    await fs.writeFile(
      path.join('scraped_data', 'ai_analysis_results.json'),
      JSON.stringify(this.analysisResults, null, 2)
    );

    // Özet rapor
    const summary = {
      total_analyzed: this.analysisResults.length,
      total_cost: `$${this.totalCost.toFixed(4)}`,
      difficulty_distribution: this.getDifficultyDistribution(),
      quality_distribution: this.getQualityDistribution(),
      top_quality_questions: this.getTopQualityQuestions(),
      improvement_suggestions: this.getImprovementSuggestions(),
      generated_at: new Date().toISOString()
    };

    await fs.writeFile(
      path.join('scraped_data', 'analysis_summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('✅ Analysis results saved');
  }

  getDifficultyDistribution() {
    const distribution = {};
    this.analysisResults.forEach(result => {
      const difficulty = result.ai_analysis?.difficulty || 'belirsiz';
      distribution[difficulty] = (distribution[difficulty] || 0) + 1;
    });
    return distribution;
  }

  getQualityDistribution() {
    const ranges = { 'low (1-5)': 0, 'medium (6-7)': 0, 'high (8-10)': 0 };
    this.analysisResults.forEach(result => {
      const score = result.ai_analysis?.quality_score || 0;
      if (score <= 5) ranges['low (1-5)']++;
      else if (score <= 7) ranges['medium (6-7)']++;
      else ranges['high (8-10)']++;
    });
    return ranges;
  }

  getTopQualityQuestions() {
    return this.analysisResults
      .filter(r => r.ai_analysis?.quality_score >= 8)
      .map(r => ({
        category: r.category,
        question: r.questionText.substring(0, 100) + '...',
        score: r.ai_analysis.quality_score,
        correct_answer: r.ai_analysis.correct_answer
      }))
      .slice(0, 5);
  }

  getImprovementSuggestions() {
    const suggestions = [];
    this.analysisResults.forEach(result => {
      if (result.ai_analysis?.improvements) {
        suggestions.push(...result.ai_analysis.improvements);
      }
    });
    return [...new Set(suggestions)].slice(0, 10);
  }

  printSummary() {
    console.log('\n🎉 AI ANALYSIS COMPLETED!');
    console.log('='.repeat(50));
    console.log(`📊 Analyzed Questions: ${this.analysisResults.length}`);
    console.log(`💰 Total Cost: $${this.totalCost.toFixed(4)}`);
    console.log(`📈 Average Cost per Question: $${(this.totalCost / this.analysisResults.length).toFixed(4)}`);
    
    const diffDist = this.getDifficultyDistribution();
    console.log('\n📊 Difficulty Distribution:');
    Object.entries(diffDist).forEach(([diff, count]) => {
      console.log(`   ${diff}: ${count}`);
    });
    
    const qualDist = this.getQualityDistribution();
    console.log('\n⭐ Quality Distribution:');
    Object.entries(qualDist).forEach(([range, count]) => {
      console.log(`   ${range}: ${count}`);
    });
    
    console.log('\n📁 Output Files:');
    console.log('- scraped_data/ai_analysis_results.json');
    console.log('- scraped_data/analysis_summary.json');
    console.log('='.repeat(50));
  }
}

async function main() {
  const analyzer = new DataAnalyzer();
  
  try {
    await analyzer.analyzeScrapedData();
  } catch (error) {
    console.error('❌ Analysis error:', error);
  }
}

module.exports = { DataAnalyzer };

if (require.main === module) {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('❌ DEEPSEEK_API_KEY environment variable is required');
    process.exit(1);
  }
  
  main().catch(console.error);
} 