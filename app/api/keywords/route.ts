import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Получить все ключевые слова
export async function GET() {
  const { data, error } = await supabase
    .from('keywords')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keywords: data });
}

// Добавить ключевое слово
export async function POST(request: NextRequest) {
  const { word } = await request.json();
  if (!word || word.trim().length < 2) {
    return NextResponse.json({ error: 'Слово слишком короткое' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('keywords')
    .insert({ word: word.trim().toLowerCase() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Слово уже существует' }, { status: 400 });
  return NextResponse.json({ keyword: data });
}

// Удалить ключевое слово
export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  const { error } = await supabase.from('keywords').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
