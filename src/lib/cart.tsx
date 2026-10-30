import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type CartItem = {
  bookId: string;
  title: string;
  author: string;
  price: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "quantity">) => void;
  remove: (bookId: string) => void;
  setQuantity: (bookId: string, quantity: number) => void;
  clear: () => void;
  has: (bookId: string) => boolean;
};

const STORAGE_KEY = "bookmarket.cart.v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore malformed cart */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((current) => {
      const existing = current.find((line) => line.bookId === item.bookId);
      if (existing) {
        return current.map((line) =>
          line.bookId === item.bookId ? { ...line, quantity: Math.min(line.quantity + 1, 20) } : line,
        );
      }
      return [...current, { ...item, quantity: 1 }];
    });
  }, []);

  const remove = useCallback((bookId: string) => {
    setItems((current) => current.filter((line) => line.bookId !== bookId));
  }, []);

  const setQuantity = useCallback((bookId: string, quantity: number) => {
    setItems((current) =>
      current.map((line) =>
        line.bookId === bookId ? { ...line, quantity: Math.min(Math.max(quantity, 1), 20) } : line,
      ),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, line) => sum + line.quantity, 0),
      total: items.reduce((sum, line) => sum + line.price * line.quantity, 0),
      add,
      remove,
      setQuantity,
      clear,
      has: (bookId: string) => items.some((line) => line.bookId === bookId),
    }),
    [items, add, remove, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
