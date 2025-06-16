const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');

class LinkCategorizer {
  constructor() {
    this.links = [];
    this.categories = {
      single_page_multi_question: {
        description: "Tek sayfada birden fazla soru bulunan siteler",
        scraper: "ehliyetsinavihazirlik-scraper.js",
        success_rate: 100,
        efficiency: "high",
        examples: ["ehliyetsinavihazirlik.com"],
        patterns: [
          "ehliyetsinavihazirlik",
          "50-soru",
          "test-coz",
          "50test",
          "deneme-sinavi"
        ],
        links: []
      },
      navigation_based_single_question: {
        description: "Her sayfada tek soru, navigation gerekli",
        scraper: "enhanced-navigation-scraper.js",
        success_rate: 12,
        efficiency: "low",
        examples: ["ehliyet-soru.com"],
        patterns: [
          "ehliyet-soru",
          "/test-",
          "/soru-",
          "haziran-2025",
          "deneme-sinavi"
        ],
        links: []
      },
      quiz_platform: {
        description: "Online quiz platformları",
        scraper: "universal-quiz-scraper.js",
        success_rate: 0,
        efficiency: "unknown", 
        examples: ["testleri.com", "sinavsorulari.com"],
        patterns: [
          "quiz",
          "online",
          "platform",
          "interaktif"
        ],
        links: []
      },
      unknown: {
        description: "Henüz kategorize edilmemiş linkler",
        scraper: "pattern-detector.js",
        success_rate: 0,
        efficiency: "unknown",
        examples: [],
        patterns: [],
        links: []
      }
    };
    
    this.results = {
      total_links: 0,
      categorized_links: 0,
      high_priority: [],
      medium_priority: [],
      low_priority: [],
      requires_testing: []
    };
  }

  async categorizeLink(url) {
    console.log(`🔍 Analyzing: ${url}`);
    
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname.toLowerCase();
    const fullUrl = url.toLowerCase();
    
    // Site-specific categorization
    for (const [categoryName, categoryData] of Object.entries(this.categories)) {
      if (categoryName === 'unknown') continue;
      
      // Check domain patterns
      if (categoryData.examples.some(example => domain.includes(example))) {
        return {
          category: categoryName,
          confidence: 'high',
          reason: `Domain matches known example: ${domain}`,
          recommended_scraper: categoryData.scraper,
          expected_success_rate: categoryData.success_rate
        };
      }
      
      // Check URL patterns
      const matchingPatterns = categoryData.patterns.filter(pattern => 
        fullUrl.includes(pattern) || path.includes(pattern)
      );
      
      if (matchingPatterns.length > 0) {
        return {
          category: categoryName,
          confidence: 'medium',
          reason: `URL patterns match: ${matchingPatterns.join(', ')}`,
          recommended_scraper: categoryData.scraper,
          expected_success_rate: categoryData.success_rate
        };
      }
    }
    
    // If no match found, categorize as unknown
    return {
      category: 'unknown',
      confidence: 'low', 
      reason: 'No matching patterns found',
      recommended_scraper: 'pattern-detector.js',
      expected_success_rate: 0
    };
  }

  async processLinkBatch(links) {
    console.log(`\n📋 Processing ${links.length} links...\n`);
    
    const results = [];
    this.results.total_links = links.length;
    
    for (let i = 0; i < links.length; i++) {
      const url = links[i].trim();
      
      if (!url || !url.startsWith('http')) {
        console.log(`⚠️  Skipping invalid URL: ${url}`);
        continue;
      }
      
      try {
        const analysis = await this.categorizeLink(url);
        
        const linkData = {
          url: url,
          domain: new URL(url).hostname,
          ...analysis,
          processed_at: new Date().toISOString()
        };
        
        results.push(linkData);
        this.categories[analysis.category].links.push(linkData);
        
        // Prioritize based on confidence and success rate
        if (analysis.confidence === 'high' && analysis.expected_success_rate > 50) {
          this.results.high_priority.push(linkData);
        } else if (analysis.confidence === 'medium' || analysis.expected_success_rate > 10) {
          this.results.medium_priority.push(linkData);
        } else if (analysis.category === 'unknown') {
          this.results.requires_testing.push(linkData);
        } else {
          this.results.low_priority.push(linkData);
        }
        
        console.log(`   ✅ ${analysis.category} (${analysis.confidence}) - ${analysis.reason}`);
        
      } catch (error) {
        console.log(`   ❌ Error processing ${url}: ${error.message}`);
        
        const errorData = {
          url: url,
          category: 'error',
          confidence: 'none',
          reason: error.message,
          recommended_scraper: null,
          expected_success_rate: 0
        };
        
        results.push(errorData);
        this.results.low_priority.push(errorData);
      }
    }
    
    this.results.categorized_links = results.length;
    return results;
  }

  async generateScrapingPlan() {
    console.log('\n📋 Generating optimized scraping plan...\n');
    
    const plan = {
      execution_order: [
        {
          priority: 1,
          name: "High Priority (Proven Success)",
          links: this.results.high_priority,
          estimated_success: "80-100%",
          recommended_approach: "Immediate batch processing"
        },
        {
          priority: 2, 
          name: "Medium Priority (Likely Success)",
          links: this.results.medium_priority,
          estimated_success: "30-80%",
          recommended_approach: "Test small batches first"
        },
        {
          priority: 3,
          name: "Low Priority (Low Success)",
          links: this.results.low_priority,
          estimated_success: "0-30%",
          recommended_approach: "Manual investigation needed"
        },
        {
          priority: 4,
          name: "Unknown (Requires Testing)",
          links: this.results.requires_testing,
          estimated_success: "Unknown",
          recommended_approach: "Pattern detection and manual testing"
        }
      ],
      
      scraper_usage: {},
      category_summary: {},
      total_estimated_questions: 0
    };
    
    // Calculate scraper usage
    Object.entries(this.categories).forEach(([category, data]) => {
      if (data.links.length === 0) return;
      
      const scraper = data.scraper;
      if (!plan.scraper_usage[scraper]) {
        plan.scraper_usage[scraper] = {
          links: [],
          expected_questions: 0,
          estimated_success_rate: data.success_rate
        };
      }
      
      plan.scraper_usage[scraper].links.push(...data.links);
      
      // Estimate questions based on category
      let questionsPerLink = 50; // Default estimate
      if (category === 'single_page_multi_question') questionsPerLink = 50;
      else if (category === 'navigation_based_single_question') questionsPerLink = 50;
      else questionsPerLink = 30; // Conservative estimate
      
      const expectedQuestions = data.links.length * questionsPerLink * (data.success_rate / 100);
      plan.scraper_usage[scraper].expected_questions += expectedQuestions;
      plan.total_estimated_questions += expectedQuestions;
      
      plan.category_summary[category] = {
        link_count: data.links.length,
        estimated_questions: expectedQuestions,
        success_rate: data.success_rate
      };
    });
    
    return plan;
  }

  async saveResults() {
    const timestamp = new Date().toISOString().split('T')[0];
    const outputDir = 'link_categorization';
    
    await fs.mkdir(outputDir, { recursive: true });
    
    // Save categorized links
    await fs.writeFile(
      path.join(outputDir, `categorized_links_${timestamp}.json`),
      JSON.stringify(this.categories, null, 2)
    );
    
    // Save processing results
    await fs.writeFile(
      path.join(outputDir, `processing_results_${timestamp}.json`),
      JSON.stringify(this.results, null, 2)
    );
    
    // Generate scraping plan
    const scrapingPlan = await this.generateScrapingPlan();
    await fs.writeFile(
      path.join(outputDir, `scraping_plan_${timestamp}.json`),
      JSON.stringify(scrapingPlan, null, 2)
    );
    
    console.log(`💾 Results saved to ${outputDir}/ directory`);
    return scrapingPlan;
  }

  printSummary(scrapingPlan) {
    console.log('\n📊 LINK CATEGORIZATION SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`📋 TOTAL PROCESSED: ${this.results.total_links} links`);
    console.log(`✅ SUCCESSFULLY CATEGORIZED: ${this.results.categorized_links} links\n`);
    
    console.log('📂 CATEGORIES:');
    Object.entries(this.categories).forEach(([name, data]) => {
      if (data.links.length > 0) {
        console.log(`   ${name}: ${data.links.length} links (${data.success_rate}% success rate)`);
      }
    });
    
    console.log('\n🎯 PRIORITY BREAKDOWN:');
    console.log(`   🟢 High Priority: ${this.results.high_priority.length} links`);
    console.log(`   🟡 Medium Priority: ${this.results.medium_priority.length} links`);
    console.log(`   🔴 Low Priority: ${this.results.low_priority.length} links`);
    console.log(`   ❓ Requires Testing: ${this.results.requires_testing.length} links`);
    
    console.log('\n🤖 RECOMMENDED SCRAPERS:');
    Object.entries(scrapingPlan.scraper_usage).forEach(([scraper, data]) => {
      console.log(`   ${scraper}: ${data.links.length} links (~${Math.round(data.expected_questions)} questions)`);
    });
    
    console.log(`\n📊 ESTIMATED TOTAL QUESTIONS: ~${Math.round(scrapingPlan.total_estimated_questions)}`);
    
    console.log('\n🚀 RECOMMENDED EXECUTION ORDER:');
    scrapingPlan.execution_order.forEach((phase, i) => {
      if (phase.links.length > 0) {
        console.log(`   ${phase.priority}. ${phase.name}: ${phase.links.length} links (${phase.estimated_success})`);
      }
    });
    
    console.log('='.repeat(70));
  }

  // Interactive link input method
  async promptForLinks() {
    console.log('\n🔗 LINK CATEGORIZER READY!');
    console.log('📝 Please paste your links (one per line) and press Enter twice when done:\n');
    
    const links = [];
    
    // In a real implementation, you'd use readline for interactive input
    // For now, return empty array to be filled manually
    return links;
  }
}

// Example usage function
async function processLinksFromArray(linkArray) {
  const categorizer = new LinkCategorizer();
  
  console.log('🚀 Starting Link Categorization Process...\n');
  
  const results = await categorizer.processLinkBatch(linkArray);
  const scrapingPlan = await categorizer.saveResults();
  categorizer.printSummary(scrapingPlan);
  
  return {
    categorizer,
    results,
    scrapingPlan
  };
}

// Interactive mode
async function interactiveMode() {
  const categorizer = new LinkCategorizer();
  
  console.log('\n🎯 INTERACTIVE LINK CATEGORIZER');
  console.log('===============================');
  console.log('🔗 Paste your links below (one per line):');
  console.log('📝 Press CTRL+D when finished\n');
  
  // Read from stdin
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const links = [];
  
  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (trimmed) {
      links.push(trimmed);
      console.log(`   ✅ Added: ${trimmed}`);
    }
  });
  
  rl.on('close', async () => {
    console.log(`\n📋 Processing ${links.length} links...\n`);
    
    if (links.length === 0) {
      console.log('❌ No links provided. Exiting...');
      return;
    }
    
    const results = await categorizer.processLinkBatch(links);
    const scrapingPlan = await categorizer.saveResults();
    categorizer.printSummary(scrapingPlan);
  });
}

// Export for use as module
module.exports = { 
  LinkCategorizer, 
  processLinksFromArray,
  interactiveMode 
};

// Run interactive mode if called directly
if (require.main === module) {
  interactiveMode().catch(console.error);
} 