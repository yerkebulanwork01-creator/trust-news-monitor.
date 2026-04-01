import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { analyzeArticle } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // 1. Проверка секрета
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  if (secretParam !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Получаем статьи (сначала пробуем необработанные)
    let { data: articles, error: fetchError } = await supabase
      .from('news_articles')
      .select('*')
      .is('processed_at', null)
      .order('published_at', { ascending: false })
      .limit(10);

    if (fetchError) {
      console.error('Ошибка Supabase:', fetchError);
      return NextResponse.json({ error: 'Ошибка получения статей' }, { status: 500 });
    }

    // 3. Если необработанных нет, берем просто последние 10 для теста
    if (!articles || articles.length === 0) {
      const { data: fallback } = await supabase
        .from('news_articles')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(10);
      articles = fallback || [];
    }

    if (articles.length === 0) {
      return NextResponse.json({ success: true, message: 'В базе нет новостей' });
    }

    console.log(`Начинаем анализ ${articles.length} статей...`);
    let analyzedCount = 0;

    // 4. Цикл анализа
    for (const article of articles) {
      try {
        const analysis = await analyzeArticle(article.title, article.content || '');

        if (analysis) {
          const { error: updateError } = await supabase
            .from('news_articles')
            .update({
              is_relevant: analysis.is_relevant,
              sentiment: analysis.sentiment,
              sentiment_score: analysis.sentiment_score,
              main_topic: analysis.main_topic,
              keywords: analysis.keywords,
              summary_ru: analysis.summary_ru,
              processed_at: new Date().toISOString(),
            })
            .eq('id', article.id);

          if (!updateError) analyzedCount++;
        }
        // Небольшая пауза для API
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Ошибка на статье ${article.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      analyzed: analyzedCount,
      total_attempted: articles.length
    });

  } catch (error) {
    console.error('Критическая ошибка:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
