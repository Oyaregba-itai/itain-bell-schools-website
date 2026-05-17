# Itain Bell Schools Website

A modern, full-stack school management and dashboard system built with React, TypeScript, and Supabase.

## 🌐 Live Site

**URL:** https://itainbellschool.com/

Hosted on **GitHub Pages** with automatic CI/CD via GitHub Actions.

## 🏗️ Tech Stack

- **Frontend:** React 18.3+ with TypeScript
- **Build Tool:** Vite 5.4.19
- **Package Manager:** Bun
- **Styling:** Tailwind CSS + PostCSS
- **UI Components:** shadcn/ui + Radix UI
- **Routing:** React Router v6 (Future Flags enabled)
- **Backend/Database:** Supabase (PostgreSQL, Auth, Storage)
- **Testing:** Vitest (unit tests), Playwright (E2E tests)
- **Hosting:** GitHub Pages (Free)
- **CI/CD:** GitHub Actions

## 🚀 Deployment

### GitHub Pages + GitHub Actions

The project is automatically deployed to GitHub Pages whenever you push to the `main` branch.

**Workflow:** `.github/workflows/deploy.yml`

**Process:**
1. Commit and push to `main`
2. GitHub Actions triggers automatically
3. Runs: `bun install` → `bun run build`
4. Uploads `dist/` artifact to GitHub Pages
5. Site updates live at https://itainbellschool.com/

**Custom Domain:** DNS records point to GitHub Pages IP addresses (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153)

## 🔧 Development Setup

### Prerequisites
- Node.js 20+ or Bun runtime
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/Oyaregba-itai/itain-bell-schools-website.git
cd itain-bell-schools-website

# Install dependencies
bun install

# Start dev server (runs on http://localhost:5173)
bun run dev

# Build for production
bun run build

# Run tests
bun run test           # Unit tests
bun run test:e2e       # E2E tests
```

## 🔐 Environment Variables

The project uses Supabase for backend services. Key environment variables (in `.env.local`):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note:** These are client-side environment variables (prefixed with `VITE_`), so they are public. Use Supabase Row-Level Security (RLS) policies to secure data.

## 📦 Supabase Integration

**Project ID:** mcpajyzmdyvolpkwfmpq (EU region: eu-west-1)

### Key Features
- **Authentication:** Email/password signup and login
- **Row-Level Security:** 9 RLS policies protect user data
- **Storage:** `profile-pictures` bucket (50MB limit, private)
- **Database:** PostgreSQL with real-time subscriptions

### RLS Policies
All policies target authenticated users and service role. See migrations for full details.

**Migration Files:**
- `supabase/migrations/20260325090325_*.sql` - Initial setup
- `supabase/migrations/20260326110204_*.sql` - Auth tables
- `supabase/migrations/20260327094427_*.sql` - RLS policies

## 📄 Project Structure

```
├── src/
│   ├── components/      # React components (UI, sections)
│   ├── pages/           # Page components (routes)
│   ├── contexts/        # React Context (Auth, etc.)
│   ├── hooks/           # Custom React hooks
│   ├── integrations/    # Supabase/Firebase setup
│   └── lib/             # Utilities
├── public/
│   ├── CNAME            # Custom domain for GitHub Pages
│   └── robots.txt
├── supabase/            # Supabase migrations & functions
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Actions CI/CD
└── README.md
```

## ✅ Running Tests

```bash
# Unit tests with Vitest
bun run test

# E2E tests with Playwright
bun run test:e2e

# Run with coverage
bun run test:coverage
```

## 🔗 Related Services

- **GitHub Repository:** https://github.com/Oyaregba-itai/itain-bell-schools-website
- **Supabase Dashboard:** https://supabase.com/dashboard
- **GitHub Pages Settings:** https://github.com/Oyaregba-itai/itain-bell-schools-website/settings/pages

## 📝 License

TODO: Add license information

## 👨‍💻 Contributing

TODO: Add contribution guidelines
