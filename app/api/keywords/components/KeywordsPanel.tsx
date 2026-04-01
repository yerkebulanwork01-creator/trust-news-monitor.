'use client';
import { useState, useEffect } from 'react';

interface Keyword {
  id: number;
  word: string;
}

export default function KeywordsPanel() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newWord, setNewWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchKeywords();
  }, []);

  async function fetchKeywords() {
    const res = await fetch('/api/keywords');
    const data = await res.json();
    setKeywords(data.keywords || []);
  }

  async function addKeyword() {
    if (!newWord.trim()) return;
    setLoading(true);
    const res = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: newWord }),
    });
    if (res.ok) {
      setNewWord('');
      setMessage('✅ Добавлено!');
      fetchKeywords();
    } else {
      const err = await res.json();
      setMessage(`❌ ${err.error}`);
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  }

  async function deleteKeyword(id: number) {
    await fetch('/api/keywords', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchKeywords();
  }

  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '16px' }}>🔍</span>
        <span style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
          Ключевые слова мониторинга
        </span>
        <span style={{
          background: '#e2e8f0',
          borderRadius: '20px',
          padding: '2px 8px',
          fontSize: '12px',
          color: '#64748b',
        }}>
          {keywords.length} слов
        </span>
      </div>

      {/* Список слов */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        {keywords.map((kw) => (
          <div key={kw.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#dbeafe',
            border: '1px solid #bfdbfe',
            borderRadius: '20px',
            padding: '4px 10px',
            fontSize: '13px',
            color: '#1d4ed8',
          }}>
            <span>{kw.word}</span>
            <button
              onClick={() => deleteKeyword(kw.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#93c5fd',
                fontSize: '14px',
                lineHeight: 1,
                padding: '0',
              }}
              title="Удалить"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Добавить слово */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
          placeholder="Добавить слово..."
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '13px',
            outline: 'none',
            flex: 1,
            maxWidth: '260px',
          }}
        />
        <button
          onClick={addKeyword}
          disabled={loading || !newWord.trim()}
          style={{
            background: loading ? '#93c5fd' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '500',
          }}
        >
          {loading ? '...' : '+ Добавить'}
        </button>
        {message && (
          <span style={{ fontSize: '13px', color: message.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
