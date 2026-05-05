import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatError } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { Printer } from "lucide-react";

const STATUSES = ["all", "pending", "preparing", "served", "cancelled"];
const NEXT = { pending: "preparing", preparing: "served" };

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get(`/admin/orders?includeHistory=true${filter !== "all" ? `&status_filter=${filter}` : ""}`);
      setOrders(res.data);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [filter]);

  // WebSocket with socket.io
  useEffect(() => {
    let socket;
    try {
      const token = localStorage.getItem("qrt_token");
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
      
      socket = io(backendUrl, {
        auth: { token },
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        console.log("AdminOrders connected to WebSocket");
      });

      socket.on("order.created", () => {
        load();
      });

      socket.on("order.updated", () => {
        load();
      });

      socket.on("queue.snapshot", () => {
        load();
      });
    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
    }
    
    return () => {
      if (socket) socket.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  const advance = async (order) => {
    const next = NEXT[order.status];
    if (!next) return;
    try {
      const orderId = String(order._id || order.id);
      await api.patch(`/admin/orders/${orderId}/status`, { status: next });
      toast.success(`Marked ${next}`);
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const cancel = async (order) => {
    try {
      const orderId = String(order._id || order.id);
      await api.patch(`/admin/orders/${orderId}/status`, { status: "cancelled" });
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  return (
    <div className="p-8" data-testid="admin-orders">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Orders</h1>
          <p className="text-sm text-[#5c5656] mt-1">Live order queue, updated in real time.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {STATUSES.map((s) => (
          <button
            key={s}
            data-testid={`filter-${s}`}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
              filter === s
                ? "bg-[#2a2626] text-white"
                : "bg-white border border-[#eae6df] text-[#2a2626]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-[#5c5656]">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-[#eae6df] rounded-2xl p-12 text-center text-[#5c5656]">
          No orders {filter !== "all" ? `with status "${filter}"` : "yet"}.
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {orders.map((o) => {
              const orderId = String(o._id || o.id);
              const tableNum = o.tableId?.tableNumber || o.table_number || 'N/A';
              const total = o.totalAmount || o.total || 0;
              return (
                <motion.div
                  key={orderId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  data-testid={`order-card-${orderId}`}
                  className={`bg-white rounded-xl border border-[#eae6df] p-5 border-l-${o.status}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[#5c5656]">
                        Table {tableNum} · #{orderId.slice(0, 6)}
                      </div>
                      <div className="font-display text-lg font-semibold mt-1">
                        ₹{total.toFixed(2)}
                        {o.customer_name && (
                          <span className="text-sm text-[#5c5656] font-normal ml-2">
                            · {o.customer_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusPill status={o.status} />
                  </div>
                  <div className="mt-4 space-y-1 text-sm">
                    {(o.items || []).map((it, idx) => {
                      const qty = it.qty || it.quantity || 1;
                      return (
                        <div key={idx} className="flex justify-between text-[#5c5656]">
                          <span className="text-[#2a2626]">
                            {qty}× {it.name}
                          </span>
                          <span>₹{(it.price * qty).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-[#eae6df]">
                    <button
                      onClick={() => navigate(`/admin/bill/${orderId}`)}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                      title="Print Bill"
                    >
                      <Printer size={14} />
                      Print
                    </button>
                    {NEXT[o.status] && (
                      <button
                        data-testid={`advance-${orderId}`}
                        onClick={() => advance(o)}
                        className="flex-1 py-2 rounded-lg bg-[#2a2626] text-white text-sm font-medium hover:bg-[#c84b31]"
                      >
                        Mark {NEXT[o.status]}
                      </button>
                    )}
                    {!["served", "cancelled"].includes(o.status) && (
                      <button
                        data-testid={`cancel-${orderId}`}
                        onClick={() => cancel(o)}
                        className="px-3 py-2 rounded-lg border border-[#eae6df] text-sm text-[#5c5656] hover:border-[#c84b31] hover:text-[#c84b31]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: "bg-[#c84b31]/10 text-[#c84b31]",
    preparing: "bg-[#e6a15c]/15 text-[#a05a15]",
    ready: "bg-[#2d4221]/10 text-[#2d4221]",
    served: "bg-[#5c5656]/10 text-[#5c5656]",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${map[status] || ""}`}>
      {status}
    </span>
  );
}
