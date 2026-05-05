import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { QrCode, ArrowRight, Copy, Check } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { formatError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RestaurantRegister() {
  const { registerRestaurant } = useAuth();
  const navigate = useNavigate();
  const [restaurantName, setRestaurantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCopied(false);
    try {
      const result = await registerRestaurant({ restaurantName, ownerName, ownerEmail });
      setCreated(result);
      toast.success("Restaurant created successfully");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = async () => {
    if (!created?.admin?.password) return;
    await navigator.clipboard.writeText(created.admin.password);
    setCopied(true);
    toast.success("Password copied");
  };

  return (
    <div className="min-h-screen bg-[#f9f8f6] relative overflow-hidden px-4 py-8">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(200,75,49,0.15), transparent 40%), radial-gradient(circle at 80% 80%, rgba(45,66,33,0.15), transparent 40%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
        <div className="text-[#2a2626]">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#5c5656] hover:text-[#c84b31] transition-colors">
            <ArrowRight size={16} className="rotate-180" /> Back to home
          </Link>
          <div className="mt-8 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#c84b31] flex items-center justify-center text-white shadow-lg shadow-[#c84b31]/20">
              <QrCode size={18} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-[#c84b31] font-semibold">Restaurant onboarding</div>
              <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight">Create your restaurant workspace</h1>
            </div>
          </div>

          <p className="mt-5 max-w-xl text-[#5c5656] text-base sm:text-lg leading-relaxed">
            Register your restaurant once and we’ll create the first admin account with a generated password.
            That admin can then log in and manage tables, menus, and kitchen staff.
          </p>

          <div className="mt-8 grid sm:grid-cols-3 gap-4 max-w-2xl">
            <InfoCard title="Step 1" text="Create the restaurant tenant" />
            <InfoCard title="Step 2" text="Receive a generated admin password" />
            <InfoCard title="Step 3" text="Log in to manage the dashboard" />
          </div>
        </div>

        <Card className="border-[#eae6df] shadow-xl shadow-[#2a2626]/5">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-2xl">Start your restaurant</CardTitle>
            <CardDescription>We’ll create your tenant and first admin user.</CardDescription>
          </CardHeader>
          <CardContent>
            {!created ? (
              <form onSubmit={submit} className="space-y-4">
                <Field label="Restaurant name">
                  <Input
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="QR Bistro"
                    required
                    className="h-11 rounded-xl border-[#eae6df] bg-white focus-visible:ring-[#c84b31]"
                  />
                </Field>
                <Field label="Owner name">
                  <Input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Alyssa Khan"
                    required
                    className="h-11 rounded-xl border-[#eae6df] bg-white focus-visible:ring-[#c84b31]"
                  />
                </Field>
                <Field label="Owner email">
                  <Input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@restaurant.com"
                    required
                    className="h-11 rounded-xl border-[#eae6df] bg-white focus-visible:ring-[#c84b31]"
                  />
                </Field>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-[#2a2626] hover:bg-[#c84b31] text-white"
                >
                  {loading ? "Creating workspace..." : "Create restaurant"}
                </Button>

                <p className="text-xs text-[#5c5656] text-center">
                  Already registered? <Link to="/admin/login" className="text-[#c84b31] font-medium">Sign in</Link>
                </p>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#eae6df] bg-[#f9f8f6] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#5c5656]">Restaurant</div>
                  <div className="mt-1 font-semibold text-lg">{created.restaurant.name}</div>
                  <div className="text-sm text-[#5c5656]">Slug: {created.restaurant.slug}</div>
                </div>

                <div className="rounded-2xl border border-[#eae6df] bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#5c5656]">Generated admin password</div>
                  <div className="mt-2 flex items-center gap-3">
                    <code className="flex-1 rounded-xl bg-[#f9f8f6] px-3 py-2 text-sm font-mono break-all">
                      {created.admin.password}
                    </code>
                    <Button type="button" variant="outline" onClick={copyPassword} className="rounded-xl">
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </Button>
                  </div>
                  <p className="mt-3 text-sm text-[#5c5656]">
                    Save this password now. The backend returns it once so the owner can log in.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => navigate("/admin/login")}
                  className="w-full h-11 rounded-xl bg-[#c84b31] hover:bg-[#2a2626] text-white"
                >
                  Go to admin login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-[0.18em] text-[#5c5656]">{label}</Label>
      {children}
    </div>
  );
}

function InfoCard({ title, text }) {
  return (
    <div className="rounded-2xl border border-[#eae6df] bg-white/75 backdrop-blur p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[#c84b31] font-semibold">{title}</div>
      <div className="mt-2 text-sm text-[#2a2626] leading-relaxed">{text}</div>
    </div>
  );
}