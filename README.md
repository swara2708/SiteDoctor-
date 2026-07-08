# SiteDoctor+
> Know if your website is healthy AND trustworthy.

SiteDoctor+ is a next-generation web audit and monitoring platform designed to evaluate websites through two distinct lenses: technical SEO health and content trustworthiness. While traditional tools focus entirely on metadata and loading speeds, SiteDoctor+ bridges the gap between search discoverability and user credibility, helping SaaS founders, creators, and webmasters ensure their sites actually win customer trust.

The application leverages high-performance AI models to analyze visible page content. By parsing the main text body, it checks for red flags like generic AI-generated filler copy, clickbait statements, and missing author attributions. Simultaneously, it evaluates structural SEO indices like heading Hierarchies, description metadata, and page title compliance.

To complete the diagnostic picture, the scanning pipeline employs Vision AI models to inspect visual assets, flagging lazy placeholders, low-resolution media, and generic stock photos that degrade design quality. Audit reports are saved securely, displayed in interactive charts, and sent directly to user inboxes as score drop alerts when website credibility indicators degrade.

---

## 🛠 Tech Stack

*   **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v3, Lucide React
*   **Database & Auth**: Supabase (PostgreSQL, GoTrue Authentication, Row-Level Security policies)
*   **Charts & Visuals**: Recharts (responsive line, bar, and pie/donut configurations)
*   **Server Middleware**: Vite Dev Server Connect Middleware (acts as a secure, CORS-bypassing proxy backend)
*   **AI Orchestration**: Groq Chat Completions API
    *   *Text Audits*: `llama-3.3-70b-versatile`
    *   *Vision Audits*: `llama-3.2-11b-vision-preview`
*   **Notifications**: Resend REST API (styled transaction emails)
*   **Deployment Hosting**: Vercel

---

## 🚀 Features

1.  **Secure Authentication**: Fully guarded routes. Logged-in sessions are tracked via Supabase auth context hooks, redirecting users away from auth pages to secure dashboards.
2.  **Website CRUD Management**: Monitor multiple web properties. Includes inline URL validation, custom modal nickname editors, and cascading deletions of historical scans.
3.  **Parallel Scanning Pipeline**: Bypasses browser CORS rules by utilizing a secure backend proxy. Extractors parse HTML to retrieve page metadata, headings, clean text bodies, and image references.
4.  **Groq Vision Auditing**: Automatically resolves relative image paths to absolute URLs, filters inline data URIs, and runs parallel Groq Vision calls on page images to flag stock media, placeholders, or broken elements.
5.  **Interactive Analytics**: Dynamic dashboard aggregating data across all user websites. Features filters to display historical line graphs, comparative SEO vs Trust bar charts, and issue severity donut charts.
6.  **Transactional Email Alerts**: Toggleable email report settings stored in user profiles. Transmits styled reports on scan completion and sends critical alerts if a site's health index drops by 10 points or more.

---

## 📸 Screenshots

*Placeholders for interface screenshots:*
*   **Landing Page**: `![Landing Page](https://placehold.co/800x450/0f172a/10b981?text=Landing+Page)`
*   **Auth Pages**: `![Login and Signup](https://placehold.co/800x450/0f172a/f59e0b?text=Auth+Pages)`
*   **Dashboard & Sites Grid**: `![Dashboard CRUD](https://placehold.co/800x450/0f172a/10b981?text=Dashboard+Sites+List)`
*   **Image Flag Collapsibles**: `![Vision Details](https://placehold.co/800x450/0f172a/ef4444?text=Vision+Flags+Details)`
*   **Analytics Panel**: `![Visualizations](https://placehold.co/800x450/0f172a/38bdf8?text=Analytics+Charts)`
*   **Email Alert Template**: `![Alert Email](https://placehold.co/800x450/0f172a/cbd5e1?text=Resend+Alert+Template)`

---

## ⚙️ Setup Instructions

### Prerequisites
*   Node.js (v18 or higher)
*   npm (v9 or higher)

### 1. Clone & Install
```bash
git clone <your-repository-url>
cd itrproject
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory by copying the example:
```bash
cp .env.example .env
```
Fill in the credentials in `.env`:
*   `VITE_SUPABASE_URL`: Your Supabase Project API URL.
*   `VITE_SUPABASE_ANON_KEY`: Your Supabase Project anonymous token.
*   `VITE_GROQ_API_KEY`: Your Groq Console API Key (requires access to Llama 3.3 and Llama 3.2 Vision).
*   `VITE_RESEND_API_KEY`: Your Resend Email API token.

### 3. Run Locally
```bash
npm run dev
```
Open `http://localhost:5173/` in your browser.

---

## 📁 Folder Structure

```
itrproject/
├── .env.example
├── supabase_schema.sql                 # Baseline Database schema (profiles, sites, scans)
├── supabase_schema_patch_resend.sql    # Schema patch for notification preferences column
├── vite.config.ts                      # Vite configurations & server-side API middleware
└── src/
    ├── App.tsx                         # Core Router configuration
    ├── index.css                       # Global Tailwind CSS system styling
    ├── components/
    │   ├── ui/                         # shadcn-compatible custom interface elements
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx
    │   │   └── input.tsx
    │   ├── ProtectedRoute.tsx          # Guards for private pages
    │   ├── PublicRoute.tsx             # Redirects for guests
    │   └── Sidebar.tsx                 # Shared dashboard sidebar (collapses to header on mobile)
    ├── hooks/
    │   └── useAuth.tsx                 # Auth context provider & hooks
    ├── lib/
    │   ├── supabaseClient.ts           # Type-safe Supabase configuration
    │   └── utils.ts                    # Class name merging helpers
    └── pages/
        ├── LandingPage.tsx             # Marketing and value prop page
        ├── LoginPage.tsx               # Credentials signing
        ├── SignupPage.tsx              # Account registration
        ├── DashboardPage.tsx           # Site monitors list & CRUD operations
        ├── AnalyticsPage.tsx           # Visual graphs dashboard
        └── SettingsPage.tsx            # Alert toggles & preferences
```

---

## 🗄 Database Schema Overview

The Supabase PostgreSQL database is structured around three core tables linked with foreign keys:

### 1. `profiles`
Tracks user settings and metadata.
*   `id` (uuid, references `auth.users`, Primary Key)
*   `email` (text, not null)
*   `full_name` (text, nullable)
*   `email_notifications` (boolean, default true) - Controls if the user receives email reports.
*   `created_at` (timestamp, default `now()`)

### 2. `sites`
Stores the website domains registered under each account.
*   `id` (uuid, Primary Key, default `gen_random_uuid()`)
*   `user_id` (uuid, references `auth.users`, not null) - Tracks ownership.
*   `url` (text, not null) - Target website.
*   `nickname` (text, nullable) - Display alias.
*   `created_at` (timestamp, default `now()`)

### 3. `scans`
Holds the history of audits run against website properties.
*   `id` (uuid, Primary Key, default `gen_random_uuid()`)
*   `site_id` (uuid, references `sites.id`, cascade delete) - Links back to the site.
*   `seo_score` (integer) - Raw technical check.
*   `trust_score` (integer) - Credibility parameter.
*   `combined_score` (integer) - Weighted average (40% SEO, 60% Trust).
*   `seo_report` (jsonb) - Issues array (issue, severity, fix suggestions).
*   `trust_report` (jsonb) - Trust flags array (flag title, explanations).
*   `image_flags` (jsonb) - Image audit results (looks_like_stock_photo, relevance, quality).
*   `scanned_at` (timestamp, default `now()`)
