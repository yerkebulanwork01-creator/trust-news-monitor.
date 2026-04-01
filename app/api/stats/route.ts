import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const revalidate = 300; // Кэш на 5 минут

export async function GET() {
  try {
    const { data, error } = await supabase.rpc('get_news_stats');

    if (error) {
      console.error('Ошибка получения статистики:', error);
      return NextResponse.json({ error: 'Ошибка БД' }, { status: 500 });
    }

    const stats = data?.[0] || {
      total_today: 0,
      total_week: 0,
      positive_count: 0,
      neutral_count: 0,
      negative_count: 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Ошибка в stats:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
