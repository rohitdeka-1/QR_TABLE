import { useEffect, useState, useRef } from "react";
import { api, formatError } from "@/lib/api";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { Plus, Trash2, Download, ExternalLink, X } from "lucide-react";

export default function AdminTables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [label, setLabel] = useState("");
  const [qrTable, setQrTable] = useState(null);
  const qrRef = useRef(null);

  const load = async () => {
    try {
      const res = await api.get("/admin/tables");
      setTables(res.data);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!tableNumber) return;
    try {
      await api.post("/admin/tables", {
        table_number: parseInt(tableNumber),
        label,
      });
      toast.success("Table added");
      setTableNumber("");
      setLabel("");
      setCreating(false);
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this table?")) return;
    try {
      await api.delete(`/admin/tables/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const downloadQR = (tableNumber) => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    const fileName = tableNumber ? `table-${tableNumber}-qr.png` : 'table-qr.png';
    link.download = fileName;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Use qrUrl directly from backend
  const menuUrl = (qrUrl) => {
    return qrUrl || `${window.location.origin}/menu/qr`;
  };

  return (
    <div className="p-8" data-testid="admin-tables">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Tables</h1>
          <p className="text-sm text-[#5c5656] mt-1">
            Generate a QR code per table — diners scan to open the menu.
          </p>
        </div>
        <button
          data-testid="add-table-btn"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a2626] text-white text-sm hover:bg-[#c84b31]"
        >
          <Plus size={16} /> New table
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[#5c5656]">Loading...</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((t) => (
            <div
              key={t.id}
              data-testid={`table-card-${t.id}`}
              className="bg-white rounded-xl border border-[#eae6df] p-5 hover:-translate-y-1 transition-transform"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#5c5656]">{t.label}</div>
                  <div className="font-display text-2xl font-semibold mt-1">Table {t.tableNumber}</div>
                </div>
                <button
                  data-testid={`delete-table-${t.id}`}
                  onClick={() => remove(t.id)}
                  className="text-red-500 p-1.5 rounded hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-3 text-xs text-[#5c5656] font-mono break-all">{t.code}</div>
              <div className="flex gap-2 mt-4">
                <button
                  data-testid={`view-qr-${t.id}`}
                  onClick={() => setQrTable(t)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#f4f3ef] text-sm hover:bg-[#eae6df]"
                >
                  View QR
                </button>
                <a
                  data-testid={`open-menu-${t.id}`}
                  href={t.qrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg border border-[#eae6df] text-sm flex items-center gap-1 hover:border-[#c84b31]"
                >
                  <ExternalLink size={12} /> Open
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal onClose={() => setCreating(false)} title="New table">
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-[#5c5656]">Table number</label>
              <input
                data-testid="new-table-number"
                type="number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full mt-1 px-4 py-2.5 rounded-lg border border-[#eae6df]"
                placeholder="e.g., 5"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-[#5c5656]">Label (optional)</label>
              <input
                data-testid="new-table-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full mt-1 px-4 py-2.5 rounded-lg border border-[#eae6df]"
                placeholder="Window seat"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg border border-[#eae6df] text-sm">
                Cancel
              </button>
              <button
                data-testid="create-table-submit"
                onClick={create}
                className="px-4 py-2 rounded-lg bg-[#2a2626] text-white text-sm"
              >
                Create
              </button>
            </div>
          </div>
        </Modal>
      )}

      {qrTable && (
        <Modal onClose={() => setQrTable(null)} title={`QR — ${qrTable.label}`}>
          <div className="flex flex-col items-center" ref={qrRef}>
            <div className="p-6 bg-white border border-[#eae6df] rounded-2xl">
              <QRCodeCanvas
                value={qrTable.qrUrl}
                size={220}
                level="H"
                fgColor="#2a2626"
                includeMargin
              />
            </div>
            <div className="text-xs font-mono text-[#5c5656] mt-3 break-all text-center">
              {qrTable.qrUrl}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button
              data-testid="download-qr-btn"
              onClick={() => downloadQR(qrTable.tableNumber)}
              className="px-4 py-2 rounded-lg bg-[#2a2626] text-white text-sm flex items-center gap-2"
            >
              <Download size={14} /> Download PNG
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, title, onClose }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
