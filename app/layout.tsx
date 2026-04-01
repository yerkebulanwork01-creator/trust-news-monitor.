import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Мониторинг новостей | Samruk-Kazyna Trust',
  description: 'AI-мониторинг упоминаний фонда в СМИ Казахстана',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
