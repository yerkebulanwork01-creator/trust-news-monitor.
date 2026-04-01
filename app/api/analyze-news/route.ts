import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { analyzeArticle } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Простая защита
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Получаем необработанные статьи (is_relevant = null)
    const { data: articles, error: fetchError } = await supabase
      .from('news_articles')
      .select('*')
      .is('is_relevant', null)
      .order('published_at', { ascending: false })
      .limit(20); // Обрабатываем по 20 за раз

    if (fetchError || !articles) {
      return NextResponse.json({ error: 'Ошибка получения статей' }, { status: 500 });
    }

    console.log(`Анализируем ${articles.length} статей...`);

    let analyzedCount = 0;
    let relevantCount = 0;

    for (const article of articles) {
      try {
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
              processed_at: new Date().toISOString(),
            })
            .eq('id', article.id);

          if (!updateError) {
            analyzedCount++;
            if (analysis.is_relevant) relevantCount++;
          }
        }

        // Небольшая задержка чтобы не превысить rate limit
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Ошибка анализа статьи ${article.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      analyzed: analyzedCount,
      relevant: relevantCount,
      total: articles.length,
    });

  } catch (error) {
    console.error('Ошибка в analyze-news:', error);
    return NextResponse.json({ 
      error: 'Ошибка анализа новостей',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
