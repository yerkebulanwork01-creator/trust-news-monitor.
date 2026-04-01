import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { analyzeArticle } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Получаем секрет из URL: ?secret=...
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  
  if (secretParam !== cronSecret) {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      message: 'Добавьте ?secret=ваш_ключ в адресную строку' 
    }, { status: 401 });
  }

  try {
    // Получаем необработанные статьи (у которых еще нет отметки времени обработки)
    const { data: articles, error: fetchError } = await supabase
      .from('news_articles')
      .select('*')
      .is('processed_at', null) 
      .order('published_at', { ascending: false })
      .limit(15); // Ограничим до 15 за раз, чтобы Claude не выдал ошибку лимита

    if (fetchError || !articles) {
      return NextResponse.json({ error: 'Ошибка получения статей' }, { status: 500 });
    }

    if (articles.length === 0) {
      return NextResponse.json({ success: true, message: 'Нет новых статей для анализа' });
    }

    console.log(`Начинаем AI-анализ ${articles.length} статей...`);

    let analyzedCount = 0;
    let relevantCount = 0;

    for (const article of articles) {
      try {
        // Отправляем заголовок и текст в Claude AI
        const analysis = await analyzeArticle(
          article.title,
          article.content || ''
        );

        if (analysis) {
          const { error: updateError } = await supabase
            .from('news_articles')
            .update({
              is_relevant: analysis.is_relevant,
              sentiment: analysis.sentiment,
              sentiment_score: analysis.sentiment_score,
              main_topic: analysis.main_topic,
              keywords: analysis.keywords,
              people_mentioned: analysis.people_mentioned,
              projects_mentioned: analysis.projects_mentioned,
              summary_ru: analysis.summary_ru,
              processed_at: new Date().toISOString(), // Помечаем как обработанную
            })
            .eq('id', article.id);

          if (!updateError) {
            analyzedCount++;
            if (analysis.is_relevant) relevantCount++;
          }
        }

        // Небольшая задержка между запросами к Claude
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`Ошибка анализа статьи ${article.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      analyzed: analyzedCount,
      relevant: relevantCount,
      total_in_batch: articles.length,
    });

  } catch (error) {
    console.error('Критическая ошибка в analyze-news:', error);
    return NextResponse.json({ 
      error: 'Ошибка анализа новостей',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
