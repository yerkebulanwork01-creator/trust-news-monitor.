import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Типы для базы данных
export interface NewsArticle {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string;
  content: string | null;
  image_url: string | null;
  is_relevant: boolean | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentiment_score: number | null;
  main_topic: string | null;
  keywords: string[] | null;
  people_mentioned: string[] | null;
  projects_mentioned: string[] | null;
  summary_ru: string | null;
  summary_kk: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface NewsSource {
  id: number;
  name: string;
  url: string;
  type: string;
  enabled: boolean;
  last_fetch: string | null;
  total_articles: number;
  created_at: string;
}
