import { useEffect, useState } from "react";
import { api, formatError } from "@/lib/api";
import { toast } from "sonner";
import { Settings, Save, MapPin, Phone } from "lucide-react";

export default function AdminSettings() {
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
    </div>
  );
}
