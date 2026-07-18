const axios = require('axios');
const RateLimiter = require('../utils/rateLimiter');

const limiter = new RateLimiter(0.5);

const ARCTIC_SHIFT_BASE = 'https://arctic-shift.photon-reddit.com';

class TopicAnalyzer {
  constructor() {
    this.headers = {
      'User-Agent': 'ResearchToolkit/1.0 (Educational Research)',
    };

    this.generalSubreddits = [
      'NoStupidQuestions', 'explainlikeimfive', 'TooAfraidToAsk',
      'InternetIsBeautiful', 'dataisbeautiful', 'LifeProTips',
    ];

    this.topicSubredditMap = {
      keyboard: ['MechanicalKeyboards', 'keyboards', 'MouseReview', 'desksetup'],
      mechanical: ['MechanicalKeyboards', 'keyboards', 'InputDevices'],
      programming: ['learnprogramming', 'cscareerquestions', 'coding', 'webdev', 'javascript', 'Python', 'rust', 'golang', 'java', 'cpp'],
      coding: ['learnprogramming', 'cscareerquestions', 'coding', 'webdev', 'javascript', 'Python'],
      developer: ['ExperiencedDevs', 'dev', 'programmer', 'codemonkey'],
      software: ['softwareengineering', 'SoftwareArchitecture', 'programming'],
      web: ['webdev', 'web_design', 'reactjs', 'vuejs', 'angular', 'nextjs', 'svelte'],
      frontend: ['reactjs', 'vuejs', 'angular', 'svelte', 'tailwindcss', 'webdev'],
      backend: ['node', 'django', 'rails', 'golang', 'rust', 'java'],
      data: ['datascience', 'machinelearning', 'statistics', 'analytics', 'dataengineering'],
      ai: ['MachineLearning', 'artificial', 'LocalLLaMA', 'singularity', 'ChatGPT', 'OpenAI', 'ClaudeAI', 'StableDiffusion'],
      machine: ['MachineLearning', 'deeplearning', 'LocalLLaMA', 'computer_vision'],
      llm: ['LocalLLaMA', 'ChatGPT', 'artificial', 'LanguageTechnology'],
      tech: ['technology', 'Futurology', 'gadgets', 'TechSupport', 'buildapc', 'pcmasterrace'],
      computer: ['buildapc', 'pcmasterrace', 'hardware', 'Intel', 'nvidia', 'AMD'],
      laptop: ['laptops', 'thinkpad', 'DellXPS', 'MacBookPro', 'LenovoLegion'],
      gaming: ['gaming', 'Games', 'pcgaming', 'nintendo', 'playstation', 'xbox', 'GameDeals', 'patientgamers'],
      game: ['gaming', 'pcgaming', 'IndieGaming', 'IndieDev', 'gamedev'],
      science: ['science', 'askscience', 'chemistry', 'biology', 'space', 'astronomy', 'physics'],
      physics: ['Physics', 'askscience', 'PhysicsStudents', 'AskPhysics', 'TheoreticalPhysics'],
      math: ['math', 'learnmath', 'MathHelp', 'mathematics'],
      biology: ['biology', 'molecularbiology', 'ecology', 'evolution'],
      chemistry: ['chemistry', 'chemhelp', 'chempros'],
      health: ['health', 'fitness', 'nutrition', 'mentalhealth', 'MedicalAdvice', 'AskDocs', 'Supplements'],
      fitness: ['fitness', 'bodyweightfitness', 'weightlifting', 'running', 'yoga'],
      exercise: ['fitness', 'running', 'cycling', 'swimming', 'yoga', 'bodyweightfitness'],
      nutrition: ['nutrition', 'EatCheapAndHealthy', 'MealPrepSunday', 'vegan', 'keto'],
      mental: ['mentalhealth', 'Anxiety', 'depression', 'ADHD', 'selfimprovement', 'socialskills'],
      medicine: ['MedicalAdvice', 'AskDocs', 'pharmacy', 'nursing', 'medical'],
      food: ['cooking', 'food', 'recipes', 'AskCulinary', 'MealPrepSunday', 'EatCheapAndHealthy'],
      cooking: ['cooking', 'AskCulinary', 'recipes', 'MealPrepSunday', 'CookingForBeginners'],
      recipe: ['recipes', 'Old_Recipes', 'BudgetFood', 'castiron'],
      restaurant: ['restaurants', 'kitchenconfidential', 'talesfromthecustomer'],
      finance: ['personalfinance', 'investing', 'stocks', 'CryptoCurrency', 'FinancialPlanning', 'frugal', 'FIRE'],
      investing: ['investing', 'stocks', 'wallstreetbets', 'CryptoCurrency', 'Bogleheads'],
      crypto: ['CryptoCurrency', 'Bitcoin', 'ethereum', 'altcoin', 'CryptoMarkets'],
      money: ['personalfinance', 'Frugal', 'povertyfinance', 'FinancialPlanning'],
      budget: ['Frugal', 'personalfinance', 'BudgetFood', 'povertyfinance'],
      travel: ['travel', 'solotravel', 'backpacking', 'DigitalNomad', 'RoadTrips', 'Flights'],
      education: ['learnprogramming', 'College', 'HomeworkHelp', 'GetStudying', 'GradSchool', 'Education', 'college'],
      study: ['GetStudying', 'studytips', 'CollegeRant', 'homework_help'],
      student: ['College', 'GradSchool', 'college', 'UniUK', 'ApplyingToCollege'],
      books: ['books', 'suggestmeabook', 'booksuggestions', 'whatsthatbook', '52book'],
      reading: ['books', 'audiobooks', 'kindle', 'bookclub'],
      environment: ['environment', 'climate', 'sustainability', 'RenewableEnergy', 'ZeroWaste', 'electricvehicles'],
      climate: ['climate', 'environment', 'RenewableEnergy', 'climatechange'],
      energy: ['RenewableEnergy', 'solar', 'electricvehicles', 'Energy'],
      psychology: ['psychology', 'AskPsychology', 'cognitivepsychology', 'socialpsychology'],
      history: ['history', 'AskHistorians', 'HistoryPorn', 'ArtHistory', 'ancienthistory'],
      philosophy: ['philosophy', 'askphilosophy', 'Ethics', 'Existentialism', 'Stoicism'],
      law: ['LegalAdvice', 'law', 'Ask_Law', 'legaladviceofftopic', 'tax'],
      art: ['Art', 'DigitalArt', 'photography', 'Drawing', 'ArtCrit', 'ArtStore'],
      diy: ['DIY', 'HowTo', 'LifeProTips', 'YouShouldKnow', 'HomeImprovement'],
      home: ['HomeImprovement', 'HomeAutomation', 'interiordesign', 'InteriorDesign', 'furniture'],
      cars: ['cars', 'Cartalk', 'auto', 'whatcarshouldIbuy', 'carsales', 'ElectricVehicles'],
      sports: ['sports', 'nfl', 'nba', 'soccer', 'MMA', 'boxing', 'CFB', 'formula1'],
      business: ['Entrepreneur', 'smallbusiness', 'startups', 'SideProject', 'indiehackers'],
      marketing: ['marketing', 'digital_marketing', 'SEO', 'socialmedia', 'dropship'],
      parenting: ['Parenting', 'daddit', 'mommit', 'BabyBumps', 'toddlers'],
      relationships: ['relationships', 'relationship_advice', 'dating', 'marriage', 'dating_advice'],
      pets: ['pets', 'dogs', 'cats', 'parrots', 'fish', 'Reptiles'],
      dog: ['dogs', 'DogAdvice', 'puppy101', 'reactivedogs'],
      cat: ['cats', 'CatAdvice', 'CatsAreAssholes', 'kitten'],
      music: ['Music', 'WeAreTheMusicMakers', 'guitar', 'piano', 'listentothis', 'spotify'],
      movies: ['movies', 'moviecritic', 'NetflixBestOf', 'tipofmytongue', 'television', 'MovieDetails'],
      tv: ['television', ' television', 'NetflixBestOf', 'HBOmax', 'DisneyPlus'],
      photography: ['photography', 'AskPhotography', 'photo', 'itookapicture', 'photoshop'],
      fashion: ['malefashionadvice', 'femalefashionadvice', 'sneakers', 'watches', 'frugalmalefashion'],
      language: ['languagelearning', 'Spanish', 'french', 'German', 'Japanese', 'Korean', 'ChineseLanguage'],
      space: ['space', 'spacex', 'nasa', 'astrophysics', 'astronomy'],
      military: ['military', 'army', 'airforce', 'navy', 'USMC', 'veterans'],
      legal: ['LegalAdvice', 'law', 'Ask_Law', 'legaladviceofftopic'],
      housing: ['personalfinance', 'RealEstate', 'firsttimehomebuyer', 'apartments', 'roommates'],
      apartment: ['apartments', 'InteriorDesign', 'furniture', 'HomeImprovement'],
      wedding: ['wedding', 'weddingplanning', 'weddingsunder10k', 'WeddingsUnder10k'],
      makeup: ['MakeupAddiction', 'SkincareAddiction', 'AsianBeauty', 'drugstoreMUA'],
      skincare: ['SkincareAddiction', 'AsianBeauty', '30PlusSkinCare', 'acne'],
      cleaning: ['CleaningTips', 'Organization', 'declutter'],
      gardening: ['gardening', 'IndoorGarden', 'houseplants', 'vegetablegardening', 'Permaculture'],
      vegan: ['vegan', 'VeganFood', 'veganrecipes', 'vegancirclejerk'],
      coffee: ['coffee', 'espresso', 'roasting', 'FrenchPress'],
      tea: ['tea', 'TeaPorn', 'puer', 'matcha'],
      beer: ['beer', 'Homebrewing', 'craftbeer', 'BeerPorn'],
      wine: ['wine', 'winemaking', 'WinePorn'],
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
    const allWords = topicLower.split(/\s+/);
    const matchedSubs = new Set();
    for (const [key, subs] of Object.entries(this.topicSubredditMap)) {
      if (allWords.includes(key) || topicLower.includes(`${key} `) || topicLower.includes(` ${key}`)) {
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
