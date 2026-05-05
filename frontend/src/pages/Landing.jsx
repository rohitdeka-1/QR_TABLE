import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { ArrowRight, QrCode, Utensils, ChefHat } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if we have QR params from a scanned code
    const params = new URLSearchParams(location.search);
    const accessCode = params.get("accessCode");
    const tableId = params.get("tableId");
    const tableNumber = params.get("tableNumber");

    // If we have access code and table info, redirect to menu
    if (accessCode && tableId) {
      const menuParams = new URLSearchParams({ accessCode, tableId });
      if (tableNumber) menuParams.set("tableNumber", tableNumber);
      const menuUrl = `/menu/qr?${menuParams.toString()}`;
      navigate(menuUrl, { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f9f8f6]">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(200,75,49,0.15), transparent 40%), radial-gradient(circle at 80% 80%, rgba(45,66,33,0.15), transparent 40%)",
        }}
      />

      <header className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#c84b31] flex items-center justify-center text-white">
            <QrCode size={18} />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">QR</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/register"
            data-testid="header-register-link"
            className="text-sm font-medium text-[#2a2626] hover:text-[#c84b31] transition-colors"
          >
            Create restaurant
          </Link>
          <Link
            to="/admin/login"
            data-testid="header-admin-login-link"
            className="text-sm font-medium text-[#2a2626] hover:text-[#c84b31] transition-colors"
          >
            Admin sign in →
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs uppercase tracking-[0.2em] text-[#c84b31] font-semibold mb-5">
              QR-First Restaurant OS
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] text-[#2a2626]">
              Diners scan.
              <br />
              <span className="italic font-normal text-[#c84b31]">The kitchen flows.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-[#5c5656] max-w-lg leading-relaxed">
              QR turns any restaurant into a self-serve experience. Customers order from their
              table, the kitchen sees it instantly, and you watch revenue climb in real time.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/register"
                data-testid="hero-register-cta"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2a2626] text-white text-sm font-medium hover:bg-[#c84b31] transition-colors"
              >
                Create restaurant <ArrowRight size={16} />
              </Link>
              <Link
                to="/admin/login"
                data-testid="hero-admin-cta"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#2a2626]/15 text-sm font-medium hover:border-[#2a2626] transition-colors"
              >
                Admin login
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              <Stat label="Avg. ticket lift" value="+18%" />
              <Stat label="Order time" value="−2.1m" />
              <Stat label="Live updates" value="∞" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-[#e6a15c]/20 via-transparent to-[#2d4221]/10 blur-3xl" />
            <div className="relative bg-white rounded-3xl border border-[#eae6df] p-6 shadow-sm">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1770816307454-892c27fc625e?w=900&q=80"
                  alt="Restaurant"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="glass-bar rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-[#5c5656]">
                        Table 7 · Live order
                      </div>
                      <div className="font-display text-lg font-semibold">Pappardelle Bolognese</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-[#e6a15c]/20 text-[#a05a15] font-medium">
                      preparing
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-24 grid md:grid-cols-3 gap-6">
          <Feature
            icon={<QrCode size={20} />}
            title="One QR per table"
            text="Generate unique table codes and download print-ready QR codes from the dashboard."
          />
          <Feature
            icon={<Utensils size={20} />}
            title="Mobile menu"
            text="Beautiful menu pages, categorized, with cart and order tracking — all on the diner's phone."
          />
          <Feature
            icon={<ChefHat size={20} />}
            title="Live kitchen display"
            text="A dedicated dark-themed KDS shows incoming orders the moment they're placed."
          />
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#eae6df]/60 py-6 text-center text-xs text-[#5c5656]">
        Demo admin: <span className="font-mono">admin@qrtable.com</span> /{" "}
        <span className="font-mono">admin123</span>
      </footer>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="font-display text-2xl font-semibold text-[#2a2626]">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-[#5c5656] mt-1">{label}</div>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#eae6df] hover:-translate-y-1 transition-transform">
      <div className="w-10 h-10 rounded-lg bg-[#c84b31]/10 text-[#c84b31] flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold mt-4">{title}</h3>
      <p className="text-sm text-[#5c5656] mt-2 leading-relaxed">{text}</p>
    </div>
  );
}
