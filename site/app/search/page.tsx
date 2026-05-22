// app/search/page.tsx — Страница поиска
// Server Component: генерирует <title> и <meta> под конкретный артикул — SEO-дружественно
import type { Metadata } from 'next';
import { SearchClient }  from '@/components/search/SearchClient';
import { Header } from '@/components/Header';

interface Props {
  searchParams: { query?: string };
}

// Динамический <title> для каждого поискового запроса
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = searchParams.query?.trim();
  if (!query) {
    return { title: 'Поиск автозапчастей по артикулу' };
  }
  return {
    title: `Запчасть ${query} — цена, наличие, доставка`,
    description:
      `Купить ${query} с доставкой по России. ` +
      `Наличие на складе и у поставщиков. Оптовые цены. СДЭК.`,
    openGraph: {
      title: `${query} — автозапчасть`,
      description: `Лучшая цена на ${query}. Доставка СДЭК.`,
    },
  };
}

export default function SearchPage({ searchParams }: Props) {
  const query = searchParams.query?.trim() ?? '';

  return (
    <>
      <Header />
      <div style={{ minHeight: 'calc(100vh - 60px)' }}>
        <SearchClient initialQuery={query} />
      </div>
    </>
  );
}
