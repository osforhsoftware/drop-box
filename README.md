# CASEBOX

**CASEBOX** is a full-stack custom phone case e-commerce platform. Customers pick their phone, upload artwork, preview the design on a live canvas, place an order, and pay via UPI. Admins manage orders, catalog, and payment settings from a protected dashboard.

---

## Table of Contents

- [Features](#features)
- [Pages & Routes](#pages--routes)
- [Order Flow](#order-flow)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Default Catalog](#default-catalog)
- [Order & Payment Statuses](#order--payment-statuses)
- [Testing](#testing)
- [Design System](#design-system)

---

## Features

### Customer (Storefront)

| Feature | Description |
|---------|-------------|
| **Landing page** | Hero section, supported brands marquee, featured cases, how-it-works steps, compatibility grid, testimonials, and feature highlights |
| **4-step customizer** | Brand → Model → Case type → Design |
| **Fabric.js design canvas** | Upload JPG/PNG/WEBP, drag to reposition, zoom in/out, rotate (15° steps), clear image |
| **Phone case preview** | Live canvas with phone frame and camera cutout overlay |
| **Draft persistence** | Customization saved in `sessionStorage` so selections survive page refreshes |
| **Checkout** | Shipping form with Indian state list, pincode, optional email and notes |
| **UPI payment** | QR code, copy UPI ID, payment screenshot upload, UTR submission |
| **WhatsApp shortcut** | Pre-filled message link to merchant WhatsApp after payment |
| **Order tracking** | Search by order ID (`FRM-YYMMDD-XXXXXX`) with visual delivery timeline |
| **Responsive UI** | Dark luxury theme, mobile-friendly layout, sticky header |

### Admin Dashboard

| Feature | Description |
|---------|-------------|
| **JWT authentication** | Email/password login with HTTP-only cookies + Bearer token fallback |
| **Dashboard analytics** | Total orders, pending review, approved, shipped, and approved revenue |
| **Order management** | Filter by status, approve/reject payments, update delivery stages, view design & payment screenshots |
| **Catalog management** | Add/delete phone brands, models, and case types (products) |
| **Settings** | Configure UPI ID, merchant name, WhatsApp number, and currency |
| **Protected routes** | Admin pages require authenticated admin role |

### Backend

| Feature | Description |
|---------|-------------|
| **MongoDB** | Users, brands, models, products, orders, settings collections |
| **File uploads** | Design images, payment screenshots, and canvas previews (max 12 MB) |
| **Auto-seeding** | Default admin user, brands/models, products, and settings on first run |
| **Static file serving** | Uploaded files served at `/api/uploads/` |

---

## Pages & Routes

### Public (Storefront)

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Home** | Landing page with hero, featured cases, process steps, brand compatibility, testimonials |
| `/shop` | **Shop** | Browse pre-designed template cases |
| `/customize` | **Customize** | 4-step wizard: brand, model, case type, and Fabric.js design editor |
| `/about` | **About** | Brand story, products, and shipping overview |
| `/contact` | **Contact** | Contact form, Instagram DM, and support info |
| `/faq` | **FAQ** | Frequently asked questions |
| `/privacy` | **Privacy Policy** | Data collection and privacy practices |
| `/terms` | **Terms & Conditions** | Terms of use and purchase |
| `/returns` | **Return & Refund Policy** | Returns, exchanges, and refunds |
| `/shipping` | **Shipping Policy** | Coverage, fees, and delivery timelines |
| `/checkout` | **Checkout** | Customer details and shipping address form |
| `/payment/:orderId` | **Payment** | UPI QR code, screenshot upload, and UTR entry |
| `/track` | **Order Status** | Order ID search form |
| `/track/:orderId` | **Order Status** | Live order timeline and details |

### Admin

| Route | Page | Description |
|-------|------|-------------|
| `/admin/login` | **Admin Login** | Email/password sign-in |
| `/admin` | **Dashboard** | Analytics tiles and recent orders table |
| `/admin/orders` | **Orders** | Full order list with filters, payment approval, and status updates |
| `/admin/catalog` | **Catalog** | Manage brands, phone models, and case types |
| `/admin/settings` | **Settings** | UPI, merchant name, WhatsApp, and currency configuration |

### Navigation

**Header links:** Shop · Customize · Track Order · About · Contact

**Footer links:** Shop · Customize · Track Order · About · FAQ · Contact · Privacy · Terms · Returns · Shipping

---

## Order Flow

```
Home → Customize (Brand → Model → Case → Design) → Checkout → Payment (UPI) → Track Order
```

1. Customer selects phone brand, model, and case material.
2. Customer uploads artwork and adjusts it on the Fabric.js canvas.
3. Design and preview images are uploaded to the backend; draft is saved locally.
4. Customer fills shipping details at checkout; order is created with ID like `FRM-250625-A1B2C3`.
5. Customer pays via UPI, uploads payment screenshot, and enters UTR number.
6. Admin verifies payment and updates delivery status through the admin panel.
7. Customer tracks progress on the Order Status page.

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, React Router 7, Tailwind CSS, Shadcn UI (Radix), Fabric.js, Axios, Framer Motion, Lucide icons |
| **Backend** | Node.js, Express, MongoDB driver, Multer, JWT, bcryptjs |
| **Database** | MongoDB |
| **Build** | Create React App + CRACO |
| **Payments** | Manual UPI (QR + screenshot verification) |

---

## Project Structure

```
drop-box/
├── backend/
│   ├── server.js          # Main Express API server
│   ├── package.json
│   └── uploads/
│       ├── designs/       # Customer design uploads
│       ├── payments/      # Payment screenshot uploads
│       └── templates/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js         # Route definitions
│   │   ├── components/    # Header, Footer, CasePreview, UI (Shadcn)
│   │   ├── pages/         # Storefront pages
│   │   ├── pages/admin/   # Admin dashboard pages
│   │   ├── lib/           # api.js, auth.jsx, draft.js
│   │   └── constants/     # data-testid definitions
│   ├── package.json
│   └── craco.config.js
├── design_guidelines.json # Brand colors, typography, UI rules
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** (local or Atlas connection string)

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env` (see [Environment Variables](#environment-variables)), then start the server:

```bash
npm start
# or with auto-reload:
npm run dev
```

API runs at **http://localhost:8000** by default.

### 2. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

Start the development server:

```bash
npm start
```

App runs at **http://localhost:3000** by default.

### 3. Admin Login

On first startup, the backend seeds an admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`. Sign in at **http://localhost:3000/admin/login**.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | Yes | MongoDB connection string |
| `DB_NAME` | Yes | Database name |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |
| `ADMIN_EMAIL` | Yes | Admin account email (seeded on startup) |
| `ADMIN_PASSWORD` | Yes | Admin account password (seeded on startup) |
| `PORT` | No | API port (default: `8000`) |
| `IMAGE_COMPRESS_ENABLED` | No | `true` to compress uploads to WebP. Admin Settings can override this (default: `true`) |
| `IMAGE_MAX_WIDTH` | No | Max WebP edge in pixels. Admin Settings can override (default: `1200`) |
| `IMAGE_TARGET_KB` | No | Target compressed size in KB. Admin Settings can override (default: `150`) |
| `IMAGE_WEBP_QUALITY` | No | Starting WebP quality, reduced until the target size or quality 40. Admin Settings can override (default: `85`) |
| `PUBLIC_BASE_URL` | No | Public URL prefix for uploaded file links |
| `NODE_ENV` | No | Set to `production` for secure cookies |
| `INDIA_POST_API_URL` | No | India Post PIN lookup base URL (defaults to `https://api.postalpincode.in/pincode`) |
| `INDIA_POST_API_TIMEOUT_MS` | No | PIN lookup timeout in milliseconds (default: `5000`) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_BACKEND_URL` | Yes | Backend base URL (e.g. `http://localhost:8000`) |

---

## API Reference

Base URL: `{BACKEND_URL}/api`

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | — | Admin login |
| `GET` | `/auth/me` | Admin | Current admin user |
| `POST` | `/auth/logout` | — | Clear session cookie |

### Catalog (Public read, Admin write)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/brands` | — | List phone brands |
| `POST` | `/brands` | Admin | Create brand |
| `DELETE` | `/brands/:brand_id` | Admin | Delete brand and its models |
| `GET` | `/models?brand_id=` | — | List models (optionally by brand) |
| `POST` | `/models` | Admin | Create model |
| `DELETE` | `/models/:model_id` | Admin | Delete model |
| `GET` | `/products` | — | List case types |
| `POST` | `/products` | Admin | Create case type |
| `DELETE` | `/products/:product_id` | Admin | Delete case type |

### Uploads

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload/design` | Upload customer artwork (multipart `file`) |
| `POST` | `/upload/preview` | Upload canvas preview PNG |
| `POST` | `/upload/payment` | Upload payment screenshot |

Allowed formats: **JPG, JPEG, PNG, WEBP, GIF** · Max size: **12 MB**

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/orders` | — | Create order |
| `GET` | `/orders/:order_id` | — | Get order by ID |
| `POST` | `/orders/:order_id/payment-proof` | — | Submit UTR + screenshot |
| `GET` | `/admin/orders` | Admin | List all orders |
| `PATCH` | `/admin/orders/:order_id` | Admin | Update payment/delivery status |
| `GET` | `/admin/analytics` | Admin | Dashboard stats |

### Postal address

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/postal/pincode/:pincode` | Customer | Resolve a 6-digit Indian PIN code through India Post |

### Settings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/settings` | — | Get merchant settings (UPI, WhatsApp, etc.) |
| `PUT` | `/settings` | Admin | Update settings |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | `{ "status": "ok", "service": "CASEBOX" }` |

Static uploads: `/api/uploads/{designs|payments|templates}/<filename>`

### Image compression

`POST /api/upload` accepts one JPG, PNG, or WebP field named `image` (max 10 MB). The file is rotated from EXIF, resized, and saved as WebP. A logged-in user token is required.

```bash
curl -F "image=@photo.jpg" http://localhost:3000/api/upload
```

This API listens on port **8000** by default. Send the session cookie or a Bearer token:

```bash
curl -H "Authorization: Bearer TOKEN" -F "image=@photo.jpg" http://localhost:8000/api/upload
```

Product photos use the same pipeline and also write thumb, medium, and large variants:

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" -F "image=@photo.jpg" http://localhost:8000/api/products/PRODUCT_ID/image
```

Compressed files are served from `/uploads/<uuid>.webp` with a one-year cache.

---

## Default Catalog

Seeded automatically when the database is empty.

### Phone Brands & Models

- **Apple** — iPhone 15 Pro Max, iPhone 15 Pro, iPhone 15, iPhone 14 Pro, iPhone 14, iPhone 13
- **Samsung** — Galaxy S24 Ultra, Galaxy S24, Galaxy S23 Ultra, Galaxy A54, Galaxy Note 20
- **Xiaomi** — Xiaomi 14, Redmi Note 13 Pro, Poco F5, Redmi 12
- **Vivo** — Vivo V30 Pro, Vivo X100, Vivo Y100
- **Oppo** — Oppo Find X7, Oppo Reno 11, Oppo A78
- **OnePlus** — OnePlus 12, OnePlus 11, OnePlus Nord 3
- **Google Pixel** — Pixel 8 Pro, Pixel 8, Pixel 7a

### Case Types (Products)

| Name | Slug | Price (₹) |
|------|------|-----------|
| Silicone Case | `silicone` | 299 |
| Transparent Case | `transparent` | 349 |
| Matte Case | `matte` | 399 |
| Glass Case | `glass` | 499 |

---

## Order & Payment Statuses

### Payment Status

| Status | Meaning |
|--------|---------|
| `pending` | Order created, no payment proof yet |
| `submitted` | Customer uploaded screenshot and UTR |
| `approved` | Admin verified payment |
| `rejected` | Payment rejected by admin |

### Delivery Status

| Status | Meaning |
|--------|---------|
| `pending_payment_verification` | Awaiting payment review |
| `payment_approved` | Payment confirmed |
| `printing` | Case is being printed |
| `packed` | Order packed |
| `shipped` | Out for delivery |
| `delivered` | Delivered to customer |

---

## Testing

Interactive elements use `data-testid` attributes (kebab-case) for E2E testing — see `frontend/src/constants/testIds/`.

---

## Design System

- **Brand:** CASEBOX
- **Theme:** Dark luxury (Archetype 5 — hardware/premium feel)
- **Primary color:** `#6DB161` (green)
- **Background:** `#0D0D0D`
- **Fonts:** Clash Display (headings), Satoshi (body), JetBrains Mono (labels/code)
- **UI:** Shadcn components with glass-morphism surfaces (`crystal_glass`, `interactive_glass`)

Full design tokens and component rules are documented in [`design_guidelines.json`](design_guidelines.json).

---

## License

Private project — all rights reserved.
