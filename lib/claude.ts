import { NextRequest, NextResponse } from 'next/server';

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

  const snippet = content.substring(0, 1000); // Немного увеличим охват текста

  const prompt = `Проанализируй эту новостную статью о деятельности фонда "Samruk-Kazyna Trust":

Заголовок: "${title}"
Текст: "${snippet}"

Ответь ТОЛЬКО в формате JSON (без markdown):
{
  "is_relevant": true/false (относится ли к фонду Samruk-Kazyna Trust или его проектам?),
  "sentiment": "positive/neutral/negative",
  "sentiment_score": 0-10,
  "main_topic": "гранты/мероприятия/технологии/партнёрство/рейтинги/другое",
  "keywords": ["ключевое слово 1", "ключевое слово 2"],
  "people_mentioned": ["имена"],
  "projects_mentioned": ["проекты фонда"],
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
        model: 'claude-3-haiku-20240307', // Исправлено название модели
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API ошибка:', errorData);
      return null;
    }

    const data = await response.json();
    const text = data.content[0].text;
    
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Ошибка анализа Claude:', error);
    return null;
  }
}

// Batch анализ
export async function analyzeBatch(
  articles: Array<{ title: string; content: string }>
): Promise<AnalysisResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey || articles.length === 0) {
    return [];
  }

  const batch = articles.slice(0, 10);
  const articlesList = batch.map((a, i) => 
    `${i + 1}. "${a.title}" - ${a.content.substring(0, 300)}`
  ).join('\n');

  const prompt = `Проанализируй эти статьи о фонде Samruk-Kazyna Trust.
Ответь JSON массивом (без markdown):
${articlesList}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Исправлено название модели
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('Claude API ошибка batch:', await response.text());
      return [];
    }

    const data = await response.json();
    const text = data.content[0].text;
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Ошибка batch анализа:', error);
    return [];
  }
}
