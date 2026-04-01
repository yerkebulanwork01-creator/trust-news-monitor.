// Упрощенный запрос: берем 15 последних статей, которые еще не обработаны
    const { data: articles, error: fetchError } = await supabase
      .from('news_articles')
      .select('*')
      // Пробуем найти те, где нет темы или времени обработки
      .or('processed_at.is.null,main_topic.is.null') 
      .order('published_at', { ascending: false })
      .limit(15);

    if (fetchError || !articles) {
      console.error('Ошибка Supabase:', fetchError);
      return NextResponse.json({ error: 'Ошибка получения статей' }, { status: 500 });
    }

    if (articles.length === 0) {
      // Если по фильтру выше ничего не нашли, берем просто последние 15
      const { data: fallbackArticles } = await supabase
        .from('news_articles')
        .select('*')
        .limit(15);
      
      if (!fallbackArticles || fallbackArticles.length === 0) {
        return NextResponse.json({ success: true, message: 'В базе вообще нет новостей' });
      }
      // Работаем с тем, что есть
      articles.push(...fallbackArticles);
    }
