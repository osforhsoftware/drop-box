import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/auth";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Customize from "./pages/Customize";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import OrderStatus from "./pages/OrderStatus";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCatalog from "./pages/admin/AdminCatalog";
import AdminSettings from "./pages/admin/AdminSettings";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/customize" element={<Customize />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment/:orderId" element={<Payment />} />
          <Route path="/track" element={<OrderStatus />} />
          <Route path="/track/:orderId" element={<OrderStatus />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="catalog" element={<AdminCatalog />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
        <Footer />
        <Toaster theme="dark" position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
