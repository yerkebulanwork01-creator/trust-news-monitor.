import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchAllRSS, isRelevantByKeywords } from '@/lib/rss';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Получаем секрет из URL: ?secret=...
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  
  // Временная упрощенная проверка для браузера
  if (secretParam !== cronSecret) {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      message: 'Пожалуйста, добавьте ?secret=ваш_ключ в конец адресной строки' 
    }, { status: 401 });
  }

  try {
    // 1. Получаем активные источники из Supabase
    const { data: sources, error: sourcesError } = await supabase
      .from('news_sources')
      .select('*')
      .eq('enabled', true);

    if (sourcesError || !sources) {
      return NextResponse.json({ error: 'Ошибка получения источников' }, { status: 500 });
    }

    console.log(`Начинаем парсинг ${sources.length} источников...`);

    // 2. Парсим все RSS ленты
    const allArticles = await fetchAllRSS(sources);
    console.log(`Всего получено ${allArticles.length} статей из RSS`);

    // 3. Фильтруем по ключевым словам (фонд, гранты и т.д.)
    const relevantArticles = allArticles.filter(article =>
      isRelevantByKeywords(`${article.title} ${article.contentSnippet}`)
    );

    console.log(`Найдено релевантных статей: ${relevantArticles.length}`);

    let savedCount = 0;
    let skippedCount = 0;

    // 4. Сохраняем в базу данных
    for (const article of relevantArticles) {
      try {
        const { error: insertError } = await supabase
          .from('news_articles')
          .insert({
            title: article.title,
            url: article.link,
            source: article.source,
            published_at: new Date(article.pubDate || new Date()).toISOString(),
            content: article.contentSnippet || null,
            image_url: article.imageUrl || null,
            is_relevant: true, // По умолчанию считаем релевантным, AI уточнит позже
          });

        if (insertError) {
          // Если статья уже есть (дубликат URL), Supabase вернет ошибку 23505
          if (insertError.code === '23505') {
            skippedCount++;
          } else {
            console.error('Ошибка вставки статьи:', insertError.message);
          }
        } else {
          savedCount++;
        }
      } catch (e) {
        console.error('Критическая ошибка сохранения:', e);
      }
    }

    return NextResponse.json({
      success: true,
      total_fetched: allArticles.length,
      relevant: relevantArticles.length,
      saved: savedCount,
      skipped_duplicates: skippedCount,
    });

  } catch (error) {
    console.error('Глобальная ошибка в fetch-news:', error);
    return NextResponse.json({ 
      error: 'Ошибка сбора новостей',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
