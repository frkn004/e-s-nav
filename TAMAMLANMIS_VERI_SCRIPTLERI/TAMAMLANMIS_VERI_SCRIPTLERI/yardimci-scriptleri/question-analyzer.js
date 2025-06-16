const fs = require('fs').promises;
const path = require('path');

class QuestionAnalyzer {
  constructor() {
    this.allQuestions = [];
    this.duplicates = [];
    this.categories = {};
    this.sources = {};
    this.analysisDir = 'question_analysis';
  }

  async init() {
    await fs.mkdir(this.analysisDir, { recursive: true });
    console.log('📊 Question Analyzer initialized!');
  }

  async loadQuestionsFromFiles() {
    console.log('\n📂 Loading questions from all scraper results...');
    
    const questionFiles = [
      'ehliyetsinavihazirlik_scraper_test/ehliyetsinavihazirlik_questions_2025-06-06.json',
      'enhanced_navigation_test/enhanced_nav_questions_2025-06-06.json',
      'navigation_scraper_test/navigation_questions_2025-06-06.json'
    ];

    for (const filePath of questionFiles) {
      try {
        const fullPath = path.join('.', filePath);
        const data = await fs.readFile(fullPath, 'utf8');
        const questions = JSON.parse(data);
        
        console.log(`   📄 Loaded ${questions.length} questions from ${filePath}`);
        
        // Add source info to each question
        questions.forEach(q => {
          q.sourceFile = filePath;
          if (filePath.includes('ehliyetsinavihazirlik')) {
            q.siteName = 'ehliyetsinavihazirlik.com';
            q.siteType = 'single_page_multi_question';
          } else if (filePath.includes('enhanced_navigation') || filePath.includes('navigation')) {
            q.siteName = 'ehliyet-soru.com';
            q.siteType = 'navigation_based_single_question';
          }
        });
        
        this.allQuestions.push(...questions);
        
      } catch (error) {
        console.log(`   ❌ Could not load ${filePath}: ${error.message}`);
      }
    }

    console.log(`\n📊 Total questions loaded: ${this.allQuestions.length}`);
  }

  async analyzeDuplicates() {
    console.log('\n🔍 Analyzing duplicate questions...');
    
    const questionMap = new Map();
    const duplicateGroups = [];
    
    this.allQuestions.forEach((question, index) => {
      // Create signature for duplicate detection
      const signature = this.createQuestionSignature(question);
      
      if (questionMap.has(signature)) {
        const existingGroup = questionMap.get(signature);
        existingGroup.push({ ...question, originalIndex: index });
      } else {
        const newGroup = [{ ...question, originalIndex: index }];
        questionMap.set(signature, newGroup);
      }
    });

    // Find groups with more than 1 question (duplicates)
    questionMap.forEach((group, signature) => {
      if (group.length > 1) {
        duplicateGroups.push({
          signature,
          count: group.length,
          questions: group
        });
      }
    });

    this.duplicates = duplicateGroups;
    
    console.log(`   🔍 Found ${duplicateGroups.length} duplicate groups`);
    console.log(`   📊 Total duplicate questions: ${duplicateGroups.reduce((sum, g) => sum + g.count, 0)}`);
    
    if (duplicateGroups.length > 0) {
      console.log('\n🔍 Duplicate Examples:');
      duplicateGroups.slice(0, 3).forEach((group, i) => {
        console.log(`   ${i+1}. "${group.questions[0].question.substring(0, 60)}..." (${group.count} copies)`);
        group.questions.forEach((q, j) => {
          console.log(`      ${j+1}: ${q.siteName} - ${q.sourceFile}`);
        });
      });
    }
  }

  createQuestionSignature(question) {
    // Normalize question text for duplicate detection
    const normalizedQuestion = question.question
      .toLowerCase()
      .replace(/[^\wşğıüöçıŞĞIÜÖÇI\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // Create signature from question + option count
    const optionCount = Object.keys(question.options || {}).length;
    return `${normalizedQuestion}_${optionCount}`;
  }

  async categorizeQuestions() {
    console.log('\n📂 Categorizing questions...');
    
    this.categories = {
      trafik: { questions: [], keywords: ['trafik', 'işaret', 'levha', 'yol', 'geçit', 'park', 'hız', 'mesafe'] },
      motorbilgisi: { questions: [], keywords: ['motor', 'yağ', 'yakıt', 'radyatör', 'fren', 'balata', 'buji', 'piston'] },
      ilkyard: { questions: [], keywords: ['ilk yardım', 'kanama', 'kalp masaj', 'solunum', 'yaralı', 'acil'] },
      trafikadab: { questions: [], keywords: ['davranış', 'adap', 'nezaket', 'hoşgörü', 'saygı', 'sürücü psikoloji'] },
      unknown: { questions: [], keywords: [] }
    };

    // First pass - use existing categories from scraping
    this.allQuestions.forEach(question => {
      let category = question.category || 'unknown';
      
      // Clean up category names
      if (category === 'trafik' || category.includes('trafik')) category = 'trafik';
      else if (category === 'motorbilgisi' || category.includes('motor')) category = 'motorbilgisi';
      else if (category === 'ilkyard' || category.includes('ilk')) category = 'ilkyard';
      else if (category === 'trafikadab' || category.includes('adab')) category = 'trafikadab';
      else category = 'unknown';
      
      if (!this.categories[category]) {
        this.categories[category] = { questions: [], keywords: [] };
      }
      
      this.categories[category].questions.push(question);
    });

    // Second pass - auto-categorize unknown questions using keywords
    this.categories.unknown.questions.forEach(question => {
      const questionText = question.question.toLowerCase();
      
      for (const [catName, catData] of Object.entries(this.categories)) {
        if (catName === 'unknown') continue;
        
        if (catData.keywords.some(keyword => questionText.includes(keyword))) {
          // Move from unknown to proper category
          catData.questions.push(question);
          question.autoCategory = catName;
          break;
        }
      }
    });

    // Remove questions that were auto-categorized from unknown
    this.categories.unknown.questions = this.categories.unknown.questions.filter(q => !q.autoCategory);

    console.log('\n📊 Categorization Results:');
    Object.entries(this.categories).forEach(([catName, catData]) => {
      console.log(`   ${catName}: ${catData.questions.length} questions`);
    });
  }

  async analyzeSourceSites() {
    console.log('\n🌐 Analyzing source sites...');
    
    this.sources = {};
    
    this.allQuestions.forEach(question => {
      const site = question.siteName || 'unknown';
      const siteType = question.siteType || 'unknown';
      
      if (!this.sources[site]) {
        this.sources[site] = {
          name: site,
          type: siteType,
          questions: [],
          categories: {},
          totalQuestions: 0,
          successRate: 0,
          avgOptionsPerQuestion: 0
        };
      }
      
      this.sources[site].questions.push(question);
      this.sources[site].totalQuestions++;
      
      // Track categories per site
      const category = question.category || 'unknown';
      this.sources[site].categories[category] = (this.sources[site].categories[category] || 0) + 1;
    });

    // Calculate metrics
    Object.values(this.sources).forEach(site => {
      site.avgOptionsPerQuestion = site.questions.length > 0 ? 
        site.questions.reduce((sum, q) => sum + Object.keys(q.options || {}).length, 0) / site.questions.length : 0;
      
      site.successRate = site.questions.length; // Absolute count for now
    });

    console.log('\n📊 Source Analysis:');
    Object.entries(this.sources).forEach(([siteName, siteData]) => {
      console.log(`   ${siteName}:`);
      console.log(`     Type: ${siteData.type}`);
      console.log(`     Questions: ${siteData.totalQuestions}`);
      console.log(`     Avg Options: ${siteData.avgOptionsPerQuestion.toFixed(1)}`);
      console.log(`     Categories: ${Object.keys(siteData.categories).join(', ')}`);
    });
  }

  async createCleanDataset() {
    console.log('\n🧹 Creating clean dataset (removing duplicates)...');
    
    const cleanQuestions = [];
    const processedSignatures = new Set();
    
    this.allQuestions.forEach(question => {
      const signature = this.createQuestionSignature(question);
      
      if (!processedSignatures.has(signature)) {
        // Keep the best version of each question
        const cleanQuestion = {
          id: `clean_${Date.now()}_${cleanQuestions.length + 1}`,
          question: question.question.trim(),
          options: question.options || {},
          category: question.category || 'unknown',
          explanation: question.explanation || '',
          difficulty: this.calculateDifficulty(question),
          source: {
            site: question.siteName,
            url: question.sourceUrl,
            scrapedAt: question.scrapedAt,
            method: question.scrapingMethod
          },
          metadata: {
            optionCount: Object.keys(question.options || {}).length,
            questionLength: question.question.length,
            hasImages: question.images && question.images.length > 0,
            imageCount: question.images ? question.images.length : 0
          }
        };
        
        cleanQuestions.push(cleanQuestion);
        processedSignatures.add(signature);
      }
    });

    console.log(`   ✅ Clean dataset: ${cleanQuestions.length} unique questions`);
    console.log(`   🗑️ Removed: ${this.allQuestions.length - cleanQuestions.length} duplicates`);
    
    return cleanQuestions;
  }

  calculateDifficulty(question) {
    let score = 0;
    
    // Question length indicates complexity
    if (question.question.length > 100) score += 1;
    if (question.question.length > 150) score += 1;
    
    // Technical terms indicate higher difficulty
    const technicalTerms = ['sistem', 'motor', 'fren', 'yakıt', 'pompası', 'filtres', 'radyatör'];
    if (technicalTerms.some(term => question.question.toLowerCase().includes(term))) score += 1;
    
    // Medical/first aid terms
    const medicalTerms = ['kalp masaj', 'solunum', 'kanama', 'atardamar', 'ilk yardım'];
    if (medicalTerms.some(term => question.question.toLowerCase().includes(term))) score += 1;
    
    // Return difficulty level
    if (score >= 3) return 'hard';
    if (score >= 2) return 'medium';
    return 'easy';
  }

  async generateRAGFormat(cleanQuestions) {
    console.log('\n🤖 Generating RAG-compatible format...');
    
    const ragFormat = cleanQuestions.map((question, index) => ({
      id: question.id,
      content: question.question,
      metadata: {
        type: 'driving_license_question',
        category: question.category,
        difficulty: question.difficulty,
        source: question.source.site,
        options: question.options,
        correct_answer: null, // To be filled if we have answer keys
        explanation: question.explanation,
        tags: this.generateTags(question),
        embedding_text: `${question.question} ${Object.values(question.options).join(' ')}`
      }
    }));

    console.log(`   ✅ Generated ${ragFormat.length} RAG entries`);
    return ragFormat;
  }

  async generateFineTuningFormat(cleanQuestions) {
    console.log('\n🎯 Generating Fine-tuning compatible format...');
    
    const fineTuningFormat = cleanQuestions.map(question => {
      const optionsText = Object.entries(question.options)
        .map(([key, value]) => `${key}) ${value}`)
        .join('\n');
      
      return {
        messages: [
          {
            role: "system",
            content: "Sen ehliyet sınavı uzmanısın. Verilen soruları analiz et ve doğru cevabı bul."
          },
          {
            role: "user",
            content: `Aşağıdaki ehliyet sınavı sorusunu cevaplayın:\n\n${question.question}\n\n${optionsText}`
          },
          {
            role: "assistant",
            content: `Bu soru ${question.category} kategorisinde ${question.difficulty} seviyesinde bir sorudur. ${question.explanation || 'Soruyu dikkatlice okuyup en uygun seçeneği işaretlemelisiniz.'}`
          }
        ],
        metadata: {
          question_id: question.id,
          category: question.category,
          difficulty: question.difficulty,
          source: question.source.site
        }
      };
    });

    console.log(`   ✅ Generated ${fineTuningFormat.length} fine-tuning entries`);
    return fineTuningFormat;
  }

  generateTags(question) {
    const tags = [];
    
    // Category tag
    tags.push(question.category);
    
    // Difficulty tag  
    tags.push(question.difficulty);
    
    // Content-based tags
    const questionLower = question.question.toLowerCase();
    
    if (questionLower.includes('şekil') || questionLower.includes('görsel')) tags.push('visual');
    if (questionLower.includes('yasak') || questionLower.includes('yapmak')) tags.push('regulation');
    if (questionLower.includes('hız') || questionLower.includes('mesafe')) tags.push('speed_distance');
    if (questionLower.includes('fren') || questionLower.includes('durmak')) tags.push('braking');
    if (questionLower.includes('park') || questionLower.includes('durma')) tags.push('parking');
    
    return tags;
  }

  async saveAnalysisResults(cleanQuestions, ragFormat, fineTuningFormat) {
    console.log('\n💾 Saving analysis results...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    // 1. Complete analysis report
    const analysisReport = {
      analysis_timestamp: new Date().toISOString(),
      summary: {
        total_questions_loaded: this.allQuestions.length,
        unique_questions: cleanQuestions.length,
        duplicates_removed: this.allQuestions.length - cleanQuestions.length,
        categories: Object.keys(this.categories).length,
        sources: Object.keys(this.sources).length
      },
      categories: Object.entries(this.categories).reduce((acc, [name, data]) => {
        acc[name] = {
          count: data.questions.length,
          percentage: ((data.questions.length / this.allQuestions.length) * 100).toFixed(1) + '%'
        };
        return acc;
      }, {}),
      sources: this.sources,
      duplicates: this.duplicates.slice(0, 10), // Top 10 duplicate groups
      quality_metrics: {
        avg_question_length: cleanQuestions.reduce((sum, q) => sum + q.question.length, 0) / cleanQuestions.length,
        avg_options_per_question: cleanQuestions.reduce((sum, q) => sum + q.metadata.optionCount, 0) / cleanQuestions.length,
        questions_with_images: cleanQuestions.filter(q => q.metadata.hasImages).length,
        difficulty_distribution: {
          easy: cleanQuestions.filter(q => q.difficulty === 'easy').length,
          medium: cleanQuestions.filter(q => q.difficulty === 'medium').length,
          hard: cleanQuestions.filter(q => q.difficulty === 'hard').length
        }
      }
    };

    // 2. Clean dataset
    await fs.writeFile(
      path.join(this.analysisDir, `clean_questions_${timestamp}.json`),
      JSON.stringify(cleanQuestions, null, 2)
    );

    // 3. RAG format
    await fs.writeFile(
      path.join(this.analysisDir, `rag_format_${timestamp}.json`),
      JSON.stringify(ragFormat, null, 2)
    );

    // 4. Fine-tuning format
    await fs.writeFile(
      path.join(this.analysisDir, `fine_tuning_format_${timestamp}.json`),
      JSON.stringify(fineTuningFormat, null, 2)
    );

    // 5. Analysis report
    await fs.writeFile(
      path.join(this.analysisDir, `analysis_report_${timestamp}.json`),
      JSON.stringify(analysisReport, null, 2)
    );

    // 6. Site categorization for future link processing
    const siteCategories = {
      single_page_multi_question: {
        description: "Tek sayfada birden fazla soru bulunan siteler",
        examples: ["ehliyetsinavihazirlik.com"],
        recommended_scraper: "ehliyetsinavihazirlik-scraper.js",
        success_rate: "100%",
        efficiency: "high"
      },
      navigation_based_single_question: {
        description: "Her sayfada tek soru, navigation gerekli",
        examples: ["ehliyet-soru.com"],
        recommended_scraper: "enhanced-navigation-scraper.js", 
        success_rate: "12%",
        efficiency: "low",
        issues: "Sayfa yükleme sorunları"
      }
    };

    await fs.writeFile(
      path.join(this.analysisDir, `site_categorization_${timestamp}.json`),
      JSON.stringify(siteCategories, null, 2)
    );

    console.log('✅ Analysis results saved!');
    return analysisReport;
  }

  async printFinalReport(analysisReport) {
    console.log('\n📋 FINAL ANALYSIS REPORT');
    console.log('='.repeat(70));
    
    console.log(`📊 SUMMARY:`);
    console.log(`   Total Questions Loaded: ${analysisReport.summary.total_questions_loaded}`);
    console.log(`   Unique Questions: ${analysisReport.summary.unique_questions}`);
    console.log(`   Duplicates Removed: ${analysisReport.summary.duplicates_removed}`);
    console.log(`   Categories: ${analysisReport.summary.categories}`);
    console.log(`   Source Sites: ${analysisReport.summary.sources}`);

    console.log(`\n📂 CATEGORIES:`);
    Object.entries(analysisReport.categories).forEach(([name, data]) => {
      console.log(`   ${name}: ${data.count} questions (${data.percentage})`);
    });

    console.log(`\n🌐 SOURCES:`);
    Object.entries(analysisReport.sources).forEach(([name, data]) => {
      console.log(`   ${name}:`);
      console.log(`     Type: ${data.type}`);
      console.log(`     Questions: ${data.totalQuestions}`);
      console.log(`     Avg Options: ${data.avgOptionsPerQuestion.toFixed(1)}`);
    });

    console.log(`\n📊 QUALITY METRICS:`);
    console.log(`   Avg Question Length: ${analysisReport.quality_metrics.avg_question_length.toFixed(0)} chars`);
    console.log(`   Avg Options per Question: ${analysisReport.quality_metrics.avg_options_per_question.toFixed(1)}`);
    console.log(`   Questions with Images: ${analysisReport.quality_metrics.questions_with_images}`);
    
    console.log(`\n🎯 DIFFICULTY DISTRIBUTION:`);
    Object.entries(analysisReport.quality_metrics.difficulty_distribution).forEach(([level, count]) => {
      console.log(`   ${level}: ${count} questions`);
    });

    console.log('\n📁 Generated Files:');
    console.log(`   - ${this.analysisDir}/clean_questions_${new Date().toISOString().split('T')[0]}.json`);
    console.log(`   - ${this.analysisDir}/rag_format_${new Date().toISOString().split('T')[0]}.json`);
    console.log(`   - ${this.analysisDir}/fine_tuning_format_${new Date().toISOString().split('T')[0]}.json`);
    console.log(`   - ${this.analysisDir}/analysis_report_${new Date().toISOString().split('T')[0]}.json`);
    console.log(`   - ${this.analysisDir}/site_categorization_${new Date().toISOString().split('T')[0]}.json`);
    
    console.log('\n🎯 READY FOR:');
    console.log('   ✅ RAG Implementation');
    console.log('   ✅ Fine-tuning Dataset');
    console.log('   ✅ Site Categorization');
    console.log('   ✅ Duplicate-free Questions');
    console.log('='.repeat(70));
  }
}

async function main() {
  const analyzer = new QuestionAnalyzer();
  
  try {
    await analyzer.init();
    
    // Load all questions from scraper results
    await analyzer.loadQuestionsFromFiles();
    
    // Analyze duplicates
    await analyzer.analyzeDuplicates();
    
    // Categorize questions
    await analyzer.categorizeQuestions();
    
    // Analyze source sites
    await analyzer.analyzeSourceSites();
    
    // Create clean dataset
    const cleanQuestions = await analyzer.createCleanDataset();
    
    // Generate RAG format
    const ragFormat = await analyzer.generateRAGFormat(cleanQuestions);
    
    // Generate fine-tuning format
    const fineTuningFormat = await analyzer.generateFineTuningFormat(cleanQuestions);
    
    // Save all results
    const analysisReport = await analyzer.saveAnalysisResults(cleanQuestions, ragFormat, fineTuningFormat);
    
    // Print final report
    await analyzer.printFinalReport(analysisReport);
    
  } catch (error) {
    console.error('❌ Analysis error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { QuestionAnalyzer }; 