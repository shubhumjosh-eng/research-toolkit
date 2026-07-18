const axios = require('axios');
const RateLimiter = require('../utils/rateLimiter');

const limiter = new RateLimiter(1);

const ARCTIC_SHIFT_BASE = 'https://arctic-shift.photon-reddit.com';

class TopicAnalyzer {
  constructor() {
    this.headers = {
      'User-Agent': 'ResearchToolkit/1.0 (Educational Research)',
    };

    this.generalSubreddits = [
      'todayilearned', 'AskReddit', 'NoStupidQuestions', 'explainlikeimfive',
      'science', 'worldnews', 'books', 'history', 'philosophy',
      'Technology', 'Futurology', 'InternetIsBeautiful', 'dataisbeautiful',
      'LifeProTips', 'YouShouldKnow',
    ];

    this.topicSubredditMap = {
      physics: ['Physics', 'askscience', 'PhysicsStudents', 'AskPhysics'],
      science: ['science', 'askscience', 'chemistry', 'biology', 'space', 'astronomy'],
      tech: ['technology', 'programming', 'webdev', 'MachineLearning', 'artificial', 'LocalLLaMA'],
      coding: ['learnprogramming', 'cscareerquestions', 'coding', 'webdev', 'javascript', 'Python'],
      ai: ['MachineLearning', 'artificial', 'LocalLLaMA', 'singularity', 'ChatGPT'],
      health: ['health', 'fitness', 'nutrition', 'mentalhealth', 'MedicalAdvice', 'AskDocs'],
      education: ['learnprogramming', 'College', 'HomeworkHelp', 'GetStudying', 'GradSchool', 'Education'],
      finance: ['personalfinance', 'investing', 'stocks', 'CryptoCurrency', 'FinancialPlanning', 'frugal'],
      gaming: ['gaming', 'Games', 'pcgaming', 'nintendo', 'playstation', 'xbox'],
      food: ['cooking', 'food', 'recipes', 'AskCulinary', 'MealPrepSunday', 'EatCheapAndHealthy'],
      travel: ['travel', 'solotravel', 'backpacking', 'DigitalNomad', 'RoadTrips'],
      music: ['Music', 'WeAreTheMusicMakers', 'guitar', 'piano', 'listentothis'],
      movies: ['movies', 'moviecritic', 'NetflixBestOf', 'tipofmytongue', 'television'],
      environment: ['environment', 'climate', 'sustainability', 'RenewableEnergy', 'ZeroWaste'],
      psychology: ['psychology', 'AskPsychology', 'cognitivepsychology', 'socialpsychology'],
      history: ['history', 'AskHistorians', 'HistoryPorn', 'ArtHistory'],
      philosophy: ['philosophy', 'askphilosophy', 'Ethics', 'Existentialism'],
      law: ['LegalAdvice', 'law', 'Ask_Law', 'legaladviceofftopic'],
      art: ['Art', 'DigitalArt', 'photography', 'Drawing', 'ArtCrit'],
      diy: ['DIY', 'HowTo', 'LifeProTips', 'YouShouldKnow'],
      sports: ['sports', 'nfl', 'nba', 'soccer', 'MMA', 'boxing'],
      business: ['Entrepreneur', 'smallbusiness', 'startups', 'SideProject', 'indiehackers'],
      cars: ['cars', 'Cartalk', 'auto', 'whatcarshouldIbuy'],
      parenting: ['Parenting', 'daddit', 'mommit', 'BabyBumps'],
      relationships: ['relationships', 'relationship_advice', 'dating', 'marriage'],
      pets: ['pets', 'dogs', 'cats', 'parrots', 'fish'],
    };
  }

  async discoverSubreddits(topic, onLog = null) {
    const log = onLog || (() => {});
    await limiter.wait();

    const topicWords = topic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const searchPrefix = topicWords[0] || topic.toLowerCase().substring(0, 5);

    // Find matching subreddits from topic keyword map
    const topicLower = topic.toLowerCase();
    const matchedSubs = new Set();
    for (const [key, subs] of Object.entries(this.topicSubredditMap)) {
      if (topicLower.includes(key)) {
        subs.forEach(s => matchedSubs.add(s));
      }
    }

    // Always include a few general fallbacks
    const fallbacks = this.generalSubreddits.slice(0, 4);
    fallbacks.forEach(s => matchedSubs.add(s));

    try {
      const response = await axios.get(`${ARCTIC_SHIFT_BASE}/api/subreddits/search`, {
        params: {
          subreddit_prefix: searchPrefix,
          limit: 25,
          sort_type: 'subscribers',
          sort: 'desc',
          fields: 'display_name,subscribers,public_description',
        },
        headers: this.headers,
        timeout: 15000,
      });

      const found = (response.data.data || [])
        .map(s => ({
          name: s.display_name,
          subscribers: s.subscribers || 0,
          description: (s.public_description || '').substring(0, 200),
          active: 0,
        }))
        .filter(s => s.subscribers > 1000);

      // Merge: found subs + keyword-matched subs + fallbacks
      const merged = [...found];
      for (const name of matchedSubs) {
        if (!merged.find(m => m.name.toLowerCase() === name.toLowerCase())) {
          merged.push({ name, subscribers: 0, description: '', active: 0 });
        }
      }

      return merged.slice(0, 15);
    } catch (error) {
      log('warn', 'Arctic Shift subreddit search failed, using keyword + default list...');
      return [...matchedSubs].map(name => ({
        name,
        subscribers: 0,
        description: '',
        active: 0,
      })).slice(0, 15);
    }
  }

  buildSearchQueries(topic) {
    const words = topic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const queries = [topic];

    if (words.length > 2) {
      queries.push(words.slice(0, 3).join(' '));
      queries.push(words.slice(0, 2).join(' '));
    }

    const variations = [
      `${topic} explained`,
      `${topic} overview`,
      `${topic} discussion`,
      `${topic} review`,
      `${topic} pros and cons`,
      `${topic} latest research`,
      `${topic} common questions`,
      `${topic} tips`,
    ];

    return [...queries, ...variations].slice(0, 8);
  }
}

module.exports = new TopicAnalyzer();
