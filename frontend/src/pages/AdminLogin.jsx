import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { formatError } from "@/lib/api";
import { toast } from "sonner";
import { QrCode, ArrowRight, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen bg-[#f9f8f6] relative overflow-hidden px-4 py-12 flex flex-col items-center justify-center">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(200,75,49,0.15), transparent 40%), radial-gradient(circle at 80% 80%, rgba(45,66,33,0.15), transparent 40%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center w-full">
        {/* Left */}
        <div className="text-[#2a2626]">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#5c5656] hover:text-[#c84b31] transition-colors">
            <ArrowRight size={16} className="rotate-180" /> Back to home
          </Link>
          <div className="mt-8 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#c84b31] flex items-center justify-center text-white shadow-lg shadow-[#c84b31]/20">
              <QrCode size={18} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-[#c84b31] font-semibold">Management Portal</div>
              <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight">Admin Dashboard</h1>
            </div>
          </div>

          <p className="mt-5 max-w-xl text-[#5c5656] text-base sm:text-lg leading-relaxed">
            Manage your menu, track live orders, and optimize your kitchen workflow from a single powerful interface.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 max-w-sm">
            <div className="p-4 bg-white/50 rounded-2xl border border-[#eae6df]">
              <div className="text-2xl font-semibold text-[#c84b31]">Live</div>
              <div className="text-xs text-[#5c5656] uppercase tracking-wider">Order Tracking</div>
            </div>
            <div className="p-4 bg-white/50 rounded-2xl border border-[#eae6df]">
              <div className="text-2xl font-semibold text-[#c84b31]">KDS</div>
              <div className="text-xs text-[#5c5656] uppercase tracking-wider">Kitchen Display</div>
            </div>
          </div>
        </div>

        {/* Right: Card */}
        <Card className="border-[#eae6df] shadow-xl shadow-[#2a2626]/5">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-2xl">Sign in</CardTitle>
            <CardDescription>
              Enter your admin credentials to access your dashboard.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.18em] text-[#5c5656]">Email</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5656]" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@restaurant.com"
                    required
                    className="h-11 rounded-xl border-[#eae6df] bg-white focus-visible:ring-[#c84b31] pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.18em] text-[#5c5656]">Password</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5656]" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-11 rounded-xl border-[#eae6df] bg-white focus-visible:ring-[#c84b31] pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#2a2626] hover:bg-[#c84b31] text-white"
              >
                {loading ? "Signing in..." : "Sign in to dashboard"}
              </Button>

              <p className="text-xs text-[#5c5656] mt-4 text-center">
                New restaurant? <Link to="/register" className="text-[#c84b31] font-medium hover:underline">Create workspace</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
