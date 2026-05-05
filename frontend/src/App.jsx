import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import Landing from "@/pages/Landing";
import RestaurantRegister from "@/pages/RestaurantRegister";
import CustomerMenu from "@/pages/CustomerMenu";
import OrderTracking from "@/pages/OrderTracking";
import AdminLogin from "@/pages/AdminLogin";
import AdminLayout from "@/pages/AdminLayout";
import AdminMenu from "@/pages/AdminMenu";
import AdminTables from "@/pages/AdminTables";
import AdminOrders from "@/pages/AdminOrders";
import AdminAnalytics from "@/pages/AdminAnalytics";
import AdminSettings from "@/pages/AdminSettings";
import BillPrint from "@/pages/BillPrint";
import Kitchen from "@/pages/Kitchen";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-[#5c5656]">Loading...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Toaster position="top-center" richColors />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/register" element={<RestaurantRegister />} />
              <Route path="/menu/qr" element={<CustomerMenu />} />
              <Route path="/menu/:tableCode" element={<CustomerMenu />} />
              <Route path="/order/:orderId" element={<OrderTracking />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="orders" replace />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="menu" element={<AdminMenu />} />
                <Route path="tables" element={<AdminTables />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="bill/:orderId" element={<BillPrint />} />
              </Route>
              <Route
                path="/kitchen"
                element={
                  <ProtectedRoute>
                    <Kitchen />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
