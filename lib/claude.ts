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

  const snippet = content.substring(0, 1000);
  const prompt = `Проанализируй новость о фонде "Samruk-Kazyna Trust". Заголовок: "${title}". Текст: "${snippet}". Ответь ТОЛЬКО чистым JSON без markdown: {"is_relevant": true/false, "sentiment": "positive/neutral/negative", "sentiment_score": 0-10, "main_topic": "тема", "keywords": [], "people_mentioned": [], "projects_mentioned": [], "summary_ru": "суть"}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", // ✅ обновлено с claude-3-5-sonnet-20240620
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API ошибка:', errorText);
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
  if (!apiKey || articles.length === 0) return [];

  const articlesList = articles.slice(0, 5).map((a, i) => `${i + 1}. ${a.title}`).join('\n');
  const prompt = `Проанализируй список статей о Samruk-Kazyna Trust. Ответь JSON массивом: ${articlesList}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // ✅ обновлено с claude-3-haiku-20240307
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) return [];

    const data = await response.json();
    const cleanText = data.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    return [];
  }
}
