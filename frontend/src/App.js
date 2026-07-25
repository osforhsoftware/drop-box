import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Toaster } from "sonner";

import { AuthProvider } from "./lib/auth";
import { CartProvider } from "./lib/cart";

import Header from "./components/Header";

import Footer from "./components/Footer";

import BottomNav from "./components/BottomNav";

import WhatsAppFloat from "./components/WhatsAppFloat";

import Home from "./pages/Home";

import Shop from "./pages/Shop";

import TemplateDetail from "./pages/TemplateDetail";

import Cart from "./pages/Cart";
const Customize = lazy(() => import("./pages/Customize"));

import Checkout from "./pages/Checkout";

import Payment from "./pages/Payment";

import OrderStatus from "./pages/OrderStatus";

import Login from "./pages/Login";

import Register from "./pages/Register";

import Profile from "./pages/Profile";

import Wishlist from "./pages/Wishlist";

import About from "./pages/About";

import Contact from "./pages/Contact";

import FAQ from "./pages/FAQ";

import PrivacyPolicy from "./pages/PrivacyPolicy";

import Terms from "./pages/Terms";

import Returns from "./pages/Returns";

import ShippingPolicy from "./pages/ShippingPolicy";

import RequireAuth from "./components/RequireAuth";

import ScrollToTop from "./components/ScrollToTop";

import NotFound from "./pages/NotFound";

import AdminLogin from "./pages/admin/AdminLogin";

import AdminLayout from "./pages/admin/AdminLayout";

import AdminDashboard from "./pages/admin/AdminDashboard";

import AdminOrders from "./pages/admin/AdminOrders";

import AdminUsers from "./pages/admin/AdminUsers";

import AdminCatalog from "./pages/admin/AdminCatalog";

import AdminTemplates from "./pages/admin/Templates";

import AdminTemplateProducts from "./pages/admin/AdminTemplateProducts";

import AdminSettings from "./pages/admin/AdminSettings";

import AdminPromoCodes from "./pages/admin/AdminPromoCodes";

import AdminPopupOffers from "./pages/admin/AdminPopupOffers";
import AdminCaseTypes from "./pages/admin/AdminCaseTypes";

import AdminContact from "./pages/admin/AdminContact";

import AdminCustomerGallery from "./pages/admin/AdminCustomerGallery";

import CustomerGallery from "./pages/CustomerGallery";

import GalleryUpload from "./pages/GalleryUpload";

import "./App.css";



function App() {

  return (

    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Header />
          <div className="mobile-nav-spacer md:pb-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/template/:slug" element={<TemplateDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route
              path="/customize"
              element={
                <Suspense fallback={<div className="p-10 text-center text-white/50">Loading customizer…</div>}>
                  <Customize />
                </Suspense>
              }
            />

          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />

          <Route path="/payment/:orderId" element={<RequireAuth><Payment /></RequireAuth>} />

          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

            <Route path="/wishlist" element={<Wishlist />} />

          <Route path="/about" element={<About />} />

          <Route path="/contact" element={<Contact />} />

          <Route path="/faq" element={<FAQ />} />

          <Route path="/privacy" element={<PrivacyPolicy />} />

          <Route path="/terms" element={<Terms />} />

          <Route path="/returns" element={<Returns />} />

          <Route path="/shipping" element={<ShippingPolicy />} />

          <Route path="/gallery" element={<CustomerGallery />} />

          <Route path="/gallery/upload" element={<RequireAuth><GalleryUpload /></RequireAuth>} />

          <Route path="/track" element={<OrderStatus />} />

          <Route path="/track/:orderId" element={<OrderStatus />} />

          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />

          <Route path="/admin/login" element={<AdminLogin />} />

          <Route path="/admin" element={<AdminLayout />}>

            <Route index element={<AdminDashboard />} />

            <Route path="orders" element={<AdminOrders />} />

            <Route path="users" element={<AdminUsers />} />

            <Route path="contact" element={<AdminContact />} />

            <Route path="catalog" element={<AdminCatalog />} />

            <Route path="catalog/templates" element={<AdminTemplates />} />
            <Route path="case-types" element={<AdminCaseTypes />} />

            <Route path="template-products" element={<AdminTemplateProducts />} />

            <Route path="promo-codes" element={<AdminPromoCodes />} />

            <Route path="popup-offers" element={<AdminPopupOffers />} />

            <Route path="customer-gallery" element={<AdminCustomerGallery />} />

            <Route path="settings" element={<AdminSettings />} />

          </Route>

          <Route path="*" element={<NotFound />} />

        </Routes>

        <Footer />

        </div>

        <BottomNav />

        <WhatsAppFloat />

        <Toaster theme="dark" position="top-right" />

        </BrowserRouter>
      </CartProvider>
    </AuthProvider>

  );

}



export default App;

