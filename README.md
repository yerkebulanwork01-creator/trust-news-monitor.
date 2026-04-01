# Trust News Monitor 📰

AI-powered news monitoring dashboard for Samruk-Kazyna Trust fund.

## Возможности

✅ Автоматический сбор новостей из 7 казахстанских источников  
✅ AI-анализ тональности через Claude API  
✅ Классификация по темам (гранты, мероприятия, технологии)  
✅ Извлечение ключевых слов и упоминаний проектов  
✅ Красивый дашборд с фильтрами и поиском  
✅ Real-time обновления через Supabase  
✅ Полностью бесплатный стек  

## Технологии

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API Routes (serverless)
- **Database:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude Haiku
- **Hosting:** Vercel
- **Cron:** Vercel Cron (автообновление)

## Установка

### 1. Клонировать проект

```bash
cd trust-news-monitor
npm install
```

### 2. Настроить .env.local

Откройте `.env.local` и замените:

```env
ANTHROPIC_API_KEY=sk-ant-ваш-ключ-здесь
```

### 3. Запустить локально

```bash
npm run dev
```

Откройте http://localhost:3000

### 4. Деплой на Vercel

```bash
npm install -g vercel
vercel login
vercel
```

Vercel автоматически:
- Задеплоит проект
- Даст вам URL (например trust-news-monitor.vercel.app)
- Настроит environment variables
- Запустит cron jobs (каждые 6 часов)

## API Endpoints

### GET /api/fetch-news
Собирает новости из RSS лент  
**Auth:** Bearer token (CRON_SECRET)

### GET /api/analyze-news  
Анализирует новости через Claude API  
**Auth:** Bearer token (CRON_SECRET)

### GET /api/stats
Возвращает статистику  
**Auth:** публичный

## Cron Schedule

- **Каждые 6 часов (00:00, 06:00, 12:00, 18:00):**  
  `/api/fetch-news` — сбор новых статей

- **Каждые 6 часов (00:30, 06:30, 12:30, 18:30):**  
  `/api/analyze-news` — AI-анализ

## Ручной запуск (для теста)

```bash
# Собрать новости
curl -H "Authorization: Bearer trust_news_secret_2026" \
  http://localhost:3000/api/fetch-news

# Проанализировать
curl -H "Authorization: Bearer trust_news_secret_2026" \
  http://localhost:3000/api/analyze-news
```

## Структура БД

### news_articles
- id, title, url, source
- published_at, content, image_url
- sentiment (positive/neutral/negative)
- main_topic, keywords
- people_mentioned, projects_mentioned
- summary_ru

### news_sources
- name, url, type (rss)
- enabled, last_fetch
- total_articles

## Стоимость

- **Supabase:** Бесплатно (500MB)
- **Vercel:** Бесплатно (100GB bandwidth)
- **Claude API:** ~$1-2/мес (Haiku модель)

**ИТОГО:** ~$1-2/мес

## Автор

Разработано для КФ «Samruk-Kazyna Trust»  
2026
