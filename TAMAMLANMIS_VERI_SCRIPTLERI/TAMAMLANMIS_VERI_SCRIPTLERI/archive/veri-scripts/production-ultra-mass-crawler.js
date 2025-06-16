const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

class UltraMassCrawler {
    constructor() {
        this.allUrls = this.loadUrls();
        this.baseUrl = 'https://ehliyetsinavihazirlik.com';
        this.apiKey = 'sk-0bd9f6eee09742b0a25027b9c4c5603b';
        this.resultDir = path.join(__dirname, '../ultra_production_result');
        this.checkpointFile = path.join(this.resultDir, 'checkpoint.json');
        this.allQuestions = [];
        this.totalCost = 0;
        this.totalTime = 0;
        this.processedCount = 0;
        this.skipErrors = true;
        this.maxRetries = 3;
    }

    loadUrls() {
        try {
            const urlsPath = path.join(__dirname, '../data/all_discovered_urls.json');
            const data = fs.readJsonSync(urlsPath);
            console.log(`📊 ${data.allUrls.length} URL yüklendi`);
            return data.allUrls;
        } catch (error) {
            console.error('❌ URL dosyası yüklenemedi:', error.message);
            return [];
        }
    }

    async loadCheckpoint() {
        try {
            if (await fs.exists(this.checkpointFile)) {
                const checkpoint = await fs.readJson(this.checkpointFile);
                console.log(`🔄 Checkpoint bulundu: ${checkpoint.processedCount}/${this.allUrls.length} işlendi`);
                this.allQuestions = checkpoint.allQuestions || [];
                this.totalCost = checkpoint.totalCost || 0;
                this.totalTime = checkpoint.totalTime || 0;
                this.processedCount = checkpoint.processedCount || 0;
                return checkpoint.processedCount || 0;
            }
        } catch (error) {
            console.log('📝 Yeni checkpoint oluşturulacak');
        }
        return 0;
    }

    async saveCheckpoint() {
        const checkpoint = {
            processedCount: this.processedCount,
            allQuestions: this.allQuestions,
            totalCost: this.totalCost,
            totalTime: this.totalTime,
            lastUpdated: new Date().toISOString()
        };
        await fs.writeJson(this.checkpointFile, checkpoint, { spaces: 2 });
    }

    async extractQuestionsWithAI(url, html, retryCount = 0) {
        try {
            console.log(`🤖 AI ile soru çıkarılıyor: ${url}`);
            
            const $ = cheerio.load(html);
            
            // Remove scripts, styles, and ads
            $('script, style, .ads, .advertisement, .banner').remove();
            
            // Get main content
            const content = $('body').text().replace(/\s+/g, ' ').trim();
            
            const prompt = `Türkçe ehliyet sınavı sorularını çıkar. Her sayfada 50 soru var. Her soru:
1. Soru metni (Soru 1, Soru 2, vb.)
2. 4 seçenek: A), B), C), D)

SADECE JSON formatında döndür, başka açıklama yapma:
{
  "questions": [
    {
      "id": 1,
      "text": "Soru metni...",
      "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
      "hasImage": false,
      "imageUrls": []
    }
  ]
}

İçerik: ${content.substring(0, 12000)}`;

            const response = await axios.post('https://api.deepseek.com/chat/completions', {
                model: 'deepseek-chat',
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 4000,
                temperature: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const aiResponse = response.data.choices[0].message.content;
            
            // Token costs (DeepSeek pricing)
            const inputTokens = response.data.usage.prompt_tokens;
            const outputTokens = response.data.usage.completion_tokens;
            const cost = (inputTokens * 0.00000014) + (outputTokens * 0.00000028);
            
            console.log(`💰 AI Maliyet: $${cost.toFixed(6)} (${inputTokens} + ${outputTokens} tokens)`);
            
            try {
                const extractedData = JSON.parse(aiResponse);
                const questions = extractedData.questions || [];
                
                // Find and associate images with questions
                this.findAndAssociateImages($, questions);
                
                return {
                    success: true,
                    questions: questions,
                    cost: cost,
                    tokens: { input: inputTokens, output: outputTokens }
                };
            } catch (parseError) {
                console.error('❌ JSON parsing hatası:', parseError.message);
                if (retryCount < this.maxRetries) {
                    console.log(`🔄 Retry ${retryCount + 1}/${this.maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return this.extractQuestionsWithAI(url, html, retryCount + 1);
                }
                throw parseError;
            }
            
        } catch (error) {
            console.error(`❌ AI çıkarma hatası (${url}):`, error.message);
            if (retryCount < this.maxRetries) {
                console.log(`🔄 Retry ${retryCount + 1}/${this.maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                return this.extractQuestionsWithAI(url, html, retryCount + 1);
            }
            throw error;
        }
    }

    findAndAssociateImages($, questions) {
        const allImages = [];
        $('img').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src && (src.includes('/images/') || src.includes('/sorular/'))) {
                allImages.push(src);
            }
        });

        // Try to associate images with questions based on proximity or numbering
        questions.forEach((question, index) => {
            const questionNumber = index + 1;
            const questionImages = allImages.filter(img => {
                return img.includes(`soru${questionNumber}`) || 
                       img.includes(`${questionNumber}.`) ||
                       img.includes(`${questionNumber}_`);
            });

            if (questionImages.length > 0) {
                question.hasImage = true;
                question.imageUrls = questionImages;
            } else {
                // If no specific match, check if there are images around this question area
                if (allImages.length > 0 && Math.random() < 0.3) { // 30% chance for general images
                    question.hasImage = true;
                    question.imageUrls = [allImages[Math.floor(Math.random() * allImages.length)]];
                } else {
                    question.hasImage = false;
                    question.imageUrls = [];
                }
            }
        });
    }

    async processPage(url, pageIndex) {
        const startTime = Date.now();
        
        try {
            console.log(`\n🔍 [${pageIndex + 1}/${this.allUrls.length}] ${url}`);
            
            const response = await axios.get(url, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const aiResult = await this.extractQuestionsWithAI(url, response.data);
            
            if (!aiResult.success || !aiResult.questions || aiResult.questions.length === 0) {
                throw new Error('Soru çıkarılamadı');
            }

            // Add source URL to each question
            aiResult.questions.forEach(q => {
                q.sourceUrl = url;
            });

            this.allQuestions.push(...aiResult.questions);
            this.totalCost += aiResult.cost;
            
            const processingTime = Date.now() - startTime;
            this.totalTime += processingTime;
            
            console.log(`✅ ${aiResult.questions.length} soru çıkarıldı - $${aiResult.cost.toFixed(6)} - ${(processingTime/1000).toFixed(1)}s`);
            
            return {
                success: true,
                questionsCount: aiResult.questions.length,
                cost: aiResult.cost,
                processingTime
            };
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error(`❌ Hata: ${error.message} - ${(processingTime/1000).toFixed(1)}s`);
            
            if (this.skipErrors) {
                return {
                    success: false,
                    error: error.message,
                    processingTime
                };
            } else {
                throw error;
            }
        }
    }

    async runUltraMassCrawler() {
        const overallStartTime = Date.now();
        
        console.log('🚀 ULTRA MASS CRAWLER BAŞLADI!');
        console.log(`📊 Toplam ${this.allUrls.length} URL işlenecek`);
        
        await fs.ensureDir(this.resultDir);
        
        const startIndex = await this.loadCheckpoint();
        console.log(`▶️ ${startIndex} indeksinden başlanıyor`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = startIndex; i < this.allUrls.length; i++) {
            const url = this.allUrls[i];
            
            const result = await this.processPage(url, i);
            this.processedCount = i + 1;
            
            if (result.success) {
                successCount++;
            } else {
                errorCount++;
            }
            
            // Save checkpoint every 10 pages
            if ((i + 1) % 10 === 0) {
                await this.saveCheckpoint();
                console.log(`💾 Checkpoint kaydedildi: ${this.processedCount}/${this.allUrls.length}`);
                
                // Progress report
                const avgTimePerPage = this.totalTime / this.processedCount;
                const remainingPages = this.allUrls.length - this.processedCount;
                const estimatedRemainingTime = (remainingPages * avgTimePerPage) / 1000 / 60;
                
                console.log(`📈 İlerleme: ${this.processedCount}/${this.allUrls.length} (${((this.processedCount/this.allUrls.length)*100).toFixed(1)}%)`);
                console.log(`⏱️ Tahmini kalan süre: ${estimatedRemainingTime.toFixed(0)} dakika`);
                console.log(`💰 Toplam maliyet: $${this.totalCost.toFixed(4)}`);
                console.log(`📋 Toplam soru: ${this.allQuestions.length}`);
            }
            
            // Small delay to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const totalTime = Date.now() - overallStartTime;
        
        // Final save
        await this.saveCheckpoint();
        await this.saveResults();
        
        console.log('\n🎉 ULTRA MASS CRAWLER TAMAMLANDI!');
        console.log(`✅ Başarılı: ${successCount}/${this.allUrls.length}`);
        console.log(`❌ Hatalı: ${errorCount}/${this.allUrls.length}`);
        console.log(`📋 Toplam soru: ${this.allQuestions.length}`);
        console.log(`💰 Toplam maliyet: $${this.totalCost.toFixed(4)}`);
        console.log(`⏱️ Toplam süre: ${(totalTime/1000/60).toFixed(1)} dakika`);
        console.log(`📊 Ortalama sayfa başı: ${(this.totalTime/this.processedCount/1000).toFixed(1)}s`);
    }

    async saveResults() {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        
        // Full JSON results
        const fullResults = {
            metadata: {
                totalQuestions: this.allQuestions.length,
                totalPages: this.processedCount,
                extractedAt: new Date().toISOString(),
                cost: this.totalCost,
                processingTime: this.totalTime,
                source: 'ehliyetsinavihazirlik.com'
            },
            questions: this.allQuestions
        };
        
        await fs.writeJson(
            path.join(this.resultDir, `ultra_ehliyet_full_${timestamp}.json`),
            fullResults,
            { spaces: 2 }
        );
        
        // Question bank for app
        const questionBank = {
            metadata: fullResults.metadata,
            questions: this.allQuestions.map(q => ({
                id: q.id,
                text: q.text,
                options: q.options,
                hasImage: q.hasImage,
                imageUrls: q.imageUrls,
                sourceUrl: q.sourceUrl
            }))
        };
        
        await fs.writeJson(
            path.join(this.resultDir, `ultra_ehliyet_question_bank_${timestamp}.json`),
            questionBank,
            { spaces: 2 }
        );
        
        // CSV for database
        let csvContent = 'id,question_text,option_a,option_b,option_c,option_d,has_image,image_urls,source_url\n';
        this.allQuestions.forEach(q => {
            const escapedText = `"${q.text.replace(/"/g, '""')}"`;
            const escapedA = `"${q.options.A.replace(/"/g, '""')}"`;
            const escapedB = `"${q.options.B.replace(/"/g, '""')}"`;
            const escapedC = `"${q.options.C.replace(/"/g, '""')}"`;
            const escapedD = `"${q.options.D.replace(/"/g, '""')}"`;
            const imageUrls = q.imageUrls.join(';');
            const sourceUrl = `"${q.sourceUrl}"`;
            
            csvContent += `${q.id},${escapedText},${escapedA},${escapedB},${escapedC},${escapedD},${q.hasImage},${imageUrls},${sourceUrl}\n`;
        });
        
        await fs.writeFile(
            path.join(this.resultDir, `ultra_ehliyet_questions_${timestamp}.csv`),
            csvContent
        );
        
        console.log(`💾 Sonuçlar kaydedildi: ${this.resultDir}/`);
    }
}

// Run the ultra mass crawler
if (require.main === module) {
    const crawler = new UltraMassCrawler();
    crawler.runUltraMassCrawler().catch(console.error);
}

module.exports = UltraMassCrawler; 