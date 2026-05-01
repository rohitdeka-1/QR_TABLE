export default function AdminLoginForm({ credentials, onChange, onSubmit, error }) {
  return (
    <section className="mx-auto max-w-xl rounded-[2rem] border border-amber-100 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
      <h2 className="text-xl font-semibold text-slate-900">Admin login</h2>
      <p className="mt-1 text-sm text-slate-600">Use an admin account to manage menu and tables.</p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <label className="grid gap-2 text-sm text-slate-700">
          Email
          <input
            value={credentials.email}
            onChange={(event) => onChange('email', event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50"
            placeholder="admin@test.com"
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Password
          <input
            type="password"
            value={credentials.password}
            onChange={(event) => onChange('password', event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400/50"
            placeholder="AdminPass123"
          />
        </label>
        {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <button type="submit" className="w-full rounded-2xl bg-amber-500 px-4 py-3 font-semibold text-white transition hover:bg-amber-600">
          Log in
        </button>
      </form>
    </section>
  );
}
