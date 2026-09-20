# Software Requirements Specification (SRS)
## [Your Brand Name] — React + PHP E-commerce Platform

**Version:** 1.0
**Prepared for:** Development via AI coding agents (phase-wise execution)
**Hosting target:** Hostinger Premium (PHP + MySQL, no Node.js runtime)

---

## 1. Introduction

### 1.1 Purpose
This document specifies functional and non-functional requirements for a D2C e-commerce platform selling accessories/jewelry in the ₹500–1500 price range. It is structured in **development phases** so each phase can be handed to an AI coding assistant (e.g., Antigravity, Claude Code) as an independent, scoped task with clear inputs, outputs, and acceptance criteria.

### 1.2 Scope
The platform consists of:
- A **React (Vite) storefront** — mobile-first, responsive, SEO-considerate
- A **PHP REST API backend** — no framework dependency required, runs on shared hosting
- A **MySQL database**
- Third-party integrations: **Fastrr Checkout** (payment/RTO-risk engine), **Shiprocket** (shipping/courier), an **email service** (SMTP/PHPMailer), **Google Analytics 4**, **Google Search Console**

### 1.3 Brand Color Theme

| Role | Hex |
|---|---|
| Primary | `#8366B0` |
| Secondary | `#FFFFFF` |
| Tertiary (dark accent) | `#26153D` |

These colors apply across the storefront UI (buttons, highlights, headers) and the custom Fastrr checkout theming (Phase 5). Should be defined as CSS variables / Tailwind theme extension in Phase 0 so every later phase inherits them consistently rather than hardcoding hex values per component.

### 1.4 Reference Basis
Requirements are informed by UX/flow analysis of three market-proven competitor stores in the same category (madewidlove.in, everlasting.shop, glomo.in), which validated: slide-out cart drawers, bundle/combo pricing, strike-through pricing, homepage trust/FAQ blocks, and Fastrr-style partial-payment checkout.

### 1.5 Out of Scope (v1)
- Node.js-dependent SSR frameworks (excluded due to hosting constraint)
- Native mobile apps
- Multi-currency/international shipping
- Marketplace/multi-vendor functionality

---

## 2. Overall System Architecture

```
[React SPA - static build]  <--fetch/JSON-->  [PHP REST API]  <--PDO-->  [MySQL]
        |                                          |
        |--> Fastrr Checkout API (payment/RTO)     |--> Shiprocket API (shipping)
        |--> Google Analytics 4                    |--> SMTP (order emails)
```

- Frontend deploys to `public_html/`
- Backend deploys to `public_html/api/`
- No server-side rendering; SEO handled via `react-helmet-async` + PHP-generated sitemap + (optional) PHP-pre-rendered meta tag shell for product/category pages
- Deployment via GitHub Actions → build → FTP/SFTP to Hostinger (confirmed compatible with Premium)

---

## 3. Non-Functional Requirements (apply across all phases)

| Category | Requirement |
|---|---|
| **Security** | All queries via PDO prepared statements. Passwords via `password_hash()`. JWT auth with secrets kept out of the repo. HTTPS enforced. Given real transaction values (₹899–1000+ tickets), rate-limiting required on auth/payment endpoints, admin activity logging, and webhook signature verification for both Fastrr and Shiprocket callbacks. |
| **Responsiveness (Storefront)** | Mobile-first design mandatory for the customer-facing storefront. Build and test mobile breakpoint first, then tablet, then desktop — not the reverse. Majority of real customer traffic is mobile. |
| **Responsiveness (Admin Panel)** | Desktop-first for the admin panel — the reverse priority from the storefront. Admin/staff operate the panel from desktop computers day-to-day, so layouts (tables, bulk actions, dashboards) should be designed and tested for desktop screens first, with tablet as a secondary consideration. Mobile admin access is not a priority for v1. |
| **Performance** | Static asset delivery for frontend; lazy-load product images; paginate product listings server-side. |
| **SEO** | Unique H1 per page, unique meta title/description per product (data-driven, not hardcoded), auto-generated XML sitemap, correct `robots.txt`. |
| **Compliance** | Privacy Policy, Returns/Refund Policy, and Terms pages required per India's DPDP Act, disclosing third-party data sharing (Shiprocket, payment gateway, Fastrr). |
| **Availability of admin actions** | All destructive/financial admin actions (cancel, refund, price edit) must be logged with admin ID + timestamp. |

---

## 4. Phase-Wise Development Plan

Each phase below is written to be handed to an AI coding agent independently. Complete and verify each phase before starting the next.

---

### **PHASE 0 — Project Setup & Environment**

**Objective:** Establish the skeleton both agents and humans will build inside.

**Tasks:**
- Scaffold `frontend/` with Vite + React + Tailwind CSS + React Router
- Configure Tailwind theme with brand colors as CSS variables: Primary `#8366B0`, Secondary `#FFFFFF`, Tertiary `#26153D`
- Scaffold `api/` folder with industry-standard structure (`config/`, `auth/`, `products/`, `cart/`, `orders/`, `payments/`, `shipping/`, `admin/`, `utils/`, `vendor/`)
- Set up local MySQL, create empty database
- Configure `.env`-style config handling (`config.php` gitignored; `.env` for Vite via `import.meta.env`)
- Initialize Git repo, `.gitignore` (exclude `vendor/`, `node_modules/`, `config.php`, `.env`)
- Set up base `.htaccess` for React Router support

**Acceptance criteria:** `npm run dev` serves a blank React app; `php -S localhost:8000` serves a test PHP endpoint returning JSON; MySQL connection confirmed via a test script.

---

### **PHASE 1 — Database Schema & Core Models**

**Objective:** Build the full data layer before any UI.

**Tasks:**
- Implement schema: `users`, `categories`, `products`, `product_variants`, `product_images`, `bundles`/`combo_offers`, `orders`, `order_items`, `coupons`, `reviews` (stub), `admin_activity_log`
- Add fields to `orders` for: `payment_type` (full_prepaid / partial / cod), `amount_paid_upfront`, `amount_due_on_delivery`, `fastrr_risk_tier`, `shiprocket_order_id`, `shiprocket_awb`
- Write `schema.sql` with foreign keys and indexes on frequently filtered columns (`slug`, `status`, `email`)

**Acceptance criteria:** Schema imports cleanly into MySQL with no FK errors; seed script inserts sample categories/products for testing later phases.

---

### **PHASE 2 — Product Catalog (Frontend + API)**

**Objective:** Public-facing product browsing, fully functional against real data.

**Tasks:**
- API: `products/list.php` (with category/price filters, pagination), `products/detail.php`
- Frontend: Home page (hero, best-sellers grid, category tiles, bundle/combo section, trust strip, FAQ block — per competitor pattern), Category/listing page, Product detail page
- Implement strike-through MRP vs. sale price display, bundle/combo pricing display
- Apply brand theme (`#8366B0` primary, `#FFFFFF` secondary, `#26153D` tertiary) via Tailwind config/CSS variables set up in Phase 0 — do not hardcode hex values per component
- Mobile-first responsive layout for all above pages; sticky mobile "Buy Now" CTA bar

**Acceptance criteria:** All product data renders from the live API, not mock data; verified functional on mobile viewport first.

---

### **PHASE 3 — Cart**

**Objective:** Slide-out cart drawer (not a separate page), matching competitor UX.

**Tasks:**
- Cart Context (React) + localStorage persistence
- Slide-out drawer component: add/remove/update quantity without page navigation
- Free-shipping-threshold progress messaging in cart
- Bundle/combo logic reflected in cart totals

**Acceptance criteria:** Adding to cart from any listing/detail page opens the drawer without route change; refresh preserves cart state.

---

### **PHASE 4 — Authentication**

**Objective:** Customer accounts + admin auth foundation.

**Tasks:**
- API: `auth/register.php`, `auth/login.php` (JWT via `firebase/php-jwt`), `auth/middleware.php`
- Frontend: Login/Register pages, protected route wrapper, persisted auth state
- Separate admin login flow (distinct from customer auth), with 2FA flagged for Phase 9 hardening

**Acceptance criteria:** JWT issued on login, verified on protected endpoints, expired/invalid tokens correctly rejected with 401.

---

### **PHASE 5 — Checkout (Fastrr Integration)**

**Objective:** Custom-themed checkout wired to Fastrr's checkout engine.

**Tasks:**
- Integrate Fastrr Checkout API for address intelligence, risk tiering, and payment-split logic (full prepaid / partial / COD)
- Build custom React UI around Fastrr's engine using brand color theme (`#8366B0` / `#FFFFFF` / `#26153D`)
- PHP endpoint to receive Fastrr's order/payment confirmation callback, verify webhook signature
- Recalculate order total server-side at this stage — never trust frontend-submitted prices

**Acceptance criteria:** Order only marked `paid`/`partial` after verified webhook confirmation, never from frontend redirect alone; all three payment paths (prepaid/partial/COD) functional in Fastrr sandbox mode.

**Note:** Requires Fastrr/Shiprocket API credentials obtained beforehand — confirm custom (non-Shopify) platform support with Shiprocket before this phase begins.

---

### **PHASE 6 — Order Management & Shiprocket Shipping**

**Objective:** Post-payment order lifecycle and courier integration.

**Tasks:**
- API: `orders/create.php`, `orders/list.php` (customer-facing), Shiprocket order creation call on order confirmation
- Shiprocket tracking webhook handler — syncs shipment status back into `orders` table
- Customer-facing order tracking page (pulls live status)
- Cancellation flow: customer-initiated (pre-shipping only) and admin-initiated, with refund handling for prepaid/partial amounts

**Acceptance criteria:** Order status auto-updates from Shiprocket webhook; cancellation blocks correctly once shipped; refund amount matches what was actually collected upfront.

---

### **PHASE 7 — Email Notifications**

**Objective:** Automated lifecycle emails.

**Tasks:**
- SMTP setup via PHPMailer
- Templates + triggers: order confirmation, shipping/tracking update, cancellation confirmation, (optional) abandoned cart reminder
- Trigger points hooked into order status changes from Phases 5–6

**Acceptance criteria:** Each order state change fires the correct email exactly once (no duplicate sends on retry/webhook replay).

---

### **PHASE 8 — Admin Panel**

**Objective:** Full, end-to-end operational control panel — the admin should be able to run the entire store (catalog, orders, media, promotions, staff) without ever touching the database directly. Protected and role-based.

**Design priority note:** Unlike the storefront, this panel is **desktop-first**. Admin/staff run daily operations from a desktop computer, so tables, bulk actions, dashboards, and media upload UIs should be designed and tested for desktop screen sizes first, with tablet as a secondary breakpoint. Mobile admin layout is not a v1 priority.

**Tasks:**
- **Product & Catalog management (full control):**
  - Full CRUD on products (create/edit/delete/duplicate)
  - CSV bulk upload/export
  - Variants (size/color/material) and bundle/combo pricing config
  - Stock/inventory tracking with low-stock alerts
  - **Image AND video upload** per product — multiple images with drag-to-reorder, primary-image selection, and product video upload (e.g. short demo/try-on clips) with file type/size validation
  - Category & collection management (create/edit/reorder/assign products)
  - SEO fields per product (meta title, meta description, URL slug)
- **Order management:** filterable list (status/date/payment type/risk tier), full order detail view, manual status override, cancel/refund workflow with reason logging, bulk actions (bulk mark-as-shipped, etc.)   
- **Customer management:** full customer list, order history per customer, manual RTO-offender flagging/blocking
- **Coupons & Promotions:** code creation (%/flat, usage limits, expiry), bundle/combo management, free-shipping threshold config
- **Dashboard & Reports:** revenue/orders/AOV by date range, best-sellers, RTO/cancellation rate, payment-method split
- **Roles & Security:** role-based access (owner vs. staff — staff should not access pricing/refunds unless granted), admin activity log (who changed what, when), separate secure admin login with 2FA

**Acceptance criteria:** Every listed action has a working UI + API endpoint, with **no operation requiring direct database access** — the admin should have complete self-service control over products (including media), orders, customers, and promotions. Image and video uploads are validated server-side (type/size) and render correctly on the storefront after upload. Layout is verified on desktop viewport first; staff-role accounts cannot access price-editing or refund functions; every cancel/refund/price-edit action appears in the activity log.

---

### **PHASE 9 — Security Hardening**

**Objective:** Harden the full system given real transaction volume.

**Tasks:**
- Rate-limiting on `auth` and `payment` endpoints
- CORS locked to production domain only (remove wildcard `*`)
- Input validation/sanitization audit across all endpoints
- File upload validation (type/size) for product images
- Webhook signature verification audit (Fastrr + Shiprocket)
- HTTPS/HSTS enforcement check
- Admin 2FA implementation

**Acceptance criteria:** Security checklist (Section 5 below) fully passed before Phase 11.

---

### **PHASE 10 — SEO, Analytics & Legal Pages**

**Objective:** Launch readiness for discoverability, tracking, and compliance.

**Tasks:**
- `react-helmet-async` integration for per-page title/meta/H1
- (Optional) PHP-pre-rendered meta shell for product/category pages for stronger crawler support
- Auto-generated `sitemap.xml` (PHP script querying products/categories) + correct `robots.txt`
- GA4 integration with e-commerce event tracking (view_item, add_to_cart, begin_checkout, purchase) + manual route-change pageview tracking (required for SPAs)
- Google Search Console verification + sitemap submission
- Legal pages: Privacy Policy, Returns/Refund/Cancellation Policy, Terms of Service — covering data collected, third-party sharing (Shiprocket/Fastrr/payment gateway), retention, user rights, grievance contact

**Acceptance criteria:** All pages have unique titles/descriptions; sitemap validates and is accepted by Search Console; GA4 records real e-commerce events in DebugView.

---

### **PHASE 11 — Testing & QA**

**Objective:** End-to-end validation before deployment.

**Tasks:**
- Full checkout flow test across all three payment types in Fastrr sandbox
- Mobile/tablet/desktop responsive QA pass (mobile-first priority)
- Admin panel role-permission testing
- Load test product listing/API endpoints at expected traffic
- Security checklist final pass (Section 5)

**Acceptance criteria:** No critical bugs in checkout, order lifecycle, or admin financial actions.

---

### **PHASE 12 — Deployment & Go-Live**

**Objective:** Ship to production on Hostinger Premium.

**Tasks:**
- GitHub Actions workflow: build React app, deploy `dist/` + `api/` via FTP/SFTP to Hostinger
- Staging subdomain test before pointing live domain
- SSL verification, final `.htaccess` check
- Post-launch monitoring: PHP error logs via hPanel, backup schedule, GA4/Search Console live data check

**Acceptance criteria:** Live site fully functional end-to-end on production domain; first real test order completes successfully through to Shiprocket tracking.

---

## 5. Security Checklist (Final Gate)

- [ ] All SQL via PDO prepared statements
- [ ] Passwords hashed via `password_hash()`
- [ ] JWT secrets excluded from repo
- [ ] CORS restricted to production domain
- [ ] Admin endpoints enforce role checks server-side
- [ ] File uploads validated server-side
- [ ] HTTPS/HSTS enforced
- [ ] Order totals recalculated server-side at checkout
- [ ] Fastrr and Shiprocket webhook signatures verified
- [ ] Rate limiting on auth/payment endpoints
- [ ] Admin activity logging on all financial/destructive actions
- [ ] 2FA enabled for admin accounts

---

## 6. Open Items (Pending Before Certain Phases)

| Item | Blocks Phase | Status |
|---|---|---|
| Fastrr/Shiprocket API credentials + custom-platform confirmation | Phase 5 | Pending outreach to Shiprocket |
| Final decision: PHP meta-shell pre-render vs. pure client-side SEO | Phase 10 | Pending stakeholder decision |

---

*This SRS is intended to be uploaded module-by-module (phase-by-phase) to an AI coding assistant. Do not request all phases in a single generation — review and verify each phase's acceptance criteria before proceeding to the next, to keep generated code reviewable and aligned with this spec.*
