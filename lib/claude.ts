interface AnalysisResult {
  is_relevant: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentiment_score: number;
  main_topic: string;
  keywords: string[];
  people_mentioned: string[];
  projects_mentioned: string[];
  summary_ru: string;
}

export async function analyzeArticle(
  title: string,
  content: string
): Promise<AnalysisResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY не установлен');
    return null;
  }

  const snippet = content.substring(0, 800); // Экономим токены

  const prompt = `Проанализируй эту новостную статью о фонде "Samruk-Kazyna Trust":

Заголовок: "${title}"
Текст: "${snippet}"

Ответь ТОЛЬКО в формате JSON (без markdown):
{
  "is_relevant": true/false (относится ли к фонду Samruk-Kazyna Trust?),
  "sentiment": "positive/neutral/negative",
  "sentiment_score": 0-10 (насколько позитивная/негативная),
  "main_topic": "гранты/мероприятия/технологии/партнёрство/рейтинги/другое",
  "keywords": ["ключевое слово 1", "ключевое слово 2"],
  "people_mentioned": ["Адиева А.", "другие имена"],
  "projects_mentioned": ["SKAI", "MASA", "другие проекты"],
  "summary_ru": "краткая суть в 1-2 предложениях"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-20240307', // Самая дешёвая модель
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Claude API ошибка:', await response.text());
      return null;
    }

    const data = await response.json();
    const text = data.content[0].text;
    
    // Убираем markdown обёртки если есть
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const result = JSON.parse(cleanText);
    
    return result;
  } catch (error) {
    console.error('Ошибка анализа Claude:', error);
    return null;
  }
}

// Batch анализ (экономит токены)
export async function analyzeBatch(
  articles: Array<{ title: string; content: string }>
): Promise<AnalysisResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey || articles.length === 0) {
    return [];
  }

  // Берём только первые 10 статей за раз
  const batch = articles.slice(0, 10);

  const articlesList = batch.map((a, i) => 
    `${i + 1}. "${a.title}" - ${a.content.substring(0, 200)}`
  ).join('\n');

  const prompt = `Проанализируй эти статьи о фонде Samruk-Kazyna Trust.
Ответь JSON массивом (без markdown):

${articlesList}

[
  {"id": 1, "is_relevant": true/false, "sentiment": "positive/neutral/negative", "main_topic": "гранты/мероприятия/технологии/другое", "keywords": [], "people_mentioned": [], "projects_mentioned": [], "summary_ru": ""},
  ...
]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-20240307',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('Claude API ошибка:', await response.text());
      return [];
    }

    const data = await response.json();
    const text = data.content[0].text;
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const results = JSON.parse(cleanText);
    
    return results;
  } catch (error) {
    console.error('Ошибка batch анализа:', error);
    return [];
  }
}
