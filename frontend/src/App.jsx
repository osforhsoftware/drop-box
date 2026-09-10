import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import { Toaster } from "sonner";

import { AuthProvider } from "./lib/auth";
import { CartProvider } from "./lib/cart";

import Header from "./components/Header";
import Footer from "./components/Footer";
import BottomNav from "./components/BottomNav";
import WhatsAppFloat from "./components/WhatsAppFloat";
import RequireAuth from "./components/RequireAuth";
import ScrollToTop from "./components/ScrollToTop";

import "./App.css";

const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const TemplateDetail = lazy(() => import("./pages/TemplateDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Customize = lazy(() => import("./pages/Customize"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Payment = lazy(() => import("./pages/Payment"));
const OrderStatus = lazy(() => import("./pages/OrderStatus"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const Returns = lazy(() => import("./pages/Returns"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CustomerGallery = lazy(() => import("./pages/CustomerGallery"));
const GalleryUpload = lazy(() => import("./pages/GalleryUpload"));

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminFailedPayments = lazy(() => import("./pages/admin/AdminFailedPayments"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCatalog = lazy(() => import("./pages/admin/AdminCatalog"));
const AdminTemplates = lazy(() => import("./pages/admin/Templates"));
const AdminTemplateProducts = lazy(() => import("./pages/admin/AdminTemplateProducts"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminPromoCodes = lazy(() => import("./pages/admin/AdminPromoCodes"));
const AdminPopupOffers = lazy(() => import("./pages/admin/AdminPopupOffers"));
const AdminHeroSlides = lazy(() => import("./pages/admin/AdminHeroSlides"));
const AdminCaseTypes = lazy(() => import("./pages/admin/AdminCaseTypes"));
const AdminContact = lazy(() => import("./pages/admin/AdminContact"));
const AdminCustomerGallery = lazy(() => import("./pages/admin/AdminCustomerGallery"));

function PageFallback() {
  return <div className="p-10 text-center text-white/50">Loading…</div>;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Header />
          <div className="public-content mobile-nav-spacer md:pb-0">
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/template/:slug" element={<TemplateDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/customize" element={<Customize />} />

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

                <Route path="/casebox-login" element={<AdminLogin />} />
                <Route path="/admin/login" element={<Navigate to="/casebox-login" replace />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="failed-payments" element={<AdminFailedPayments />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="contact" element={<AdminContact />} />
                  <Route path="catalog" element={<AdminCatalog />} />
                  <Route path="catalog/templates" element={<AdminTemplates />} />
                  <Route path="case-types" element={<AdminCaseTypes />} />
                  <Route path="template-products" element={<AdminTemplateProducts />} />
                  <Route path="promo-codes" element={<AdminPromoCodes />} />
                  <Route path="popup-offers" element={<AdminPopupOffers />} />
                  <Route path="hero-slides" element={<AdminHeroSlides />} />
                  <Route path="customer-gallery" element={<AdminCustomerGallery />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
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
