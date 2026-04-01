import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchAllRSS, isRelevantByKeywords } from '@/lib/rss';

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
    // Получаем активные источники
    const { data: sources, error: sourcesError } = await supabase
      .from('news_sources')
      .select('*')
      .eq('enabled', true);

    if (sourcesError || !sources) {
      return NextResponse.json({ error: 'Ошибка получения источников' }, { status: 500 });
    }

    console.log(`Начинаем парсинг ${sources.length} источников...`);

    // Парсим все RSS
    const allArticles = await fetchAllRSS(sources);
    
    console.log(`Получено ${allArticles.length} статей`);

    // Фильтруем по ключевым словам
    const relevantArticles = allArticles.filter(article =>
      isRelevantByKeywords(`${article.title} ${article.contentSnippet}`)
    );

    console.log(`Релевантных: ${relevantArticles.length}`);

    let savedCount = 0;
    let skippedCount = 0;

    // Сохраняем в БД
    for (const article of relevantArticles) {
      try {
        const { error: insertError } = await supabase
          .from('news_articles')
          .insert({
            title: article.title,
            url: article.link,
            source: article.source,
            published_at: new Date(article.pubDate).toISOString(),
            content: article.contentSnippet || null,
            image_url: article.imageUrl || null,
            is_relevant: null, // AI определит позже
          })
          .select();

        if (insertError) {
          // Пропускаем дубликаты (unique constraint на url)
          if (insertError.code === '23505') {
            skippedCount++;
          } else {
            console.error('Ошибка вставки:', insertError);
          }
        } else {
          savedCount++;
        }
      } catch (e) {
        console.error('Ошибка сохранения статьи:', e);
      }
    }

    // Обновляем статистику источников
    for (const source of sources) {
      await supabase
        .from('news_sources')
        .update({ 
          last_fetch: new Date().toISOString(),
          total_articles: source.total_articles + savedCount,
        })
        .eq('id', source.id);
    }

    return NextResponse.json({
      success: true,
      total_fetched: allArticles.length,
      relevant: relevantArticles.length,
      saved: savedCount,
      skipped: skippedCount,
    });

  } catch (error) {
    console.error('Ошибка в fetch-news:', error);
    return NextResponse.json({ 
      error: 'Ошибка сбора новостей',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
