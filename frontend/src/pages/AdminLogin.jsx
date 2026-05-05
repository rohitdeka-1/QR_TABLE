import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { formatError } from "@/lib/api";
import { toast } from "sonner";
import { QrCode } from "lucide-react";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@qrtable.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate("/admin/orders");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f3ef] flex items-center justify-center px-4" data-testid="admin-login-page">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-[#c84b31] flex items-center justify-center text-white">
            <QrCode size={18} />
          </div>
          <span className="font-display text-2xl font-semibold tracking-tight">QR</span>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-[#eae6df]">
          <h1 className="font-display text-2xl font-semibold">Sign in to dashboard</h1>
          <p className="text-sm text-[#5c5656] mt-1">Manage menu, tables, and live orders.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-[#5c5656]">Email</label>
              <input
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-4 py-2.5 rounded-xl border border-[#eae6df] bg-white focus:outline-none focus:border-[#c84b31]"
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-[#5c5656]">Password</label>
              <input
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-4 py-2.5 rounded-xl border border-[#eae6df] bg-white focus:outline-none focus:border-[#c84b31]"
                required
              />
            </div>
            <button
              data-testid="login-submit-btn"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#2a2626] text-white font-medium hover:bg-[#c84b31] transition-colors disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="text-xs text-[#5c5656] mt-5 text-center">
            Demo: <span className="font-mono">admin@qrtable.com / admin123</span>
          </p>
          <p className="text-xs text-[#5c5656] mt-2 text-center">
            New restaurant? <Link to="/register" className="font-medium text-[#c84b31]">Create workspace</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
