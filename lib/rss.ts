import Parser from 'rss-parser';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; TrustNewsBot/1.0)',
  },
  timeout: 10000,
});

export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  content?: string;
  contentSnippet?: string;
  imageUrl?: string;
  source: string;
}

export async function fetchRSSFeed(url: string, sourceName: string): Promise<RSSItem[]> {
  try {
    const feed = await parser.parseURL(url);
    
    return feed.items.map(item => ({
      title: item.title || 'Без названия',
      link: item.link || '',
      pubDate: item.pubDate || new Date().toISOString(),
      content: item.content || item.contentSnippet || '',
      contentSnippet: item.contentSnippet || item.content?.substring(0, 500) || '',
      imageUrl: extractImageUrl(item),
      source: sourceName,
    }));
  } catch (error) {
    console.error(`Ошибка при парсинге ${sourceName}:`, error);
    return [];
  }
}

function extractImageUrl(item: any): string | undefined {
  // Попытка извлечь URL изображения из разных полей RSS
  if (item.enclosure?.url) return item.enclosure.url;
  if (item['media:content']?.$?.url) return item['media:content'].$.url;
  if (item['media:thumbnail']?.$?.url) return item['media:thumbnail'].$.url;
  
  // Поиск в content
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  
  return undefined;
}

export async function fetchAllRSS(sources: Array<{ name: string; url: string }>): Promise<RSSItem[]> {
  const promises = sources.map(source => 
    fetchRSSFeed(source.url, source.name)
  );
  
  const results = await Promise.allSettled(promises);
  
  return results
    .filter((result): result is PromiseFulfilledResult<RSSItem[]> => result.status === 'fulfilled')
    .flatMap(result => result.value);
}

// Ключевые слова для фильтрации
const KEYWORDS = [
  'самрук-казына trust',
  'samruk-kazyna trust',
  'кф самрук-казына',
  'фонд самрук',
  'адиева',
  'skai',
  'masa',
  'грант нко',
  'благотворительный фонд самрук',
];

export function isRelevantByKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}
