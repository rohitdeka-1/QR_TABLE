import { useEffect, useState } from "react";
import { api, formatError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Settings, Save, MapPin, Phone, KeyRound, Eye, EyeOff, Mail } from "lucide-react";

export default function AdminSettings() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    gstin: "",
    latitude: "",
    longitude: "",
  });

  // Change password state
  const [pwStep, setPwStep] = useState(0); // 0=idle 1=otp-sent 2=otp-verified
  const [pwLoading, setPwLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/admin/restaurant");
        setRestaurant(res.data);
        setForm({
          name: res.data.name || "",
          address: res.data.address || "",
          phone: res.data.phone || "",
          gstin: res.data.gstin || "",
          latitude: res.data.location?.latitude || "",
          longitude: res.data.location?.longitude || "",
        });
      } catch (e) {
        toast.error(formatError(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/admin/restaurant", {
        address: form.address,
        phone: form.phone,
        gstin: form.gstin,
        latitude: parseFloat(form.latitude) || 0,
        longitude: parseFloat(form.longitude) || 0,
      });
      toast.success("Restaurant info updated!");
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
        toast.success("Location updated from GPS");
      }, (error) => {
        toast.error(`GPS Error: ${error.message}`);
      });
    } else {
      toast.error("Geolocation not supported");
    }
  };

  // ── Change password helpers ───────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!user?.email) return;
    setPwLoading(true);
    try {
      await api.post("/auth/send-otp", { email: user.email, purpose: "change-password" });
      toast.success(`OTP sent to ${user.email}`);
      setPwStep(1);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setPwLoading(false);
    }
  };

  const [otpValue, setOtpValue] = useState("");
  const handleVerifyOtp = async () => {
    if (!otpValue) { toast.error("Enter the OTP"); return; }
    setPwLoading(true);
    try {
      await api.post("/auth/verify-otp", { email: user.email, otp: otpValue, purpose: "change-password" });
      toast.success("Email verified! Set your new password.");
      setPwStep(2);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setPwLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPw) { toast.error("Passwords do not match"); return; }
    if (newPassword.length < 8)   { toast.error("Password must be at least 8 characters"); return; }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", { password: newPassword, confirmPassword: confirmPw });
      toast.success("Password changed successfully!");
      setPwStep(0); setNewPassword(""); setConfirmPw(""); setOtpValue("");
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-sm text-[#5c5656]">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={24} className="text-[#c84b31]" />
        <h1 className="font-display text-3xl font-semibold">Restaurant Settings</h1>
      </div>

      <div className="bg-white rounded-2xl border border-[#eae6df] p-6 max-w-2xl">
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#2a2626] mb-2">
              Restaurant Name (Read-only)
            </label>
            <input
              type="text"
              value={form.name}
              disabled
              className="w-full px-4 py-2 border border-[#eae6df] rounded-lg bg-[#f9f8f6] text-[#5c5656]"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-[#2a2626] mb-2">
              Address
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter restaurant address"
              rows="3"
              className="w-full px-4 py-2 border border-[#eae6df] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c84b31]"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-[#2a2626] mb-2">
              Phone Number
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Phone size={16} className="absolute left-3 top-3 text-[#5c5656]" />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9151423414"
                  className="w-full pl-10 pr-4 py-2 border border-[#eae6df] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c84b31]"
                />
              </div>
            </div>
          </div>

          {/* GSTIN */}
          <div>
            <label className="block text-sm font-medium text-[#2a2626] mb-2">
              GSTIN Number
            </label>
            <input
              type="text"
              name="gstin"
              value={form.gstin}
              onChange={handleChange}
              placeholder="e.g., 07AABCT1234H1Z0"
              maxLength="15"
              className="w-full px-4 py-2 border border-[#eae6df] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c84b31]"
            />
            <p className="text-xs text-[#5c5656] mt-1">15-character GSTIN number</p>
          </div>

          {/* Location */}
          <div className="bg-[#f9f8f6] rounded-lg p-4 border border-[#eae6df]">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-[#c84b31]" />
              <h3 className="font-medium text-[#2a2626]">GPS Location</h3>
              <button
                onClick={getCurrentLocation}
                className="ml-auto text-xs px-3 py-1 bg-[#c84b31] text-white rounded hover:bg-[#b53a1c]"
              >
                Get Current Location
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#5c5656] mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  name="latitude"
                  value={form.latitude}
                  onChange={handleChange}
                  placeholder="e.g., 28.6139"
                  step="0.0001"
                  className="w-full px-3 py-2 border border-[#eae6df] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c84b31]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5c5656] mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  name="longitude"
                  value={form.longitude}
                  onChange={handleChange}
                  placeholder="e.g., 77.2090"
                  step="0.0001"
                  className="w-full px-3 py-2 border border-[#eae6df] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c84b31]"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#c84b31] text-white rounded-lg font-medium hover:bg-[#b53a1c] disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* ── Change Password Section ── */}
      <div className="bg-white rounded-2xl border border-[#eae6df] p-6 max-w-2xl mt-8">
        <div className="flex items-center gap-2 mb-6">
          <KeyRound size={18} className="text-[#c84b31]" />
          <h2 className="font-display text-xl font-semibold">Change Password</h2>
        </div>

        {pwStep === 0 && (
          <div>
            <p className="text-sm text-[#5c5656] mb-4">
              We'll send a one-time verification code to <strong>{user?.email}</strong> before letting you set a new password.
            </p>
            <button
              onClick={handleSendOtp}
              disabled={pwLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2a2626] text-white rounded-lg text-sm font-medium hover:bg-[#c84b31] disabled:opacity-50"
            >
              <Mail size={15} /> {pwLoading ? "Sending..." : "Send verification code"}
            </button>
          </div>
        )}

        {pwStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-[#5c5656]">Enter the 6-digit code sent to <strong>{user?.email}</strong>.</p>
            <div className="flex gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-40 px-4 py-2 border border-[#eae6df] rounded-lg text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#c84b31]"
              />
              <button
                onClick={handleVerifyOtp}
                disabled={pwLoading || otpValue.length < 6}
                className="px-5 py-2 bg-[#c84b31] text-white rounded-lg text-sm font-medium hover:bg-[#b53a1c] disabled:opacity-50"
              >
                {pwLoading ? "Verifying..." : "Verify"}
              </button>
            </div>
            <button onClick={() => { setPwStep(0); setOtpValue(""); }} className="text-xs text-[#5c5656] hover:text-[#c84b31]">
              Resend / cancel
            </button>
          </div>
        )}

        {pwStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-[#5c5656]">Email verified ✓ — set your new password below.</p>
            <div className="relative">
              <label className="block text-xs font-medium text-[#5c5656] mb-1">New password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-2 border border-[#eae6df] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c84b31] pr-10"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-2.5 text-[#5c5656]">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5c5656] mb-1">Confirm new password</label>
              <input
                type={showPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Re-enter password"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c84b31] ${
                  confirmPw && confirmPw !== newPassword ? "border-red-400" : "border-[#eae6df]"
                }`}
              />
              {confirmPw && confirmPw !== newPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
            <button
              onClick={handleChangePassword}
              disabled={pwLoading || newPassword.length < 8 || newPassword !== confirmPw}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#c84b31] text-white rounded-lg text-sm font-medium hover:bg-[#b53a1c] disabled:opacity-50"
            >
              <KeyRound size={15} /> {pwLoading ? "Saving..." : "Change password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
