import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { formatCurrency } from '../utils/format';

export default function CustomerMenuPage({ session, onResetSession }) {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadMenu() {
      setLoadingMenu(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE_URL}/menu`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || 'Failed to load menu');
        setMenu(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message || 'Failed to load menu');
      } finally {
        setLoadingMenu(false);
      }
    }

    loadMenu();
    return () => controller.abort();
  }, []);

  const cartSummary = useMemo(() => {
    const itemCount = cart.reduce((count, item) => count + item.qty, 0);
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    return { itemCount, total };
  }, [cart]);

  function addToCart(menuItem) {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item._id === menuItem._id);
      if (existing) {
        return currentCart.map((item) =>
          item._id === menuItem._id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...currentCart, { ...menuItem, qty: 1 }];
    });
  }

  function updateQty(itemId, qty) {
    setCart((currentCart) =>
      currentCart
        .map((item) => (item._id === itemId ? { ...item, qty } : item))
        .filter((item) => item.qty > 0),
    );
  }

  async function placeOrder(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!session.tableId || !session.token) {
      setError('The QR session is missing. Scan the table QR again.');
      return;
    }

    if (!cart.length) {
      setError('Add at least one menu item before placing an order.');
      return;
    }

    setLoadingOrder(true);
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: session.tableId,
          token: session.token,
          items: cart.map((item) => ({
            itemId: item._id,
            name: item.name,
            price: item.price,
            qty: item.qty,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Order submission failed');
      setCart([]);
      const queueText = data.queuePosition
        ? `Position #${data.queuePosition} (ticket #${data.queueNumber})`
        : `Ticket #${data.queueNumber}`;
      setMessage(`Order sent to kitchen. ${queueText}.`);
    } catch (err) {
      setError(err.message || 'Order submission failed');
    } finally {
      setLoadingOrder(false);
    }
  }

  const tableLabel = session.tableNumber ? `Table ${session.tableNumber}` : session.tableId ? `Table ${session.tableId.slice(0, 8)}...` : 'Unknown table';
  
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 pb-14 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-[2rem] border border-amber-100 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-amber-500">QR Restaurant</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Menu for {tableLabel}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onResetSession} className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-200 transition hover:bg-white/5">
              Scan again
            </button>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-amber-100 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900">Menu</h2>
            <button type="button" onClick={() => setCart([])} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
              Clear cart
            </button>
          </div>

          {loadingMenu ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">Loading menu...</div>
          ) : (
            <div className="mt-6 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {menu.map((item) => (
                  <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{item.description || 'Freshly prepared item'}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">{formatCurrency(item.price)}</span>
                    </div>
                    <button type="button" onClick={() => addToCart(item)} className="mt-4 w-full rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600">
                      Add to order
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-[2rem] border border-amber-100 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:sticky lg:top-6 lg:max-h-[calc(100vh-4rem)] lg:overflow-hidden">
          <h2 className="text-xl font-semibold text-slate-900">Your order</h2>

          <div className="mt-5 space-y-3 lg:max-h-[42vh] lg:overflow-y-auto lg:pr-1">
            {cart.length ? cart.map((item) => (
              <div key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-slate-900">{item.name}</h3>
                    <p className="text-sm text-slate-500">{formatCurrency(item.price)} each</p>
                  </div>
                  <div className="text-right text-sm text-slate-600">{formatCurrency(item.price * item.qty)}</div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => updateQty(item._id, item.qty - 1)} className="h-9 w-9 rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50">-</button>
                  <span className="min-w-10 text-center text-sm text-slate-900">{item.qty}</span>
                  <button type="button" onClick={() => updateQty(item._id, item.qty + 1)} className="h-9 w-9 rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50">+</button>
                </div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">Cart is empty. Add menu items.</div>}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm text-slate-600"><span>Items</span><span>{cartSummary.itemCount}</span></div>
            <div className="mt-2 flex items-center justify-between text-lg font-semibold text-slate-900"><span>Total</span><span>{formatCurrency(cartSummary.total)}</span></div>
          </div>

          {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {message ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

          <form onSubmit={placeOrder} className="mt-5">
            <button type="submit" disabled={loadingOrder || !cart.length} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">
              {loadingOrder ? 'Sending to kitchen...' : 'Place order'}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
