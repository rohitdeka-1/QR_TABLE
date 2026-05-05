import { useEffect, useState } from "react";
import { api, formatError } from "@/lib/api";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

export default function AdminAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get("/admin/analytics")
      .then((r) => setData(r.data))
      .catch((e) => toast.error(formatError(e)));
  }, []);

  if (!data) return <div className="p-8 text-sm text-[#5c5656]">Loading analytics...</div>;

  const stats = [
    { label: "Revenue", value: `₹${data.total_revenue.toFixed(2)}`, color: "#c84b31" },
    { label: "Orders", value: data.total_orders, color: "#2a2626" },
    { label: "Served", value: data.served_count, color: "#2d4221" },
    { label: "Avg ticket", value: `₹${data.avg_order.toFixed(2)}`, color: "#e6a15c" },
  ];

  return (
    <div className="p-8" data-testid="admin-analytics">
      <h1 className="font-display text-3xl font-semibold">Analytics</h1>
      <p className="text-sm text-[#5c5656] mt-1">Revenue, top items, and order trends.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {stats.map((s) => (
          <div
            key={s.label}
            data-testid={`stat-${s.label}`}
            className="bg-white rounded-xl border border-[#eae6df] p-5"
          >
            <div className="text-xs uppercase tracking-wider text-[#5c5656]">{s.label}</div>
            <div className="font-display text-3xl font-semibold mt-2" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-[#eae6df] p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Revenue trend</h3>
          {data.revenue_trend.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-[#5c5656]">
              No data yet. Place an order to see the trend.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.revenue_trend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c84b31" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#c84b31" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eae6df" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5c5656" }} />
                <YAxis tick={{ fontSize: 11, fill: "#5c5656" }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#c84b31"
                  fill="url(#rev)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#eae6df] p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Top items</h3>
          {data.top_items.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-[#5c5656]">
              No items sold yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.top_items} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid stroke="#eae6df" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#5c5656" }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11, fill: "#2a2626" }}
                />
                <Tooltip />
                <Bar dataKey="quantity" fill="#2d4221" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#eae6df] p-5 mt-4">
        <h3 className="font-display text-lg font-semibold mb-4">Status breakdown</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(data.status_counts).map(([status, count]) => (
            <div
              key={status}
              className="px-4 py-3 rounded-lg bg-[#f4f3ef] border border-[#eae6df]"
            >
              <div className="text-xs uppercase tracking-wider text-[#5c5656]">{status}</div>
              <div className="font-display text-xl font-semibold">{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
