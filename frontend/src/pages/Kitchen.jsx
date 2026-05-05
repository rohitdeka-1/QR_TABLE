import { useEffect, useMemo, useState } from "react";
import { api, formatError } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChefHat } from "lucide-react";
import { io } from "socket.io-client";

const COLUMNS = [
  { key: "pending", label: "Incoming", color: "#c84b31" },
  { key: "preparing", label: "Preparing", color: "#e6a15c" },
];

const NEXT = { pending: "preparing", preparing: "served" };

function elapsed(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [, setTick] = useState(0);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await api.get("/admin/orders");
      setOrders(res.data.filter((o) => ["pending", "preparing"].includes(o.status)));
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let socket;
    try {
      const token = localStorage.getItem("qrt_token");
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
      
      console.log("Connecting to WebSocket at:", backendUrl);
      
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
        console.log("Kitchen connected to WebSocket, socket ID:", socket.id);
        // Load initial orders
        load();
      });

      socket.on("disconnect", (reason) => {
        console.log("Kitchen disconnected from WebSocket:", reason);
      });

      socket.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error);
      });

      socket.on("order.created", (data) => {
        console.log("New order received via WebSocket", data);
        load();
      });

      socket.on("order.updated", (data) => {
        console.log("Order updated via WebSocket", data);
        load();
      });

      socket.on("queue.snapshot", (data) => {
        console.log("Queue snapshot received via WebSocket", data);
        load();
      });
    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
    }
    
    return () => {
      if (socket) {
        console.log("Cleaning up WebSocket connection");
        socket.disconnect();
      }
    };
  }, []);

  const grouped = useMemo(() => {
    const g = { pending: [], preparing: [], ready: [] };
    for (const o of orders) {
      if (g[o.status]) g[o.status].push(o);
    }
    return g;
  }, [orders]);

  const advance = async (o) => {
    try {
      const orderId = String(o._id || o.id);
      await api.patch(`/admin/orders/${orderId}/status`, { status: NEXT[o.status] });
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  return (
    <div className="kds-root font-mono-display p-6" data-testid="kitchen-view">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/orders")}
            className="text-zinc-400 hover:text-white"
            data-testid="kitchen-back-btn"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <ChefHat size={18} className="text-[#e6a15c]" />
            <h1 className="text-xl font-semibold tracking-tight">KITCHEN DISPLAY</h1>
          </div>
        </div>
        <div className="text-xs text-zinc-400 uppercase tracking-widest">
          {orders.length} active · live
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map((col) => (
          <div key={col.key}>
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: col.color }}
              >
                {col.label}
              </h2>
              <span className="text-xs text-zinc-500">{grouped[col.key].length}</span>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {grouped[col.key].map((o) => {
                  const orderId = String(o._id || o.id);
                  const tableNum = o.tableId?.tableNumber || o.table_number || 'N/A';
                  return (
                    <motion.div
                      key={orderId}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      data-testid={`kds-order-${orderId}`}
                      className={`kds-card rounded-lg p-4 border-l-${col.key}`}
                      style={{ borderLeftColor: col.color, borderLeftWidth: 4 }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                            Table {tableNum}
                          </div>
                          <div className="text-lg font-semibold">#{orderId.slice(0, 6)}</div>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: col.color }}>
                          {elapsed(o.createdAt || o.created_at)}
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-sm border-t border-zinc-800 pt-3">
                        {(o.items || []).map((it, i) => (
                          <div key={i} className="flex items-baseline gap-2">
                            <span className="text-[#e6a15c] font-bold">{it.qty || it.quantity}×</span>
                            <span className="text-zinc-100">{it.name}</span>
                          </div>
                        ))}
                      </div>
                      {NEXT[o.status] && (
                        <button
                          data-testid={`kds-advance-${orderId}`}
                          onClick={() => advance(o)}
                          className="w-full mt-4 py-2 rounded font-bold text-sm uppercase tracking-widest hover:opacity-80"
                          style={{ backgroundColor: col.color, color: "#131313" }}
                        >
                          → {NEXT[o.status]}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {grouped[col.key].length === 0 && (
                <div className="text-zinc-600 text-xs uppercase tracking-widest text-center py-8">
                  Empty
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
