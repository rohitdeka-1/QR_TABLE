import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { formatCurrency } from '../utils/format';
import AdminCard from '../components/admin/AdminCard';
import AdminLoginForm from '../components/admin/AdminLoginForm';

function normalizeTableNumberInput(value) {
  const digitsOnly = String(value || '').replace(/\D/g, '');
  if (!digitsOnly) return '';
  return String(Number(digitsOnly));
}

export default function AdminPage() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [auth, setAuth] = useState(() => {
    const stored = sessionStorage.getItem('qr-restaurant-auth');
    return stored ? JSON.parse(stored) : null;
  });

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);

  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    available: true,
  });
  const [editingMenuId, setEditingMenuId] = useState(null);

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [tableForm, setTableForm] = useState({ tableNumber: '', location: '' });
  const [rangeForm, setRangeForm] = useState({ startNumber: '1', endNumber: '10', pruneOutside: false });

  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = auth?.user?.role === 'admin';

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

  async function downloadTableQr(tableId, tableNumber) {
    const response = await fetch(`${API_BASE_URL}/tables/${tableId}/qr/png`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'Failed to download QR code');
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `table-${tableNumber}-qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  async function refreshAdminData() {
    if (!auth?.user || !isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const [menuData, categoryData, tableData] = await Promise.all([
        apiFetch('/menu/admin/items'),
        apiFetch('/menu/categories'),
        apiFetch('/tables'),
      ]);
      setMenuItems(Array.isArray(menuData) ? menuData : []);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setTables(Array.isArray(tableData) ? tableData : []);
    } catch (err) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAdminData();
  }, [auth?.user, isAdmin]);

  const sortedTables = useMemo(
    () =>
      [...tables].sort((a, b) => {
        const aNum = Number(a.tableNumber);
        const bNum = Number(b.tableNumber);
        if (Number.isNaN(aNum) && Number.isNaN(bNum)) return String(a.tableNumber).localeCompare(String(b.tableNumber));
        if (Number.isNaN(aNum)) return 1;
        if (Number.isNaN(bNum)) return -1;
        return aNum - bNum;
      }),
    [tables],
  );

  async function login(event) {
    event.preventDefault();
    setError('');
    setStatusMessage('');

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
      setError(err.message || 'Login failed');
    }
  }

  function logout() {
    sessionStorage.removeItem('qr-restaurant-auth');
    fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    setAuth(null);
    setMenuItems([]);
    setCategories([]);
    setTables([]);
    setStatusMessage('');
    setError('');
  }

  async function saveMenuItem(event) {
    event.preventDefault();
    setError('');
    setStatusMessage('');

    const payload = {
      name: menuForm.name.trim(),
      description: menuForm.description.trim(),
      price: Number(menuForm.price),
      category: menuForm.category || undefined,
      available: Boolean(menuForm.available),
    };

    if (!payload.name || !Number.isFinite(payload.price) || payload.price <= 0) {
      setError('Menu item requires a name and a positive price.');
      return;
    }

    try {
      if (editingMenuId) {
        await apiFetch(`/menu/items/${editingMenuId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setStatusMessage('Menu item updated.');
      } else {
        await apiFetch('/menu/items', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatusMessage('Menu item created.');
      }
      setMenuForm({ name: '', description: '', price: '', category: '', available: true });
      setEditingMenuId(null);
      await refreshAdminData();
    } catch (err) {
      setError(err.message || 'Failed to save menu item');
    }
  }

  async function deleteMenuItem(menuItemId) {
    setError('');
    setStatusMessage('');
    try {
      await apiFetch(`/menu/items/${menuItemId}`, { method: 'DELETE' });
      setStatusMessage('Menu item deleted.');
      if (editingMenuId === menuItemId) {
        setEditingMenuId(null);
        setMenuForm({ name: '', description: '', price: '', category: '', available: true });
      }
      await refreshAdminData();
    } catch (err) {
      setError(err.message || 'Failed to delete menu item');
    }
  }

  function editMenuItem(item) {
    setEditingMenuId(item._id);
    setMenuForm({
      name: item.name || '',
      description: item.description || '',
      price: item.price ?? '',
      category: item.category?._id || '',
      available: Boolean(item.available),
    });
  }

  async function createCategory(event) {
    event.preventDefault();
    setError('');
    setStatusMessage('');

    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
    };

    if (!payload.name) {
      setError('Category name is required.');
      return;
    }

    try {
      await apiFetch('/menu/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setCategoryForm({ name: '', description: '' });
      setStatusMessage('Category created.');
      await refreshAdminData();
    } catch (err) {
      setError(err.message || 'Failed to create category');
    }
  }

  async function createSingleTable(event) {
    event.preventDefault();
    setError('');
    setStatusMessage('');

    const normalized = normalizeTableNumberInput(tableForm.tableNumber);
    if (!normalized) {
      setError('Table number must be numeric, like 1, 2, 3.');
      return;
    }

    try {
      await apiFetch('/tables', {
        method: 'POST',
        body: JSON.stringify({
          tableNumber: normalized,
          location: tableForm.location.trim(),
        }),
      });
      setTableForm({ tableNumber: '', location: '' });
      setStatusMessage(`Table ${normalized} created.`);
      await refreshAdminData();
    } catch (err) {
      setError(err.message || 'Failed to create table');
    }
  }

  async function syncRange(event) {
    event.preventDefault();
    setError('');
    setStatusMessage('');

    const startNumber = Number(normalizeTableNumberInput(rangeForm.startNumber));
    const endNumber = Number(normalizeTableNumberInput(rangeForm.endNumber));

    if (!Number.isInteger(startNumber) || !Number.isInteger(endNumber) || startNumber < 1 || endNumber < startNumber) {
      setError('Range must be valid like 1-10 or 11-20.');
      return;
    }

    try {
      const result = await apiFetch('/tables/sync-range', {
        method: 'POST',
        body: JSON.stringify({
          startNumber,
          endNumber,
          pruneOutside: rangeForm.pruneOutside,
        }),
      });

      setTables(Array.isArray(result.tables) ? result.tables : []);
      setStatusMessage(`Range synced ${startNumber}-${endNumber}. Created: ${result.createdCount}, Removed: ${result.prunedCount}.`);
    } catch (err) {
      setError(err.message || 'Failed to sync range');
    }
  }

  async function updateTable(table) {
    setError('');
    setStatusMessage('');

    const normalized = normalizeTableNumberInput(table.tableNumber);
    if (!normalized) {
      setError('Table numbers must be numeric only.');
      return;
    }

    try {
      await apiFetch(`/tables/${table._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tableNumber: normalized,
          location: table.location || '',
        }),
      });
      await downloadTableQr(table._id, normalized);
      setStatusMessage(`Table ${normalized} updated.`);
      await refreshAdminData();
    } catch (err) {
      setError(err.message || 'Failed to update table');
    }
  }

  async function deleteTable(tableId) {
    setError('');
    setStatusMessage('');
    try {
      await apiFetch(`/tables/${tableId}`, { method: 'DELETE' });
      setStatusMessage('Table removed.');
      await refreshAdminData();
    } catch (err) {
      setError(err.message || 'Failed to delete table');
    }
  }

  async function regenerateTableQr(tableId) {
    setError('');
    setStatusMessage('');
    try {
      await apiFetch(`/tables/${tableId}/regenerate-qr`, { method: 'PATCH' });
      setStatusMessage('QR regenerated for table.');
      await refreshAdminData();
    } catch (err) {
      setError(err.message || 'Failed to regenerate QR');
    }
  }

  if (!auth?.user) {
    return (
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 pb-14 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-[2rem] border border-amber-100 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-amber-500">Admin panel</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Restaurant control center</h1>
            </div>
            <Link to="/" className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-50">Customer</Link>
          </div>
        </header>
        <AdminLoginForm
          credentials={credentials}
          onChange={(field, value) => setCredentials((current) => ({ ...current, [field]: value }))}
          onSubmit={login}
          error={error}
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700">
          <h2 className="text-2xl font-semibold">Admin access required</h2>
          <p className="mt-2 text-sm">Your account role is not admin. Log in with an admin user.</p>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={logout} className="rounded-2xl border border-red-200 px-4 py-2 text-sm transition hover:bg-red-100">Logout</button>
            <Link to="/" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">Back</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 pb-14 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-[2rem] border border-amber-100 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-amber-500">Admin panel</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Menu and table management</h1>
            <p className="mt-2 text-sm text-slate-600">Configure menu items and table ranges like 1-10 or 11-20.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-50">Customer</Link>
            <Link to="/kitchen" className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-50">Kitchen</Link>
            <button type="button" onClick={logout} className="rounded-full border border-red-200 px-3 py-1 text-sm text-red-700 transition hover:bg-red-50">Logout</button>
          </div>
        </div>
      </header>

      {error ? <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {statusMessage ? <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{statusMessage}</p> : null}
      {loading ? <p className="mb-4 text-sm text-slate-500">Loading admin data...</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard title="Menu items" subtitle="Create, edit, enable or disable food items.">
          <form onSubmit={saveMenuItem} className="space-y-3">
            <input value={menuForm.name} onChange={(event) => setMenuForm((current) => ({ ...current, name: event.target.value }))} placeholder="Item name" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50" />
            <textarea value={menuForm.description} onChange={(event) => setMenuForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={3} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="number" min="1" step="0.01" value={menuForm.price} onChange={(event) => setMenuForm((current) => ({ ...current, price: event.target.value }))} placeholder="Price" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50" />
              <select value={menuForm.category} onChange={(event) => setMenuForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400/50">
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={menuForm.available} onChange={(event) => setMenuForm((current) => ({ ...current, available: event.target.checked }))} />
              Available
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600">
                {editingMenuId ? 'Update item' : 'Create item'}
              </button>
              {editingMenuId ? (
                <button type="button" onClick={() => { setEditingMenuId(null); setMenuForm({ name: '', description: '', price: '', category: '', available: true }); }} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-5 max-h-[34vh] space-y-2 overflow-y-auto pr-1">
            {menuItems.map((item) => (
              <div key={item._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-slate-500">{formatCurrency(item.price)} • {item.category?.name || 'No category'} • {item.available ? 'Available' : 'Hidden'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => editMenuItem(item)} className="rounded-xl border border-slate-200 px-3 py-1 text-slate-700 transition hover:bg-slate-100">Edit</button>
                    <button type="button" onClick={() => deleteMenuItem(item._id)} className="rounded-xl border border-red-200 px-3 py-1 text-red-700 transition hover:bg-red-50">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Categories" subtitle="Create categories used in menu items.">
          <form onSubmit={createCategory} className="space-y-3">
            <input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} placeholder="Category name" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50" />
            <textarea value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={3} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50" />
            <button type="submit" className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600">Create category</button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category._id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">{category.name}</span>
            ))}
          </div>
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-6">
        <AdminCard title="Table ranges" subtitle="Generate table numbers in ranges like 1-10 or 11-20 and optionally remove outside tables.">
          <form onSubmit={syncRange} className="grid gap-3 sm:grid-cols-4">
            <input type="number" min="1" value={rangeForm.startNumber} onChange={(event) => setRangeForm((current) => ({ ...current, startNumber: event.target.value }))} placeholder="Start" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50" />
            <input type="number" min="1" value={rangeForm.endNumber} onChange={(event) => setRangeForm((current) => ({ ...current, endNumber: event.target.value }))} placeholder="End" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50" />
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={rangeForm.pruneOutside} onChange={(event) => setRangeForm((current) => ({ ...current, pruneOutside: event.target.checked }))} />
              Remove outside range
            </label>
            <button type="submit" className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600">Sync range</button>
          </form>
        </AdminCard>

        <AdminCard title="Tables" subtitle="Keep table numbers numeric only: 1, 2, 3, 4...">
          <form onSubmit={createSingleTable} className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input value={tableForm.tableNumber} onChange={(event) => setTableForm((current) => ({ ...current, tableNumber: normalizeTableNumberInput(event.target.value) }))} placeholder="Table number (e.g. 21)" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50" />
            <input value={tableForm.location} onChange={(event) => setTableForm((current) => ({ ...current, location: event.target.value }))} placeholder="Location" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50" />
            <button type="submit" className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">Add table</button>
          </form>

          <div className="max-h-[44vh] space-y-2 overflow-y-auto pr-1">
            {sortedTables.map((table) => (
              <div key={table._id} className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[120px_1fr_auto] md:items-center">
                <input value={table.tableNumber} onChange={(event) => setTables((current) => current.map((entry) => entry._id === table._id ? { ...entry, tableNumber: normalizeTableNumberInput(event.target.value) } : entry))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400/50" />
                <input value={table.location || ''} onChange={(event) => setTables((current) => current.map((entry) => entry._id === table._id ? { ...entry, location: event.target.value } : entry))} placeholder="Location" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => updateTable(table)} className="rounded-xl border border-slate-200 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-100">Save & download QR</button>
                  <button type="button" onClick={() => regenerateTableQr(table._id)} className="rounded-xl border border-amber-200 px-3 py-1 text-sm text-amber-700 transition hover:bg-amber-50">Regenerate QR</button>
                  <button type="button" onClick={() => deleteTable(table._id)} className="rounded-xl border border-red-200 px-3 py-1 text-sm text-red-700 transition hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
            {sortedTables.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No tables found. Use range sync or add table.</p> : null}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

