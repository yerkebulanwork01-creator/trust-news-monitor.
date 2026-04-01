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

// 1. Функция парсинга одного фида
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

// 2. Функция извлечения картинок
function extractImageUrl(item: any): string | undefined {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item['media:content']?.$?.url) return item['media:content'].$.url;
  if (item['media:thumbnail']?.$?.url) return item['media:thumbnail'].$.url;
  
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  return undefined;
}

// 3. ГЛАВНАЯ ФУНКЦИЯ (которой не хватало в экспорте)
export async function fetchAllRSS(sources: Array<{ name: string; url: string }>): Promise<RSSItem[]> {
  const promises = sources.map(source => 
    fetchRSSFeed(source.url, source.name)
  );
  
  const results = await Promise.allSettled(promises);
  
  return results
    .filter((result): result is PromiseFulfilledResult<RSSItem[]> => result.status === 'fulfilled')
    .flatMap(result => result.value);
}

// 4. Ключевые слова (расширенные для теста)
const KEYWORDS = [
  'самрук-казына', 
  'самрук-қазына', 
  'samruk-kazyna',
  'sk-trust',
  'skt',
  'адиева', 
  'skai', 
  'masa',
  'грант нко',
  'благотворительность',
  'социальные проекты',
  'фонд развития',
  'казахстан', // Временно добавил для теста наполнения
  'астана'     // Временно добавил для теста наполнения
];

export function isRelevantByKeywords(text: string): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}
