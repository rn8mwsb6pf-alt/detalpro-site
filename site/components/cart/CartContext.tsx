'use client';
// components/cart/CartContext.tsx — Контекст корзины (localStorage + синк с бэкендом)
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { CartItem, ProductSource } from '@/types';

// ── State & Actions ──────────────────────────────────────────────────────────

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD';    item: CartItem }
  | { type: 'REMOVE'; id: string }
  | { type: 'SET_QTY'; id: string; qty: number }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE'; items: CartItem[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      return { items: action.items };
    case 'ADD': {
      const existing = state.items.find(i => i.id === action.item.id);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.id === action.item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, action.item] };
    }
    case 'REMOVE':
      return { items: state.items.filter(i => i.id !== action.id) };
    case 'SET_QTY':
      if (action.qty < 1) return { items: state.items.filter(i => i.id !== action.id) };
      return { items: state.items.map(i => i.id === action.id ? { ...i, quantity: action.qty } : i) };
    case 'CLEAR':
      return { items: [] };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface CartContextValue {
  items:      CartItem[];
  totalQty:   number;
  subtotal:   number;
  add:        (item: Omit<CartItem, 'quantity'>) => void;
  remove:     (id: string) => void;
  setQty:     (id: string, qty: number) => void;
  clear:      () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // Гидрация из localStorage при монтировании
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart');
      if (raw) dispatch({ type: 'HYDRATE', items: JSON.parse(raw) });
    } catch {}
  }, []);

  // Сохраняем в localStorage при каждом изменении
  useEffect(() => {
    try { localStorage.setItem('cart', JSON.stringify(state.items)); } catch {}
  }, [state.items]);

  const add = useCallback((item: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD', item: { ...item, quantity: 1 } });
  }, []);

  const remove  = useCallback((id: string) => dispatch({ type: 'REMOVE', id }), []);
  const setQty  = useCallback((id: string, qty: number) => dispatch({ type: 'SET_QTY', id, qty }), []);
  const clear   = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const totalQty = state.items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = state.items.reduce((s, i) => s + i.priceRetail * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items: state.items, totalQty, subtotal, add, remove, setQty, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
