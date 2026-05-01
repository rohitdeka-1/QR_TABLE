import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config/api';
import { formatCurrency } from '../utils/format';
import { mergeOrderList } from '../utils/orders';

export default function KitchenPage() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [auth, setAuth] = useState(() => {
    const stored = sessionStorage.getItem('qr-restaurant-auth');
    return stored ? JSON.parse(stored) : null;
  });
  const [orders, setOrders] = useState([]);
  const [loginError, setLoginError] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  async function apiFetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;
    if (!response.ok) throw new Error(data?.message || 'Request failed');
    return data;
  }

  useEffect(() => {
    if (!auth?.user) return undefined;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', 'kitchen');
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('newOrder', (order) => setOrders((current) => mergeOrderList(current, order)));
    socket.on('orderUpdated', (order) => setOrders((current) => mergeOrderList(current, order)));
    socket.on('queueSnapshot', (snapshot) => setOrders(Array.isArray(snapshot) ? snapshot : []));

    return () => {
      socket.emit('leave', 'kitchen');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [auth?.user]);

  useEffect(() => {
    async function fetchOrders() {
      if (!auth?.user) return;
      try {
        const data = await apiFetch('/orders');
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        setLoginError(err.message || 'Failed to fetch orders');
      }
    }

    fetchOrders();
  }, [auth?.user]);

  async function login(event) {
    event.preventDefault();
    setLoginError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Login failed');
      sessionStorage.setItem('qr-restaurant-auth', JSON.stringify({ user: data.user }));
      setAuth({ user: data.user });
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    }
  }

  function logout() {
    sessionStorage.removeItem('qr-restaurant-auth');
    fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    setAuth(null);
    setOrders([]);
    setConnected(false);
    if (socketRef.current) socketRef.current.disconnect();
  }

  async function updateStatus(orderId, status) {
    try {
      const updated = await apiFetch(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setOrders((current) => mergeOrderList(current, updated));
    } catch (err) {
      setLoginError(err.message || 'Unable to update order');
    }
  }

  async function markPaid(orderId) {
    try {
      const updated = await apiFetch(`/orders/${orderId}/mark-paid`, { method: 'POST' });
      setOrders((current) => mergeOrderList(current, updated));
    } catch (err) {
      setLoginError(err.message || 'Unable to mark paid');
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 pb-14 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-[2rem] border border-amber-100 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-amber-500">Kitchen dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Live order queue</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`rounded-full px-3 py-1 ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {connected ? 'Socket connected' : 'Socket disconnected'}
            </span>
            <a href="/" className="rounded-full border border-slate-200 px-3 py-1 text-slate-700 transition hover:bg-slate-50">Customer view</a>
            {auth?.user ? <button type="button" onClick={logout} className="rounded-full border border-red-200 px-3 py-1 text-red-700 transition hover:bg-red-50">Logout</button> : null}
          </div>
        </div>
      </header>

      {!auth?.user ? (
        <section className="mx-auto max-w-xl rounded-[2rem] border border-amber-100 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-slate-900">Kitchen login</h2>
          <p className="mt-1 text-sm text-slate-600">Use an admin, staff, or cashier account.</p>
          <form onSubmit={login} className="mt-5 space-y-4">
            <label className="grid gap-2 text-sm text-slate-700">
              Email
              <input value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50" placeholder="admin@test.com" />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              Password
              <input type="password" value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50" placeholder="AdminPass123" />
            </label>
            {loginError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loginError}</p> : null}
            <button type="submit" className="w-full rounded-2xl bg-amber-500 px-4 py-3 font-semibold text-white transition hover:bg-amber-600">Log in</button>
          </form>
        </section>
      ) : (
        <section className="space-y-4">
          {orders.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-sm text-slate-500">No active orders in queue.</div> : null}
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
            <div className="grid gap-4 xl:grid-cols-2">
              {orders.map((order) => {
                const tableNumber = order?.tableId?.tableNumber || order?.tableId || 'Unknown';
                return (
                  <article key={order._id} className="rounded-[2rem] border border-amber-100 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Position #{order.queuePosition || '-'}</h3>
                        <p className="mt-1 text-sm text-slate-600">Ticket #{order.queueNumber} • Table {tableNumber}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-sm">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{order.status}</span>
                        <span className={`rounded-full px-3 py-1 ${order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{order.paymentStatus}</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      {order.items?.map((item, index) => (
                        <div key={`${order._id}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <span>{item.name}</span>
                          <span>x{item.qty} {formatCurrency(item.price)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => updateStatus(order._id, 'preparing')} className="rounded-full border border-sky-200 px-4 py-2 text-sm text-sky-700 transition hover:bg-sky-50">Preparing</button>
                      <button type="button" onClick={() => updateStatus(order._id, 'ready')} className="rounded-full border border-emerald-200 px-4 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50">Ready</button>
                      <button type="button" onClick={() => updateStatus(order._id, 'served')} className="rounded-full border border-violet-200 px-4 py-2 text-sm text-violet-700 transition hover:bg-violet-50">Served</button>
                      <button type="button" onClick={() => markPaid(order._id)} className="rounded-full border border-amber-200 px-4 py-2 text-sm text-amber-700 transition hover:bg-amber-50">Mark paid</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

