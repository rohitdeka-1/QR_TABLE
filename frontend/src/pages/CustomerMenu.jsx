import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api, formatError } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { Plus, Minus, ShoppingBag, X, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomerMenu() {
  const { tableCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { items: cart, add, setQty, total, count, clear } = useCart();

  // Extract table details from query params (QR format from generated codes)
  const queryParams = new URLSearchParams(location.search);
  const tableNumberParam = queryParams.get('table') || queryParams.get('tableNumber');
  const tableIdParam = queryParams.get('tableId');
  const accessCodeParam = queryParams.get('accessCode');

  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [table, setTable] = useState(null);
  const [activeCat, setActiveCat] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [customerName, setCustomerName] = useState("");

  // Fetch table by number or code
  useEffect(() => {
    (async () => {
      try {
        // Prefer the access-code session from generated QR codes.
        if (accessCodeParam) {
          const session = await api.get(`/tables/session/${accessCodeParam}`);
          setTable(session.data);
        } else if (tableNumberParam) {
          // New format: /menu/qr?table=5
          try {
            const t = await api.get(`/tables/by-number/${tableNumberParam}`);
            setTable(t.data);
          } catch (e) {
            toast.error("Unable to fetch table information");
          }
        } else if (tableCode) {
          // Old format: /menu/:tableCode (backward compatibility)
          const t = await api.get(`/tables/by-code/${tableCode}`);
          setTable(t.data);
        }
      } catch (e) {
        toast.error("Table not found. Please scan again.");
      }
    })();
  }, [accessCodeParam, tableCode, tableNumberParam]);

  // Fetch categories for the restaurant
  useEffect(() => {
    (async () => {
      if (!table?.restaurantId) return;
      try {
        const c = await api.get(`/menu/categories?restaurantId=${table.restaurantId}`);
        setCategories(c.data);
        // Set first category as active
        if (c.data.length > 0) {
          setActiveCat(c.data[0].name);
        }
      } catch (e) {
        toast.error(formatError(e));
      }
    })();
  }, [table?.restaurantId]);

  // Fetch menu for the restaurant that the table belongs to
  useEffect(() => {
    (async () => {
      if (!table?.restaurantId) return;
      try {
        const m = await api.get(`/menu?restaurantId=${table.restaurantId}`);
        setMenu(m.data);
      } catch (e) {
        toast.error(formatError(e));
      }
    })();
  }, [table?.restaurantId]);

  const grouped = useMemo(() => {
    const g = {};
    for (const cat of categories) {
      g[cat.name] = [];
    }
    for (const it of menu) {
      const categoryName = it.category?.name;
      if (categoryName && g[categoryName]) {
        g[categoryName].push(it);
      }
    }
    return g;
  }, [menu, categories]);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    const tableId = table?.tableId || table?._id || table?.id || tableIdParam;
    const token = table?.token || table?.qrToken;
    if (!tableId || !token) {
      toast.error("Table session is invalid. Please scan the QR code again.");
      return;
    }

    setPlacing(true);
    try {
      const subtotal = total;
      const taxAmount = subtotal * 0.05; // 5% GST
      const totalWithTax = subtotal + taxAmount;

      const orderPayload = {
        tableId,
        token,
        customerName,
        items: cart.map((c) => ({ itemId: c.id, qty: c.quantity })),
        subtotal,
        taxAmount,
        totalAmount: totalWithTax,
      };

      const res = await api.post("/orders", orderPayload);
      clear();
      setCartOpen(false);
      toast.success("Order placed!");
      navigate(`/order/${res.data._id || res.data.id}`);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen pb-32 bg-[#f9f8f6]" data-testid="customer-menu">
      {/* Hero */}
      <div className="relative h-56 sm:h-64 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1770816307454-892c27fc625e?w=1200&q=80"
          alt="Restaurant"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a2626]/85 via-[#2a2626]/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <div className="text-[11px] uppercase tracking-[0.2em] opacity-80">
            {table ? `Table ${table.tableNumber}` : "Loading..."}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1">
            's menu
          </h1>
        </div>
      </div>

      {/* Category nav */}
      <div className="sticky top-0 z-20 bg-[#f9f8f6]/90 backdrop-blur-md border-b border-[#eae6df]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((c) => (
            <button
              key={c._id}
              data-testid={`cat-tab-${c._id}`}
              onClick={() => {
                setActiveCat(c.name);
                document.getElementById(`cat-${c._id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCat === c.name
                  ? "bg-[#2a2626] text-white"
                  : "bg-white text-[#2a2626] border border-[#eae6df]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-10">
        {categories.map((cat) => (
          <section key={cat._id} id={`cat-${cat._id}`}>
            <h2 className="font-display text-2xl font-semibold mb-4">{cat.name}</h2>
            <div className="space-y-3">
              {grouped[cat.name]?.length ? (
                grouped[cat.name].map((it) => {
                  const itemId = it._id || it.id;
                  const imageUrl = it.image || it.image_url;
                  const inCart = cart.find((c) => c.id === itemId);
                  return (
                    <button
                      key={itemId}
                      data-testid={`menu-item-${itemId}`}
                      onClick={() => {
                        if (!inCart) {
                          add({ id: itemId, name: it.name, price: it.price, image_url: imageUrl });
                        }
                      }}
                      className="w-full bg-white rounded-2xl border border-[#eae6df] overflow-hidden flex hover:border-[#c84b31] hover:shadow-lg transition-all active:scale-95"
                    >
                      <div className="flex-1 p-4 text-left">
                        <h3 className="font-display text-lg font-semibold">{it.name}</h3>
                        <p className="text-sm text-[#5c5656] mt-1 line-clamp-2">{it.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="font-display text-lg font-semibold text-[#c84b31]">
                            ₹{it.price.toFixed(2)}
                          </div>
                          {inCart ? (
                            <div 
                              className="flex items-center gap-2 bg-[#f4f3ef] rounded-full p-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                data-testid={`menu-item-${itemId}-decrement`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQty(itemId, inCart.quantity - 1);
                                }}
                                className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:bg-[#eae6df] transition-colors"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-sm font-semibold w-5 text-center">{inCart.quantity}</span>
                              <button
                                data-testid={`menu-item-${itemId}-increment`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQty(itemId, inCart.quantity + 1);
                                }}
                                className="w-7 h-7 rounded-full bg-[#2a2626] text-white flex items-center justify-center hover:bg-[#c84b31] transition-colors"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="px-4 py-1.5 rounded-full bg-[#2a2626] text-white text-sm font-medium">
                              Add
                            </div>
                          )}
                        </div>
                      </div>
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt={it.name}
                          className="w-28 sm:w-36 object-cover"
                        />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-sm text-[#5c5656]">No items in this category yet.</div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky cart bar */}
      <AnimatePresence>
        {count > 0 && !cartOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 z-30"
          >
            <div className="max-w-2xl mx-auto p-4">
              <button
                data-testid="open-cart-btn"
                onClick={() => setCartOpen(true)}
                className="w-full glass-bar rounded-full px-5 py-4 flex items-center justify-between shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#c84b31] text-white flex items-center justify-center">
                    <ShoppingBag size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-[#5c5656]">{count} items</div>
                    <div className="font-semibold">₹{(total + total * 0.05).toFixed(2)}</div>
                  </div>
                </div>
                <span className="font-medium text-sm">View cart →</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart sheet */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 flex items-end justify-center"
            onClick={() => setCartOpen(false)}
          >
            <motion.div
              initial={{ y: 400 }}
              animate={{ y: 0 }}
              exit={{ y: 400 }}
              transition={{ type: "spring", damping: 30 }}
              className="bg-white w-full max-w-2xl rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              data-testid="cart-sheet"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-2xl font-semibold">Your order</h3>
                <button
                  data-testid="close-cart-btn"
                  onClick={() => setCartOpen(false)}
                  className="w-9 h-9 rounded-full bg-[#f4f3ef] flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                {cart.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-[#5c5656]">₹{c.price.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2 bg-[#f4f3ef] rounded-full p-1">
                      <button
                        onClick={() => setQty(c.id, c.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-white flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-semibold w-5 text-center">{c.quantity}</span>
                      <button
                        onClick={() => setQty(c.id, c.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-[#2a2626] text-white flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <label className="text-xs uppercase tracking-wider text-[#5c5656]">Your name (optional)</label>
                <input
                  data-testid="customer-name-input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-[#eae6df] bg-white focus:outline-none focus:border-[#c84b31]"
                  placeholder="John"
                />
              </div>
              <div className="mt-5 pt-5 border-t border-[#eae6df]">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5c5656]">Subtotal</span>
                    <span className="font-medium">₹{total.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5c5656]">GST (5%)</span>
                    <span className="font-medium">₹{(total * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#eae6df]">
                    <span className="font-semibold">Total</span>
                    <span className="font-display text-xl font-semibold text-[#c84b31]">₹{(total + total * 0.05).toFixed(2)}</span>
                  </div>
                </div>
                <button
                  data-testid="place-order-btn"
                  disabled={placing}
                  onClick={placeOrder}
                  className="w-full px-6 py-3 rounded-full bg-[#c84b31] text-white font-medium hover:bg-[#a83b27] disabled:opacity-50"
                >
                  {placing ? "Placing..." : "Place order"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
