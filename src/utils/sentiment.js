const POSITIVE = ['love', 'great', 'amazing', 'excellent', 'awesome', 'fantastic', 'best', 'perfect', 'brilliant', 'wonderful', 'excited', 'happy', 'recommend', 'success', 'win'];
const NEGATIVE = ['hate', 'terrible', 'awful', 'worst', 'horrible', 'bad', 'fail', 'problem', 'struggle', 'difficult', 'frustrat', 'annoying', 'waste', 'scam', 'avoid'];
const NEUTRAL = ['maybe', 'perhaps', 'might', 'could', 'think', 'opinion', 'consider', 'wonder'];

function getSentiment(text) {
  const lower = text.toLowerCase();
  let posCount = 0, negCount = 0, neuCount = 0;
  for (const w of POSITIVE) { if (lower.includes(w)) posCount++; }
  for (const w of NEGATIVE) { if (lower.includes(w)) negCount++; }
  for (const w of NEUTRAL) { if (lower.includes(w)) neuCount++; }

  if (posCount > negCount && posCount > neuCount) return 'positive';
  if (negCount > posCount && negCount > neuCount) return 'negative';
  return 'neutral';
}

function analyzeBatch(posts) {
  let positive = 0, negative = 0, neutral = 0;
  for (const post of posts) {
    const text = post.title + ' ' + (post.text || '');
    const sent = getSentiment(text);
    if (sent === 'positive') positive++;
    else if (sent === 'negative') negative++;
    else neutral++;
  }

  const total = posts.length || 1;
  return {
    positive,
    negative,
    neutral,
    positivePct: Math.round((positive / total) * 100),
    negativePct: Math.round((negative / total) * 100),
    neutralPct: Math.round((neutral / total) * 100),
  };
}

const SENTIMENT_WORDS_JS = `const POSITIVE=${JSON.stringify(POSITIVE)};const NEGATIVE=${JSON.stringify(NEGATIVE)};const NEUTRAL=${JSON.stringify(NEUTRAL)};`;

module.exports = { getSentiment, analyzeBatch, SENTIMENT_WORDS_JS };
