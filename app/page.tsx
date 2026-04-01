'use client';

import { useEffect, useState } from 'react';
import { supabase, NewsArticle } from '@/lib/supabase';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Dashboard() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');

  useEffect(() => {
    fetchData();
    
    // Подписка на новые статьи в реальном времени
    const channel = supabase
      .channel('news_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'news_articles',
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // Получаем статистику
    const statsRes = await fetch('/api/stats');
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      setStats(statsData);
    }

    // Получаем статьи
    let query = supabase
      .from('news_articles')
      .select('*')
      .eq('is_relevant', true)
      .order('published_at', { ascending: false })
      .limit(50);

    const { data, error } = await query;

    if (data) {
      setArticles(data);
    }
    
    setLoading(false);
  }

  const filteredArticles = articles.filter(article => {
    // Поиск
    if (searchQuery && !article.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Фильтр по тональности
    if (selectedFilter !== 'all' && article.sentiment !== selectedFilter) {
      return false;
    }

    // Фильтр по дате
    if (selectedDate !== 'all') {
      const articleDate = new Date(article.published_at);
      const now = new Date();
      
      switch(selectedDate) {
        case 'today':
          if (articleDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          if (articleDate.toDateString() !== yesterday.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (articleDate < weekAgo) return false;
          break;
      }
    }

    return true;
  });

  // Топ-3 новости
  const topNews = articles
    .filter(a => a.sentiment === 'positive')
    .slice(0, 3);

  // Подсчёт тегов
  const tagCounts: Record<string, number> = {};
  articles.forEach(article => {
    if (article.keywords) {
      article.keywords.forEach(keyword => {
        tagCounts[keyword] = (tagCounts[keyword] || 0) + 1;
      });
    }
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Подсчёт по источникам
  const sourceCounts: Record<string, number> = {};
  articles.forEach(article => {
    sourceCounts[article.source] = (sourceCounts[article.source] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-medium text-gray-900">Мониторинг новостей</h1>
          <p className="text-sm text-gray-600 mt-1">
            КФ «Samruk-Kazyna Trust» — обновлено {format(new Date(), 'd MMMM yyyy, HH:mm', { locale: ru })}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Сегодня</div>
            <div className="text-3xl font-medium">{stats?.total_today || 0}</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Позитивные</div>
            <div className="text-3xl font-medium text-green-600">{stats?.positive_count || 0}</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Нейтральные</div>
            <div className="text-3xl font-medium">{stats?.neutral_count || 0}</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">За неделю</div>
            <div className="text-3xl font-medium">{stats?.total_week || 0}</div>
          </div>
        </div>

        {/* Top News */}
        {topNews.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4 text-blue-700 font-medium">
              <span>⭐</span>
              <span>Топ-3 важных новости</span>
            </div>
            <div className="space-y-3">
              {topNews.map(article => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white rounded-lg p-3 border-l-4 border-blue-500 hover:translate-x-1 transition-transform"
                >
                  <div className="font-medium text-sm mb-1">{article.title}</div>
                  <div className="text-xs text-gray-600">
                    {article.source} • {format(new Date(article.published_at), 'd MMM, HH:mm', { locale: ru })}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* News Feed */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <input
                type="text"
                placeholder="🔍 Поиск по ключевым словам..."
                className="flex-1 px-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="px-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              >
                <option value="all">За всё время</option>
                <option value="today">Сегодня</option>
                <option value="yesterday">Вчера</option>
                <option value="week">За неделю</option>
              </select>
            </div>

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h2 className="font-medium">Все новости</h2>
              <div className="flex gap-2">
                {['all', 'positive', 'neutral'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                      selectedFilter === filter
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-transparent text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {filter === 'all' ? 'Все' : filter === 'positive' ? 'Позитивные' : 'Нейтральные'}
                  </button>
                ))}
              </div>
            </div>

            {/* News List */}
            <div className="space-y-4">
              {filteredArticles.map(article => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 pb-4 border-b border-gray-100 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                >
                  {article.image_url ? (
                    <img
                      src={article.image_url}
                      alt=""
                      className="w-28 h-20 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                    />
                  ) : (
                    <div className="w-28 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex-shrink-0 flex items-center justify-center text-blue-600 font-medium text-xs">
                      {article.source.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">
                      {format(new Date(article.published_at), 'd MMM, HH:mm', { locale: ru })}
                    </div>
                    <div className="text-sm font-medium mb-2 line-clamp-2">{article.title}</div>
                    <div className="flex gap-2 flex-wrap">
                      {article.sentiment && (
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          article.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                          article.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {article.sentiment === 'positive' ? 'Позитивные' : article.sentiment === 'negative' ? 'Негативные' : 'Нейтральные'}
                        </span>
                      )}
                      {article.main_topic && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          {article.main_topic}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}

              {filteredArticles.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Новости не найдены
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tags Cloud */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-medium mb-3">Популярные темы</h3>
              <div className="flex flex-wrap gap-2">
                {topTags.map(([tag, count]) => (
                  <span
                    key={tag}
                    className={`px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                      count > 5 ? 'text-sm font-medium' : count > 3 ? 'text-sm' : 'text-xs'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Sources */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-medium mb-3">Источники</h3>
              <div className="space-y-3">
                {Object.entries(sourceCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between pb-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-medium">{source}</span>
                      <span className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
