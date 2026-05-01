import { Navigate, Route, Routes } from 'react-router-dom';
import CustomerFlowPage from './pages/CustomerFlowPage';
import KitchenPage from './pages/KitchenPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CustomerFlowPage />} />
      <Route path="/kitchen" element={<KitchenPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
