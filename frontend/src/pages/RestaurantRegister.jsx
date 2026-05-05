import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { QrCode, ArrowRight, Eye, EyeOff, ArrowLeft, Mail, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { api, formatError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Steps ─────────────────────────────────────────────────────────────────
// 1: email  →  2: otp  →  3: details + password  →  4: success

const STEPS = ["Verify Email", "Enter OTP", "Create Account"];

export default function RestaurantRegister() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail]           = useState("");
  const [otp, setOtp]               = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [ownerName, setOwnerName]   = useState("");
  const [password, setPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [created, setCreated]       = useState(null);

  // ── Step 1: send OTP ─────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/send-otp", { email, purpose: "register" });
      toast.success("OTP sent! Check your inbox.");
      setStep(2);
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/verify-otp", { email, otp, purpose: "register" });
      toast.success("Email verified! Create your account.");
      setStep(3);
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: register ─────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (password.length < 8)         { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        restaurantName,
        ownerName,
        ownerEmail: email,
        password,
      });
      setCreated(res.data);
      toast.success("Restaurant created successfully!");
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

      <div className="relative z-10 max-w-5xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
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
              <div className="text-xs uppercase tracking-[0.25em] text-[#c84b31] font-semibold">Restaurant onboarding</div>
              <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight">Create your restaurant workspace</h1>
            </div>
          </div>

          <p className="mt-5 max-w-xl text-[#5c5656] text-base sm:text-lg leading-relaxed">
            Verify your email with a one-time code, then set your own password. No auto-generated codes to lose!
          </p>

          {/* Step indicators */}
          {!created && (
            <div className="mt-8 flex gap-3 max-w-sm">
              {STEPS.map((label, i) => {
                const num = i + 1;
                const done = step > num;
                const active = step === num;
                return (
                  <div key={label} className="flex-1 text-center">
                    <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center text-sm font-bold border-2 transition-all ${
                      done   ? "bg-[#2d4221] border-[#2d4221] text-white" :
                      active ? "bg-[#c84b31] border-[#c84b31] text-white" :
                               "bg-white border-[#eae6df] text-[#5c5656]"
                    }`}>
                      {done ? "✓" : num}
                    </div>
                    <div className={`text-xs mt-1 ${active ? "text-[#c84b31] font-medium" : "text-[#5c5656]"}`}>{label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Card */}
        <Card className="border-[#eae6df] shadow-xl shadow-[#2a2626]/5">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-2xl">
              {created ? "Workspace ready! 🎉" : STEPS[step - 1]}
            </CardTitle>
            <CardDescription>
              {!created && step === 1 && "Enter the email address for your admin account."}
              {!created && step === 2 && `We sent a 6-digit code to ${email}.`}
              {!created && step === 3 && "Fill in your restaurant details and set a password."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {created ? (
              /* Success */
              <div className="space-y-5">
                <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
                  <CheckCircle2 className="text-green-600 shrink-0" size={28} />
                  <div>
                    <div className="font-semibold text-green-800">{created.restaurant.name}</div>
                    <div className="text-sm text-green-700">Admin: {created.admin.email}</div>
                  </div>
                </div>
                <p className="text-sm text-[#5c5656]">
                  Your workspace is live. Log in using <strong>{created.admin.email}</strong> and the password you just set.
                </p>
                <Button
                  onClick={() => navigate("/admin/login")}
                  className="w-full h-11 rounded-xl bg-[#c84b31] hover:bg-[#2a2626] text-white"
                >
                  Go to admin login
                </Button>
              </div>
            ) : step === 1 ? (
              /* Step 1: email */
              <form onSubmit={handleSendOtp} className="space-y-4">
                <Field label="Owner email">
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5656]" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@restaurant.com"
                      required
                      className="h-11 rounded-xl border-[#eae6df] bg-white focus-visible:ring-[#c84b31] pl-9"
                    />
                  </div>
                </Field>
                <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-[#2a2626] hover:bg-[#c84b31] text-white">
                  {loading ? "Sending OTP..." : "Send verification code"}
                </Button>
                <p className="text-xs text-[#5c5656] text-center">
                  Already registered? <Link to="/admin/login" className="text-[#c84b31] font-medium">Sign in</Link>
                </p>
              </form>
            ) : step === 2 ? (
              /* Step 2: OTP */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Field label={`Enter the 6-digit code sent to ${email}`}>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5656]" />
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      required
                      className="h-11 rounded-xl border-[#eae6df] bg-white focus-visible:ring-[#c84b31] pl-9 text-center text-xl font-mono tracking-widest"
                    />
                  </div>
                </Field>
                <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-[#2a2626] hover:bg-[#c84b31] text-white">
                  {loading ? "Verifying..." : "Verify code"}
                </Button>
                <button type="button" onClick={() => setStep(1)} className="w-full flex items-center justify-center gap-1 text-xs text-[#5c5656] hover:text-[#c84b31]">
                  <ArrowLeft size={12} /> Change email / resend
                </button>
              </form>
            ) : (
              /* Step 3: details + password */
              <form onSubmit={handleRegister} className="space-y-4">
                <Field label="Restaurant name">
                  <Input value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} placeholder="QR Bistro" required className="h-11 rounded-xl border-[#eae6df] bg-white focus-visible:ring-[#c84b31]" />
                </Field>
                <Field label="Owner name">
                  <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Alyssa Khan" required className="h-11 rounded-xl border-[#eae6df] bg-white focus-visible:ring-[#c84b31]" />
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      className="h-11 rounded-xl border-[#eae6df] bg-white focus-visible:ring-[#c84b31] pr-11"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c5656] hover:text-[#2a2626]">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm password">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    className={`h-11 rounded-xl border-[#eae6df] bg-white focus-visible:ring-[#c84b31] ${confirmPassword && confirmPassword !== password ? "border-red-400" : ""}`}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </Field>
                <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-[#2a2626] hover:bg-[#c84b31] text-white">
                  {loading ? "Creating workspace..." : "Create restaurant"}
                </Button>
              </form>
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