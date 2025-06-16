const axios = require('axios');

class DeepSeekAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.deepseek.com/v1';
    this.defaultModel = 'deepseek-chat';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  // Basic chat completion
  async chatCompletion(messages, options = {}) {
    try {
      const response = await this.client.post('/chat/completions', {
        model: options.model || this.defaultModel,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1000,
        top_p: options.top_p || 0.95,
        frequency_penalty: options.frequency_penalty || 0,
        presence_penalty: options.presence_penalty || 0,
        stream: false
      });

      return {
        success: true,
        data: response.data,
        usage: response.data.usage,
        content: response.data.choices[0]?.message?.content
      };
    } catch (error) {
      console.error('DeepSeek API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Analyze ehliyet questions
  async analyzeQuestion(questionData) {
    const prompt = `Ehliyet sorusu analizi yapın:

Soru: ${questionData.questionText}
Seçenekler: ${questionData.options.map(opt => `${opt.label}) ${opt.text}`).join('\n')}
${questionData.correctAnswer ? `Doğru Cevap: ${questionData.correctAnswer}` : ''}

Lütfen şunları değerlendirin:
1. Zorluk seviyesi (kolay/orta/zor)
2. Soru kalitesi (1-10 puan)
3. Hangi konulara ait olduğu
4. Gerekirse daha iyi bir açıklama
5. Öğrenci için öneriler

JSON formatında yanıt verin:`;

    const messages = [
      {
        role: 'system',
        content: 'Sen bir ehliyet eğitimi uzmanısın. Ehliyet sorularını analiz edip öğretici içerik üretiyorsun. Her zaman Türkçe yanıt ver.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const result = await this.chatCompletion(messages, {
      temperature: 0.3,
      max_tokens: 1500
    });

    if (result.success) {
      try {
        const analysisText = result.content;
        // Parse JSON from response or create structured response
        return this.parseAnalysisResponse(analysisText, questionData);
      } catch (parseError) {
        console.error('Failed to parse analysis:', parseError);
        return this.createFallbackAnalysis(questionData);
      }
    }

    return this.createFallbackAnalysis(questionData);
  }

  parseAnalysisResponse(responseText, originalQuestion) {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...originalQuestion,
          ai_analysis: {
            difficulty: parsed.difficulty || 'orta',
            quality_score: parsed.quality_score || 7,
            topics: parsed.topics || ['genel'],
            enhanced_explanation: parsed.explanation || originalQuestion.explanation,
            study_tips: parsed.study_tips || [],
            recommendations: parsed.recommendations || []
          }
        };
      }
    } catch (error) {
      console.error('JSON parse error:', error);
    }

    // Fallback: parse from text
    return {
      ...originalQuestion,
      ai_analysis: {
        difficulty: this.extractDifficulty(responseText),
        quality_score: this.extractQualityScore(responseText),
        topics: this.extractTopics(responseText),
        enhanced_explanation: this.extractExplanation(responseText),
        study_tips: this.extractStudyTips(responseText),
        recommendations: []
      }
    };
  }

  extractDifficulty(text) {
    if (text.includes('zor') || text.includes('karmaşık')) return 'zor';
    if (text.includes('kolay') || text.includes('basit')) return 'kolay';
    return 'orta';
  }

  extractQualityScore(text) {
    const scoreMatch = text.match(/(\d+)\/10|(\d+) puan/);
    if (scoreMatch) {
      return parseInt(scoreMatch[1] || scoreMatch[2]);
    }
    return 7; // Default
  }

  extractTopics(text) {
    const topics = [];
    if (text.toLowerCase().includes('trafik')) topics.push('trafik');
    if (text.toLowerCase().includes('motor')) topics.push('motor');
    if (text.toLowerCase().includes('ilk yardım')) topics.push('ilkyardim');
    return topics.length > 0 ? topics : ['genel'];
  }

  extractExplanation(text) {
    const explanationMatch = text.match(/açıklama[:\s]*(.*?)(?:\n|$)/i);
    return explanationMatch ? explanationMatch[1].trim() : '';
  }

  extractStudyTips(text) {
    const tips = [];
    const tipsMatch = text.match(/öneriler?[:\s]*(.*?)(?:\n\n|$)/is);
    if (tipsMatch) {
      const tipText = tipsMatch[1];
      tips.push(...tipText.split(/[•\-\n]/).filter(tip => tip.trim().length > 10));
    }
    return tips.slice(0, 3); // Max 3 tips
  }

  createFallbackAnalysis(questionData) {
    return {
      ...questionData,
      ai_analysis: {
        difficulty: 'orta',
        quality_score: 7,
        topics: ['genel'],
        enhanced_explanation: questionData.explanation || 'Açıklama henüz eklenmemiş.',
        study_tips: ['Bu konuyu tekrar edin', 'Benzer soruları çözün'],
        recommendations: []
      }
    };
  }

  // Generate similar questions
  async generateSimilarQuestions(baseQuestion, count = 3) {
    const prompt = `Bu ehliyet sorusuna benzer ${count} yeni soru üretin:

Temel Soru: ${baseQuestion.questionText}
Kategori: ${baseQuestion.category}

Benzer zorlukta ve aynı konuda yeni sorular oluşturun. Her soru 4 seçenekli olsun.

JSON array formatında döndürün:
[{
  "questionText": "...",
  "options": [
    {"label": "A", "text": "..."},
    {"label": "B", "text": "..."},
    {"label": "C", "text": "..."},
    {"label": "D", "text": "..."}
  ],
  "correctAnswer": "A",
  "explanation": "..."
}]`;

    const messages = [
      {
        role: 'system',
        content: 'Sen ehliyet sınavı soruları üreten bir uzmansın. Kaliteli, eğitici sorular hazırlıyorsun.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const result = await this.chatCompletion(messages, {
      temperature: 0.8,
      max_tokens: 2000
    });

    if (result.success) {
      try {
        const jsonMatch = result.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (error) {
        console.error('Failed to parse generated questions:', error);
      }
    }

    return [];
  }

  // Prepare fine-tuning data
  async prepareFinetuningData(questions) {
    const trainingData = [];

    for (const question of questions) {
      // Create instruction-response pairs for fine-tuning
      const instruction = `Ehliyet sorusu: ${question.questionText}\n\nSeçenekler:\n${question.options.map(opt => `${opt.label}) ${opt.text}`).join('\n')}`;
      
      const response = `Doğru cevap: ${question.correctAnswer}\n\nAçıklama: ${question.explanation || 'Bu sorunun cevabı verilen seçenekler arasında en uygun olanıdır.'}`;

      trainingData.push({
        messages: [
          {
            role: 'system',
            content: 'Sen bir ehliyet eğitimi uzmanısın. Soruları doğru şekilde yanıtlıyorsun.'
          },
          {
            role: 'user',
            content: instruction
          },
          {
            role: 'assistant',
            content: response
          }
        ]
      });

      // Add analysis training data
      const analysisInstruction = `Bu ehliyet sorusunu analiz et: ${question.questionText}`;
      const analysisResponse = question.ai_analysis ? 
        `Zorluk: ${question.ai_analysis.difficulty}\nKalite: ${question.ai_analysis.quality_score}/10\nKonular: ${question.ai_analysis.topics.join(', ')}\nÖneriler: ${question.ai_analysis.study_tips.join('; ')}` :
        `Zorluk: orta\nKalite: 7/10\nKonular: genel\nÖneriler: Bu konuyu tekrar edin`;

      trainingData.push({
        messages: [
          {
            role: 'system',
            content: 'Sen ehliyet sorularını analiz eden bir uzmansın.'
          },
          {
            role: 'user',
            content: analysisInstruction
          },
          {
            role: 'assistant',
            content: analysisResponse
          }
        ]
      });
    }

    return trainingData;
  }

  // Chat with AI tutor
  async chatWithTutor(userMessage, context = {}) {
    const systemPrompt = `Sen bir ehliyet eğitimi uzmanısın ve öğrencilere yardım ediyorsun. 

Öğrenci profili:
- Doğru cevaplar: ${context.correctAnswers || 0}
- Yanlış cevaplar: ${context.wrongAnswers || 0}
- Zayıf olduğu konular: ${context.weakTopics?.join(', ') || 'Bilinmiyor'}

Her zaman:
1. Nazik ve teşvik edici ol
2. Somut örnekler ver
3. Pratik ipuçları paylaş
4. Türkçe yanıtla`;

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userMessage
      }
    ];

    return await this.chatCompletion(messages, {
      temperature: 0.7,
      max_tokens: 1000
    });
  }

  // Bulk analysis for scraped questions
  async bulkAnalyzeQuestions(questions, batchSize = 5) {
    console.log(`🤖 Starting bulk analysis of ${questions.length} questions...`);
    
    const results = [];
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(questions.length/batchSize)}`);
      
      const batchPromises = batch.map(question => this.analyzeQuestion(question));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Failed to analyze question ${i + index}:`, result.reason);
          results.push(this.createFallbackAnalysis(batch[index]));
        }
      });
      
      // Rate limiting
      if (i + batchSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`✅ Completed bulk analysis. ${results.length} questions processed.`);
    return results;
  }

  // Cost estimation
  estimateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000000) * 0.14; // $0.14 per 1M tokens
    const outputCost = (outputTokens / 1000000) * 2.19; // $2.19 per 1M tokens
    
    return {
      inputCost: inputCost,
      outputCost: outputCost,
      totalCost: inputCost + outputCost,
      formattedCost: `$${(inputCost + outputCost).toFixed(4)}`
    };
  }
}

// Helper function to count tokens (rough estimation)
function estimateTokenCount(text) {
  // Rough estimation: 1 token ≈ 4 characters for Turkish
  return Math.ceil(text.length / 4);
}

module.exports = { DeepSeekAPI, estimateTokenCount }; 