import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatError } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";

export default function BillPrint() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [orderRes, restaurantRes] = await Promise.all([
          api.get(`/admin/orders/${orderId}`),
          api.get('/admin/restaurant'),
        ]);
        setOrder(orderRes.data);
        setRestaurant(restaurantRes.data);
      } catch (e) {
        toast.error(formatError(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-gray-500">Loading bill...</div>
      </div>
    );
  }

  if (!order || !restaurant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-gray-500">Bill not found</div>
      </div>
    );
  }

  const invoiceDate = new Date(order.createdAt);
  const invoiceNo = `INV-${invoiceDate.getFullYear()}-${String(order.queueNumber).padStart(5, '0')}`;

  return (
    <div className="p-4">
      {/* No-print header */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          <Printer size={16} />
          Print Bill
        </button>
      </div>

      {/* Bill Container - Thermal format */}
      <div id="receipt-content" className="mx-auto bg-white p-4 sm:p-8" style={{ width: '80mm', fontFamily: 'monospace', color: '#000' }}>
        {/* Header */}
        <div className="text-center mb-4 border-b-2 border-dashed border-gray-800 pb-4">
          <h1 className="text-xl font-bold">{restaurant.name}</h1>
          {restaurant.address && (
            <p className="text-xs text-gray-700 mt-1">{restaurant.address}</p>
          )}
          {restaurant.phone && (
            <p className="text-xs text-gray-700">Ph: {restaurant.phone}</p>
          )}
          {restaurant.gstin && (
            <p className="text-xs text-gray-700">GSTIN: {restaurant.gstin}</p>
          )}
        </div>

        {/* Bill Info */}
        <div className="text-xs mb-4 border-b-2 border-dashed border-gray-800 pb-4">
          <div className="flex justify-between">
            <span className="font-bold">Bill No:</span>
            <span>{invoiceNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Date:</span>
            <span>{invoiceDate.toLocaleDateString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Time:</span>
            <span>{invoiceDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Table:</span>
            <span>Table {order.tableId?.tableNumber || 'N/A'}</span>
          </div>
          {order.customerName && (
            <div className="flex justify-between">
              <span className="font-bold">Customer:</span>
              <span>{order.customerName}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="text-xs mb-4 border-b-2 border-dashed border-gray-800 pb-4">
          <div className="flex mb-2 border-b border-gray-400 pb-1 font-bold">
            <span className="flex-1">Item</span>
            <span className="w-8 text-right">Qty</span>
            <span className="w-12 text-right">Rate</span>
            <span className="w-12 text-right">Amt</span>
          </div>
          {(order.items || []).map((item, idx) => {
            const qty = item.qty || item.quantity || 1;
            const itemAmount = qty * item.price;
            return (
              <div key={idx} className="flex mb-1">
                <span className="flex-1 truncate">{item.name}</span>
                <span className="w-8 text-right">{qty}</span>
                <span className="w-12 text-right">₹{item.price.toFixed(0)}</span>
                <span className="w-12 text-right">₹{itemAmount.toFixed(0)}</span>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="text-xs mb-4 border-b-2 border-dashed border-gray-800 pb-4">
          {(() => {
            const subtotal = order.subtotal || order.totalAmount - (order.taxAmount || 0);
            const gstAmount = subtotal * 0.05; // 5% GST
            const total = subtotal + gstAmount;
            
            return (
              <>
                <div className="flex justify-between mb-1">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2 border-b border-gray-400 pb-1">
                  <span>GST (5%):</span>
                  <span>₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </>
            );
          })()}
        </div>

        {/* Payment Info */}
        <div className="text-xs mb-4 border-b-2 border-dashed border-gray-800 pb-4">
          <div className="flex justify-between">
            <span className="font-bold">Payment Mode:</span>
            <span className="uppercase">{order.paymentMode || 'Cash'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Status:</span>
            <span className="uppercase">{order.paymentStatus || 'Unpaid'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs">
          <p className="font-bold mb-2">Thank You</p>
          <p>VISIT US AGAIN</p>
          <p className="mt-2 text-gray-600">Powered by QR Restaurant System</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #receipt-content, #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            padding: 5mm !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
