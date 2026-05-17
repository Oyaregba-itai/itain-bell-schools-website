# Deployment Guide - Itain Bell Schools Website

## Overview

This project is deployed on **GitHub Pages** with automated CI/CD via **GitHub Actions**. No manual deployment steps needed—just push to `main` and the site updates automatically.

## ✅ Current Deployment Status

- **Hosting:** GitHub Pages (free tier)
- **Domain:** https://itainbellschool.com/
- **Automation:** GitHub Actions (`.github/workflows/deploy.yml`)
- **Build Tool:** Vite
- **Package Manager:** Bun
- **SSL/TLS:** Let's Encrypt (auto-provisioned, auto-renewed)
- **Status:** ✅ Production-ready

## 🚀 How Deployment Works

### Automatic Deployment (Main Branch)

```
1. Developer pushes to main branch
   ↓
2. GitHub Actions webhook triggers
   ↓
3. CI/CD Pipeline:
   - Checkout code
   - Install Node 20
   - Install Bun
   - Run: bun install
   - Run: bun run build
   ↓
4. Build output (dist/) uploaded to GitHub Pages
   ↓
5. Site live at https://itainbellschool.com/ (within seconds)
```

### Manual Deployment (Rarely Needed)

If GitHub Actions fails, you can manually deploy:

```bash
# Build locally
bun run build

# The dist/ folder is ready for deployment
# GitHub Pages automatically serves this folder when you push changes
```

## 🔐 DNS Configuration

### Custom Domain Setup (Already Configured)

**Domain:** itainbellschool.com  
**Registrar:** Hostinger  
**Nameservers:** ns1.dns-parking.com, ns2.dns-parking.com

**DNS Records:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 185.199.108.153 | 14400 |
| A | @ | 185.199.109.153 | 14400 |
| A | @ | 185.199.110.153 | 14400 |
| A | @ | 185.199.111.153 | 14400 |
| CNAME | www | oyaregba-itai.github.io | 300 |

**GitHub Pages File:** `public/CNAME` (contains "itainbellschool.com")

### HTTPS/SSL Certificate

- **Provider:** Let's Encrypt (auto-provisioned by GitHub)
- **Enforcement:** Enabled in GitHub Pages settings
- **Auto-renewal:** GitHub handles automatically
- **Status:** ✅ Active and valid

## 📋 GitHub Actions Workflow

**File:** `.github/workflows/deploy.yml`

**Triggers:**
- On push to `main` branch
- On pull requests (for preview testing)

**Jobs:**

1. **build** (runs-on: ubuntu-latest)
   - Checks out code
   - Sets up Node.js 20
   - Installs Bun
   - Installs dependencies: `bun install`
   - Builds: `bun run build`
   - Uploads dist/ artifact

2. **deploy** (runs after build)
   - Deploys to GitHub Pages environment
   - Updates live site
   - Returns deployment URL

**Permissions Required:**
- `contents: read` - Access to repo code
- `pages: write` - Publish to GitHub Pages
- `id-token: write` - OpenID Connect authentication

## 🔧 Environment Variables

### Frontend Environment Variables

Located in `.env.local` (or `.env` in CI/CD):

```env
VITE_SUPABASE_URL=https://mcpajyzmdyvolpkwfmpq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:** These are `VITE_` prefixed, which means they're embedded in the client-side bundle (they're public). Use Supabase Row-Level Security (RLS) to protect data.

## 📊 GitHub Pages Settings

**Repository Settings → Pages:**

- **Build and deployment**
  - Source: Deploy from a branch
  - Branch: main
  - Folder: / (root, served from dist/)

- **Custom domain:** itainbellschool.com
- **Enforce HTTPS:** ✅ Enabled
- **DNS check:** ✅ Successful

## 🧪 Testing Before Deployment

Always test locally before pushing:

```bash
# Dev server
bun run dev

# Build
bun run build

# Unit tests
bun run test

# E2E tests
bun run test:e2e

# Preview production build
bun run preview
```

## 🔄 Rollback Process

If something goes wrong after deployment:

1. **Identify the problem**
   - Check GitHub Actions logs
   - Check site in browser

2. **Revert the commit**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **GitHub Actions redeploys**
   - The reverted code deploys automatically
   - Old version is restored

4. **Fix and redeploy**
   - Fix the issue locally
   - Push to main again

## 📈 Monitoring Deployment

### GitHub Actions Dashboard
- Go to: Repository → Actions tab
- See real-time build logs
- View deployment history

### GitHub Pages Status
- Go to: Repository → Settings → Pages
- Check DNS validation status
- See deployment history

### Site Monitoring
- Test at https://itainbellschool.com/
- Verify all pages load
- Check browser console for errors
- Test functionality (login, forms, etc.)

## 🗑️ Removing Old Hosting (Netlify)

If Netlify was previously used, it can now be safely deleted:

1. ✅ Verify GitHub Pages is working
2. ✅ Test site thoroughly
3. Delete Netlify project (no data loss—code is on GitHub, data is on Supabase)

## 🆘 Troubleshooting

### Build Fails in GitHub Actions

1. **Check logs:** Go to Actions → Latest workflow → See error message
2. **Common causes:**
   - Dependency issue: Run `bun install` locally and commit lock file
   - Build error: Fix locally with `bun run build`
   - Missing env vars: Check GitHub Actions secrets

3. **Fix and redeploy:**
   ```bash
   git push origin main
   ```

### Site Shows Old Version

1. **Clear GitHub Pages cache**
   - Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear browser cache

2. **Verify deployment**
   - Check Actions tab for successful deployment
   - Wait a few seconds and refresh

### HTTPS Issues

1. **Certificate not provisioned yet**
   - Wait 15-30 minutes after DNS validation
   - Refresh GitHub Pages settings

2. **Mixed content warnings**
   - Check for HTTP resources in production build
   - All resources should be HTTPS or relative paths

## 📚 References

- [GitHub Pages Documentation](https://docs.github.com/pages)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Vite Documentation](https://vitejs.dev/)
- [Supabase Documentation](https://supabase.com/docs)

## 🎯 Next Steps

After this deployment is stable:

1. ✅ Monitor GitHub Actions for any build failures
2. ✅ Set up monitoring/alerts (optional)
3. ✅ Document any custom deployment needs
4. ✅ Archive or delete Netlify project (safe to do now)

---

**Last Updated:** May 17, 2026  
**Deployment Method:** GitHub Pages + GitHub Actions  
**Status:** ✅ Production Ready
