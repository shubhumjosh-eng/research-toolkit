const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
  'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
  'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if',
  'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
  'about', 'against', 'between', 'through', 'during', 'before', 'after', 'above',
  'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's',
  't', 'can', 'will', 'just', 'don', 'should', 'now', 'let', 'also', 'would',
  'could', 'get', 'got', 'make', 'made', 'like', 'want', 'need', 'thing', 'things',
  'way', 'going', 'go', 'know', 'take', 'come', 'think', 'see', 'look', 'want',
  'give', 'use', 'find', 'tell', 'ask', 'work', 'seem', 'feel', 'try', 'leave',
  'call', 'good', 'new', 'first', 'last', 'long', 'great', 'little', 'right',
  'old', 'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young',
  'important', 'public', 'bad', 'same', 'able'
]);

const KNOWN_PHRASES = [
  'machine learning', 'deep learning', 'artificial intelligence', 'neural network',
  'natural language', 'computer science', 'data science', 'quantum computing',
  'climate change', 'global warming', 'renewable energy', 'social media',
  'mental health', 'physical health', 'work life balance', 'time management',
  'stock market', 'real estate', 'cryptocurrency', 'block chain',
  'hula hoop', 'jump rope', 'yoga mat', 'meal prep', 'sleep hygiene',
  'home workout', 'body weight', 'strength training', 'cardio exercise',
  'recipe video', 'cooking tip', 'meal planning', 'food prep',
  'budget travel', 'solo travel', 'road trip', 'backpacking',
  'side hustle', 'passive income', 'freelance work', 'remote work',
  'study technique', 'learning method', 'memory palace', 'spaced repetition',
  'parenting tip', 'child development', 'teenager advice', 'family time',
  'relationship advice', 'dating tip', 'communication skill', 'conflict resolution',
  'car maintenance', 'home repair', 'diy project', 'garden design',
  'pet care', 'dog training', 'cat behavior', 'fish keeping',
  'music production', 'guitar lesson', 'piano practice', 'singing tip',
  'photo editing', 'video editing', 'graphic design', 'web design',
  'programming language', 'software development', 'web development', 'mobile app',
  'open source', 'version control', 'code review', 'test driven',
  'agile method', 'scrum master', 'project management', 'product management',
  'user experience', 'user interface', 'design thinking', 'a b testing',
  'search engine', 'social network', 'cloud computing', 'edge computing',
  'internet of things', 'cyber security', 'data privacy', 'encryption',
  'virtual reality', 'augmented reality', 'mixed reality', 'spatial computing',
  'autonomous vehicle', 'electric vehicle', 'self driving', 'lidar sensor',
  'gene therapy', 'crispr', 'stem cell', 'clinical trial',
  'solar panel', 'wind turbine', 'battery storage', 'power grid',
  'supply chain', 'lean manufacturing', 'six sigma', 'quality control',
  'market research', 'customer acquisition', 'growth hacking', 'product market fit',
  'venture capital', 'angel investor', 'startup funding', 'bootstrapping',
  'personal finance', 'emergency fund', 'index fund', 'compound interest',
  'meditation', 'breathwork', 'cold shower', 'dopamine detox',
  'intermittent fasting', 'keto diet', 'paleo diet', 'plant based',
  'minimalism', 'declutter', 'capsule wardrobe', 'digital nomad',
  'journaling', 'gratitude', 'habit stacking', 'atomic habits',
  'public speaking', 'negotiation skill', 'leadership style', 'emotional intelligence',
  'creative writing', 'blog writing', 'copywriting', 'content marketing',
  'email marketing', 'seo optimization', 'funnel building', 'landing page',
  'a i agent', 'large language model', 'prompt engineering', 'fine tuning',
  'vector database', 'retrieval augmented', 'transfer learning', 'reinforcement learning',
];

const INTENT_PATTERNS = [
  { pattern: /\b(how to|how do i|how can i|tutorial|guide|learn)\b/i, intent: 'how-to' },
  { pattern: /\b(best|top|recommended|review|compare|vs|versus)\b/i, intent: 'comparison' },
  { pattern: /\b(problem|issue|error|fix|troubleshoot|debug|help)\b/i, intent: 'problem' },
  { pattern: /\b(buy|price|cost|cheap|expensive|budget|afford)\b/i, intent: 'buying' },
  { pattern: /\b(start|begin|beginner|intro|getting started|first time)\b/i, intent: 'getting-started' },
  { pattern: /\b(why|reason|benefit|advantage|pros|cons)\b/i, intent: 'why' },
  { pattern: /\b(when|time|date|schedule|deadline|latest)\b/i, intent: 'when' },
  { pattern: /\b(where|place|location|near|online|website)\b/i, intent: 'where' },
];

class QueryAnalyzer {
  analyze(rawQuery) {
    const normalized = rawQuery.toLowerCase().trim();
    const phrases = this.detectPhrases(normalized);
    const keywords = this.extractKeywords(normalized, phrases);
    const intent = this.detectIntent(normalized);
    const expanded = this.expandQuery(normalized, phrases, keywords, intent);

    return {
      original: rawQuery,
      normalized,
      phrases,
      keywords,
      intent,
      expanded,
      searchTerms: [...phrases, ...keywords].join(' '),
    };
  }

  detectPhrases(text) {
    const found = [];
    const lower = text.toLowerCase();

    for (const phrase of KNOWN_PHRASES) {
      if (lower.includes(phrase)) {
        found.push(phrase);
      }
    }

    const words = text.split(/\s+/).filter(w => w.length > 1);
    for (let n = Math.min(words.length, 4); n >= 2; n--) {
      for (let i = 0; i <= words.length - n; i++) {
        const gram = words.slice(i, i + n).join(' ');
        if (found.includes(gram)) continue;

        const nonStop = words.slice(i, i + n).filter(w => !STOP_WORDS.has(w));
        if (nonStop.length >= 2 && this.looksLikePhrase(nonStop)) {
          if (!found.some(f => f.includes(gram) || gram.includes(f))) {
            found.push(gram);
          }
        }
      }
    }

    return found;
  }

  looksLikePhrase(words) {
    if (words.length < 2) return false;
    const nounish = ['study', 'research', 'method', 'technique', 'approach', 'theory',
      'model', 'system', 'process', 'concept', 'principle', 'practice', 'strategy',
      'framework', 'tool', 'software', 'language', 'platform', 'community', 'benefit',
      'problem', 'solution', 'challenge', 'result', 'effect', 'impact', 'change'];
    return words.some(w => nounish.includes(w)) || words.every(w => w.length > 3);
  }

  extractKeywords(text, phrases) {
    const words = text.split(/\s+/).filter(w => {
      if (w.length < 2) return false;
      if (STOP_WORDS.has(w)) return false;
      if (phrases.some(p => p.includes(w) && !p.split(' ').includes(w))) return false;
      return true;
    });
    return [...new Set(words)];
  }

  detectIntent(text) {
    for (const { pattern, intent } of INTENT_PATTERNS) {
      if (pattern.test(text)) return intent;
    }
    return 'general';
  }

  expandQuery(original, phrases, keywords, intent) {
    const mainTerms = phrases.length > 0 ? phrases.join(' ') : keywords.slice(0, 3).join(' ');
    const templates = this.getTemplates(intent);

    const expanded = templates.map(template =>
      template.replace('{topic}', mainTerms).replace('{keywords}', keywords.slice(0, 4).join(' '))
    );

    return [...new Set([mainTerms, ...expanded])].slice(0, 6);
  }

  getTemplates(intent) {
    switch (intent) {
      case 'how-to':
        return [
          '{topic} tutorial guide',
          '{topic} step by step',
          '{topic} tips for beginners',
          '{topic} common mistakes',
          '{topic} best practices',
        ];
      case 'comparison':
        return [
          '{topic} review',
          '{topic} pros and cons',
          '{topic} alternatives',
          '{topic} recommendations',
          '{topic} which is better',
        ];
      case 'problem':
        return [
          '{topic} solutions',
          '{topic} troubleshooting',
          '{topic} fix resolve',
          '{topic} reddit discussion',
          '{topic} Stack Overflow',
        ];
      case 'buying':
        return [
          '{topic} buying guide',
          '{topic} price comparison',
          '{topic} best value',
          '{topic} budget options',
          '{topic} worth it reddit',
        ];
      case 'getting-started':
        return [
          '{topic} beginner guide',
          '{topic} getting started',
          '{topic} first steps',
          '{topic} what you need',
          '{topic} introduction overview',
        ];
      case 'why':
        return [
          '{topic} benefits advantages',
          '{topic} reasons why',
          '{topic} research evidence',
          '{topic} expert opinion',
          '{topic} experience reddit',
        ];
      default:
        return [
          '{topic} overview guide',
          '{topic} discussion reddit',
          '{topic} tips advice',
          '{topic} latest trends',
          '{topic} expert opinion',
        ];
    }
  }

  scoreResult(result, analysis) {
    let score = 0;
    const text = ((result.title || '') + ' ' + (result.text || result.description || '') + ' ' + (result.snippet || '')).toLowerCase();
    const originalLower = analysis.normalized;

    for (const phrase of analysis.phrases) {
      if (text.includes(phrase)) score += 30;
    }

    for (const keyword of analysis.keywords) {
      if (text.includes(keyword)) score += 10;
    }

    if (text.includes(originalLower)) score += 50;

    const wordOverlap = analysis.keywords.filter(k => text.includes(k)).length;
    score += Math.min(wordOverlap * 5, 25);

    if (result.score && result.score > 10) score += 5;
    if (result.score && result.score > 100) score += 10;
    if (result.numComments && result.numComments > 5) score += 5;
    if (result.numComments && result.numComments > 20) score += 10;
    if (result.viewCount && result.viewCount > 1000) score += 5;
    if (result.likeCount && result.likeCount > 10) score += 5;

    if (text.length < 20) score -= 10;
    if (result.title && result.title.length < 5) score -= 10;

    const spamWords = ['click here', 'buy now', 'limited time', 'act now', 'free money', 'subscribe'];
    if (spamWords.some(w => text.includes(w))) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  extractSnippet(result, analysis, maxLen = 200) {
    const fullText = result.text || result.description || result.snippet || result.title || '';
    if (!fullText) return '';

    const sentences = fullText.split(/[.!?\n]+/).filter(s => s.trim().length > 15);
    if (sentences.length === 0) return fullText.substring(0, maxLen);

    const scored = sentences.map(s => {
      const lower = s.toLowerCase();
      let score = 0;
      for (const phrase of analysis.phrases) {
        if (lower.includes(phrase)) score += 30;
      }
      for (const keyword of analysis.keywords) {
        if (lower.includes(keyword)) score += 10;
      }
      return { text: s.trim(), score };
    });

    scored.sort((a, b) => b.score - a.score);
    let snippet = '';
    for (const s of scored) {
      if (snippet.length + s.text.length < maxLen) {
        snippet += (snippet ? ' ' : '') + s.text;
      }
    }

    return snippet || scored[0].text.substring(0, maxLen);
  }

  rankAndDeduplicate(results, analysis) {
    const scored = results.map(r => ({
      ...r,
      relevanceScore: this.scoreResult(r, analysis),
      snippet: this.extractSnippet(r, analysis),
    }));

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const seen = new Set();
    const deduped = scored.filter(r => {
      const key = (r.title || '').toLowerCase().substring(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped;
  }

  clusterResults(results) {
    const themes = {};
    const themeKeywords = {
      'Getting Started': ['begin', 'start', 'intro', 'basic', 'beginner', 'first', 'learn', 'how to', 'guide', 'tutorial'],
      'Expert Opinions': ['expert', 'professor', 'researcher', 'scientist', 'study', 'research', 'academic', 'doctor'],
      'Comparisons & Reviews': ['vs', 'versus', 'compare', 'review', 'alternative', 'better', 'worse', 'recommend', 'best', 'top'],
      'Common Problems': ['problem', 'issue', 'error', 'difficult', 'challenge', 'struggle', 'fail', 'wrong', 'fix'],
      'Tips & Advice': ['tip', 'advice', 'trick', 'hack', 'suggest', 'recommend', 'should', 'try', 'helpful'],
      'Tools & Resources': ['tool', 'resource', 'software', 'app', 'book', 'course', 'template', 'library', 'website'],
      'Community Discussion': ['discuss', 'reddit', 'forum', 'comment', 'opinion', 'experience', 'story', 'personal'],
      'Future & Trends': ['future', 'trend', 'prediction', 'upcoming', 'next', 'emerging', 'innovation', 'new'],
    };

    for (const result of results) {
      const text = ((result.title || '') + ' ' + (result.snippet || '')).toLowerCase();
      let assigned = false;

      for (const [theme, keywords] of Object.entries(themeKeywords)) {
        if (keywords.some(k => text.includes(k))) {
          if (!themes[theme]) themes[theme] = [];
          themes[theme].push(result);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        if (!themes['General']) themes['General'] = [];
        themes['General'].push(result);
      }
    }

    return Object.entries(themes)
      .filter(([, items]) => items.length >= 1)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, items]) => ({ name, count: items.length, items: items.slice(0, 8) }));
  }
}

module.exports = new QueryAnalyzer();
