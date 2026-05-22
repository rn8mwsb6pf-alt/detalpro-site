'use client';
// components/search/SearchClient.tsx
// Клиентский компонент поиска: вызывает /api/search, рендерит таблицы по ролям
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter }  from 'next/navigation';
import { useCart }    from '@/components/cart/CartContext';
import { useToast }   from '@/components/ui/Toast';
import type { SearchResponse, SearchResultItem } from '@/types';
import styles from './SearchClient.module.css';

interface Props { initialQuery: string; }

export function SearchClient({ initialQuery }: Props) {
  const { data: session } = useSession();
  const { add } = useCart();
  const toast   = useToast();
  const router  = useRouter();

  const [query,   setQuery]   = useState(initialQuery);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [sort,    setSort]    = useState('availability');

  const isManager = session?.user.role === 'manager' || session?.user.role === 'admin';

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/search?query=${encodeURIComponent(q.trim())}`);
      const data = await res.json() as SearchResponse;
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Ошибка поиска');
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сервера');
    } finally {
      setLoading(false);
    }
  }, []);

  // При монтировании — ищем, если есть initialQuery
  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, [initialQuery, doSearch]);

  function addToCart(item: SearchResultItem) {
    add({
      id:           item.id,
      article:      item.article,
      brand:        item.brand,
      name:         item.name,
      unit:         item.unit,
      source:       item.source,
      priceRetail:  item.priceRetail,
      deliveryDays: item.deliveryDays,
      qwepOfferSnapshot: item.qwepOfferSnapshot ?? null,
    });
    toast.show(`${item.brand} ${item.article} — добавлен в корзину`, 'green');
  }

  function sortItems(items: SearchResultItem[]) {
    const arr = [...items];
    if (sort === 'price_asc')    return arr.sort((a,b) => a.priceRetail - b.priceRetail);
    if (sort === 'price_desc')   return arr.sort((a,b) => b.priceRetail - a.priceRetail);
    if (sort === 'delivery_asc') return arr.sort((a,b) => a.deliveryDays - b.deliveryDays);
    // availability: наш склад → остаток 0 → партнёры
    return arr.sort((a,b) => {
      const score = (i: SearchResultItem) =>
        i.source === '1c' && i.availability === 'in_stock' ? 0
        : i.source === '1c' ? 1 : 2;
      return score(a) - score(b) || a.priceRetail - b.priceRetail;
    });
  }

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

  // ── Рендер строки таблицы ───────────────────────────────────────────────
  function renderRow(item: SearchResultItem) {
    const inStock = item.source === '1c' && item.availability === 'in_stock';

    let action: React.ReactNode;
    if (inStock) {
      action = (
        <button className="btn btn-primary btn-sm" onClick={() => addToCart(item)}>
          В корзину
        </button>
      );
    } else if (isManager) {
      action = (
        <button className="btn btn-outline btn-sm" onClick={() => addToCart(item)}>
          Добавить
        </button>
      );
    } else {
      const cta = item.cta;
      action = (
        <div className={styles.ctaBlock}>
          <span className={styles.ctaStatus}>Под заказ</span>
          <span className={styles.ctaHint}>{cta?.deliveryHint}</span>
          <a href={`tel:${cta?.phone}`} className="btn btn-call btn-sm">
            📞 Позвонить
          </a>
        </div>
      );
    }

    return (
      <tr key={`${item.id}-${item.source}`}>
        <td className={styles.tdArticle}>{item.article}</td>
        <td className={styles.tdBrand}>{item.brand}</td>
        <td className={styles.tdName}>{item.name}</td>

        {/* Менеджерские колонки */}
        {isManager && item.source === '1c' && (
          <td className={styles.tdInput}>{item.priceWholesale ? fmt(item.priceWholesale) : '—'}</td>
        )}
        {isManager && item.source === 'qwep' && (
          <>
            <td className={styles.tdSupplier}>{item.supplierInternal ?? '—'}</td>
            <td className={styles.tdInput}>{item.priceInput ? fmt(item.priceInput) : '—'}</td>
          </>
        )}

        <td className={styles.tdPrice}>{fmt(item.priceRetail)}</td>
        <td className={styles.tdQty}>
          {item.quantity > 0
            ? <span className={styles.qtyOk}>● {item.quantity} шт</span>
            : <span className={styles.qtyOrder}>Под заказ</span>
          }
        </td>
        <td className={styles.tdDelivery}>
          {item.deliveryDays === 0
            ? <span style={{ color: 'var(--green)' }}>Сегодня</span>
            : `${item.deliveryDays} дн.`
          }
        </td>
        <td>{action}</td>
      </tr>
    );
  }

  // ── Пустое состояние ───────────────────────────────────────────────────
  if (!results && !loading && !error) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🔍</div>
        <div className={styles.emptyTitle}>Введите артикул для поиска</div>
        <div className={styles.emptySub}>Введите номер детали в строку поиска выше</div>
      </div>
    );
  }

  const sorted = results ? sortItems(results.items) : [];
  const inStock = sorted.filter(i => i.source === '1c' && i.availability === 'in_stock');
  const onOrder = sorted.filter(i => !(i.source === '1c' && i.availability === 'in_stock'));

  return (
    <div className={styles.wrap}>
      {/* Топбар */}
      <div className={styles.topbar}>
        <div className={styles.queryInfo}>
          <span className={styles.queryArticle}>{query || '—'}</span>
          {results && (
            <span className={styles.queryCount}>
              Найдено {results.total} предложений
              {results.sources.qwepCount > 0 && ` (${results.sources.qwepCount} от поставщиков)`}
            </span>
          )}
        </div>
        <div className={styles.sortBox}>
          <span className={styles.sortLabel}>Сортировка:</span>
          <select
            className={styles.sortSelect}
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            <option value="availability">По наличию</option>
            <option value="price_asc">Цена ↑</option>
            <option value="price_desc">Цена ↓</option>
            <option value="delivery_asc">Срок доставки</option>
          </select>
        </div>
      </div>

      {/* Лоадер */}
      {loading && (
        <div className={styles.loader}>
          <span className={styles.dot}/><span className={styles.dot}/><span className={styles.dot}/>
          <span className={styles.loaderText}>Ищем в базе и у поставщиков QWEP...</span>
        </div>
      )}

      {/* Ошибка */}
      {error && <div className={styles.errorMsg}>{error}</div>}

      {/* Результаты */}
      {results && !loading && (
        <>
          {/* Наш склад */}
          {inStock.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupLabel}>
                <span className="badge badge-green">✓ В наличии на нашем складе</span>
                <div className={styles.groupLine} />
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Артикул</th><th>Бренд</th><th>Наименование</th>
                    {isManager && <th>Оптовая цена</th>}
                    <th>Цена</th><th>Кол-во</th><th>Доставка</th><th/>
                  </tr>
                </thead>
                <tbody>{inStock.map(renderRow)}</tbody>
              </table>
            </div>
          )}

          {/* Под заказ */}
          {onOrder.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupLabel}>
                <span className={`badge ${isManager ? 'badge-blue' : 'badge-amber'}`}>
                  {isManager ? '📊 Предложения поставщиков QWEP' : '⏱ Под заказ'}
                </span>
                <div className={styles.groupLine} />
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Артикул</th><th>Бренд</th><th>Наименование</th>
                    {isManager && <><th>Поставщик</th><th>Вход. цена</th></>}
                    <th>Цена</th><th>Кол-во</th><th>Срок</th><th/>
                  </tr>
                </thead>
                <tbody>{onOrder.map(renderRow)}</tbody>
              </table>
            </div>
          )}

          {sorted.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>😔</div>
              <div className={styles.emptyTitle}>Ничего не найдено</div>
              <div className={styles.emptySub}>Проверьте артикул или попробуйте другой запрос</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
