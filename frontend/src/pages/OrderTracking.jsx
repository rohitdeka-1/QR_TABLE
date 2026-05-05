import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, formatError } from "@/lib/api";
import { Check, Clock, ChefHat } from "lucide-react";
import { io } from "socket.io-client";
import { toast } from "sonner";

const STATUS_FLOW = ["pending", "preparing", "served"];
const STATUS_META = {
  pending: { label: "Order received", icon: Clock, color: "#c84b31" },
  preparing: { label: "Preparing", icon: ChefHat, color: "#e6a15c" },
  served: { label: "Served", icon: Check, color: "#2d4221" },
};

export default function OrderTracking() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  // The table token is stored in sessionStorage when the customer places the order
  // and also available as a URL param for deep links
  const token = searchParams.get("token") || sessionStorage.getItem(`order_token_${orderId}`) || "";
  const [order, setOrder] = useState(null);

  const load = async () => {
    try {
      const res = await api.get(`/orders/${orderId}`, { params: { token } });
      setOrder(res.data);
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  useEffect(() => {
    load();

    // Connect to WebSocket to listen for order updates instead of polling
    let socket;
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
      
      socket = io(backendUrl, {
        withCredentials: true,
        reconnection: true,
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        // Join this specific order's room — pass token to authenticate ownership
        socket.emit("join", `order:${orderId}`, token);
      });

      // Listen for backend events
      socket.on("order.status-changed", (data) => {
        if (String(data.orderId) === String(orderId)) load();
      });

      socket.on("order.updated", (data) => {
        if (String(data.orderId) === String(orderId)) load();
      });

    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
    }
    
    return () => {
      if (socket) socket.disconnect();
    };
    // eslint-disable-next-line
  }, [orderId]);

  if (!order)
    return (
      <div className="min-h-screen flex items-center justify-center text-[#5c5656]">Loading...</div>
    );

  const currentIdx = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="min-h-screen bg-[#f9f8f6] py-10 px-4" data-testid="order-tracking">
      <div className="max-w-xl mx-auto">
        <div className="text-xs uppercase tracking-[0.2em] text-[#c84b31] font-semibold">
          Order #{order.id.slice(-5)}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-2">
          {STATUS_META[order.status]?.label || order.status}
        </h1>
        <p className="text-[#5c5656] mt-1">
          Table {order.table_number} · {order.items.length} items · ${order.total.toFixed(2)}
        </p>

        {/* Timeline */}
        <div className="mt-10 space-y-4">
          {STATUS_FLOW.map((s, i) => {
            const meta = STATUS_META[s];
            const Icon = meta.icon;
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div
                key={s}
                data-testid={`status-step-${s}`}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${
                  active
                    ? "bg-white border-[#c84b31] shadow-sm"
                    : done
                    ? "bg-white border-[#eae6df]"
                    : "bg-transparent border-[#eae6df]/60"
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: done ? meta.color : "transparent",
                    color: done ? "#fff" : "#5c5656",
                    border: done ? "none" : "1px solid #eae6df",
                  }}
                >
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${done ? "text-[#2a2626]" : "text-[#5c5656]"}`}>
                    {meta.label}
                  </div>
                </div>
                {active && (
                  <span className="text-xs px-2 py-1 rounded-full bg-[#c84b31]/10 text-[#c84b31]">
                    now
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Items */}
        <div className="mt-8 bg-white rounded-2xl border border-[#eae6df] p-5">
          <h3 className="font-display text-lg font-semibold mb-3">Your items</h3>
          <div className="space-y-2 text-sm">
            {order.items.map((it, idx) => (
              <div key={idx} className="flex justify-between">
                <span>
                  {it.quantity}× {it.name}
                </span>
                <span className="text-[#5c5656]">${(it.price * it.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#eae6df] mt-4 pt-4 flex justify-between">
            <span className="font-medium">Total</span>
            <span className="font-display font-semibold">${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
