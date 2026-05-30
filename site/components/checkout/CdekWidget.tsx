'use client';
// components/checkout/CdekWidget.tsx
// Интеграция с официальным виджетом СДЭК (@cdek-it/widget)
// Виджет грузит карту с ПВЗ и возвращает выбранный пункт выдачи

import { useEffect, useRef, useState } from 'react';
import styles from './CdekWidget.module.css';

export interface CdekWidgetResult {
  pvzCode:  string;
  pvzName:  string;
  address:  string;
  city:     string;
  cost?:    number;
  days?:    number;
}

interface Props {
  fromCityCode?: number;   // код города отправления (44 = Москва)
  weight?:       number;   // вес посылки в граммах
  onSelect:      (pvz: CdekWidgetResult) => void;
}

declare global {
  interface Window {
    CDEKWidget?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function CdekWidget({ fromCityCode = 44, weight = 1000, onSelect }: Props) {
  const [loaded,   setLoaded]   = useState(false);
  const [selected, setSelected] = useState<CdekWidgetResult | null>(null);
  const [mapOpen,  setMapOpen]  = useState(false);
  const widgetRef = useRef<{ open: () => void } | null>(null);
  const rootId    = 'cdek-widget-root';

  // Подгружаем скрипт СДЭК виджета один раз
  useEffect(() => {
    if (document.getElementById('cdek-widget-script')) {
      setLoaded(true); return;
    }
    const script = document.createElement('script');
    script.id  = 'cdek-widget-script';
    script.src = 'https://cdn.jsdelivr.net/npm/@cdek-it/widget@3';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Инициализируем виджет после загрузки скрипта
  useEffect(() => {
    if (!loaded || !window.CDEKWidget) return;

    widgetRef.current = new window.CDEKWidget({
      // Параметры виджета СДЭК
      defaultLocation:  'Москва',
      from:             { city_code: fromCityCode },
      hideFilters:      { have_cashless: false, have_cash: false },

      // Параметры посылки для расчёта стоимости
      goods: [{ weight: weight / 1000, length: 20, width: 20, height: 10 }],

      // Корневой элемент для карты
      root: rootId,

      // Колбэк при выборе ПВЗ
      onReady() {
        console.log('[CDEK Widget] ready');
      },

      onChoose(deliveryType: string, tariff: Record<string, unknown>, pvz: Record<string, unknown>) {
        const result: CdekWidgetResult = {
          pvzCode: String(pvz.code),
          pvzName: String(pvz.name),
          address: String((pvz.location as Record<string,unknown>)?.address ?? ''),
          city:    String((pvz.location as Record<string,unknown>)?.city ?? ''),
          cost:    Number((tariff as Record<string,unknown>).delivery_sum ?? 0),
          days:    Number((tariff as Record<string,unknown>).period_max ?? 0),
        };
        setSelected(result);
        setMapOpen(false);
        onSelect(result);
      },

      onError(error: unknown) {
        console.error('[CDEK Widget] error:', error);
      },

      // Тема под наш тёмный дизайн
      theme: {
        '--primary-color':      '#e8411a',
        '--secondary-color':    '#ff6b45',
        '--background-color':   '#131618',
        '--text-color':         '#e8eaeb',
        '--border-color':       '#2a2f33',
      },
    });
  }, [loaded, fromCityCode, weight, onSelect]);

  function openMap() {
    if (widgetRef.current) {
      setMapOpen(true);
      widgetRef.current.open();
    }
  }

  return (
    <div className={styles.wrap}>
      {/* Выбранный ПВЗ */}
      {selected ? (
        <div className={styles.selected}>
          <div className={styles.selectedIcon}>📦</div>
          <div className={styles.selectedInfo}>
            <div className={styles.selectedName}>{selected.pvzName}</div>
            <div className={styles.selectedAddr}>{selected.address}</div>
            <div className={styles.selectedMeta}>
              {selected.cost && <span className={styles.metaCost}>{selected.cost.toLocaleString('ru-RU')} ₽</span>}
              {selected.days  && <span className={styles.metaDays}>· {selected.days} дн.</span>}
            </div>
          </div>
          <button className={`btn btn-outline btn-sm ${styles.changeBtn}`} onClick={openMap}>
            Изменить
          </button>
        </div>
      ) : (
        <button
          className={`btn btn-outline btn-md ${styles.openBtn}`}
          onClick={openMap}
          disabled={!loaded}
        >
          {loaded ? '🗺 Выбрать пункт выдачи на карте' : 'Загрузка карты...'}
        </button>
      )}

      {/* Контейнер карты СДЭК (скрывается после выбора) */}
      {mapOpen && (
        <div className={styles.mapOverlay} onClick={e => e.target === e.currentTarget && setMapOpen(false)}>
          <div className={styles.mapContainer}>
            <div className={styles.mapHeader}>
              <span className={styles.mapTitle}>Выберите пункт выдачи СДЭК</span>
              <button className={styles.mapClose} onClick={() => setMapOpen(false)}>✕</button>
            </div>
            <div id={rootId} className={styles.mapRoot} />
          </div>
        </div>
      )}

      {/* Запасной вариант: список ПВЗ из нашего API (если виджет не загрузился) */}
      {!loaded && <PvzFallback onSelect={r => { setSelected(r); onSelect(r); }} />}
    </div>
  );
}

// ── Запасной список ПВЗ (для SSR / блокировки скрипта) ─────────────────────
function PvzFallback({ onSelect }: { onSelect: (r: CdekWidgetResult) => void }) {
  const [pvzList, setPvzList] = useState<CdekWidgetResult[]>([]);
  const [city,    setCity]    = useState('Москва');
  const [loading, setLoading] = useState(false);

  async function loadPvz() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/cdek/pvz?city=${encodeURIComponent(city)}`);
      const data = await res.json() as Array<{ code: string; name: string; address: string; city: string }>;
      setPvzList(data.map(p => ({ pvzCode: p.code, pvzName: p.name, address: p.address, city: p.city })));
    } catch {}
    setLoading(false);
  }

  return (
    <div className={styles.fallback}>
      <div className={styles.fallbackSearch}>
        <input
          className="form-input" placeholder="Город..."
          value={city} onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadPvz()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary btn-sm" onClick={loadPvz} disabled={loading}>
          {loading ? '...' : 'Найти'}
        </button>
      </div>
      <div className={styles.pvzList}>
        {pvzList.map(p => (
          <div key={p.pvzCode} className={styles.pvzItem} onClick={() => onSelect(p)}>
            <div className={styles.pvzName}>{p.pvzName}</div>
            <div className={styles.pvzAddr}>{p.address}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
