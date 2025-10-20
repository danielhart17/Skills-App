# Vercel Deployment Fix - Rollup Module Error

## 🐛 Problem

Vercel deployment was failing with this error:
```
Error: Cannot find module @rollup/rollup-linux-x64-gnu
```

This is a known npm issue with optional dependencies in Rollup when building on Linux environments (like Vercel's build servers).

## ✅ Solution Applied

### 1. Created `.npmrc` Configuration

Added `/Skills/.npmrc` with:
```
shamefully-hoist=true
strict-peer-dependencies=false
auto-install-peers=true
```

This ensures npm properly installs all dependencies including optional ones.

### 2. Created `vercel.json` Configuration

Added `/vercel.json` (in project root) with:
```json
{
  "buildCommand": "cd Skills && npm ci && npm run build",
  "outputDirectory": "Skills/dist",
  "installCommand": "cd Skills && npm ci",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Key points:**
- Uses `npm ci` instead of `npm install` for clean, reproducible builds
- Properly navigates to the `Skills` directory
- Sets correct output directory for the built files
- Includes rewrite rules for React Router to work properly

### 3. Added Postinstall Script

Updated `package.json` to include:
```json
"postinstall": "npm rebuild rollup"
```

This rebuilds Rollup after installation to ensure native binaries are properly compiled for the target platform.

## 📋 Files Modified

1. **Created:** `/Skills/.npmrc`
2. **Created:** `/vercel.json`
3. **Modified:** `/Skills/package.json` (added postinstall script)

## 🚀 Deployment Steps

1. **Commit the changes:**
   ```bash
   git add .
   git commit -m "Fix Vercel deployment - Rollup module error"
   git push origin main
   ```

2. **Vercel will automatically:**
   - Detect the new configuration
   - Use `npm ci` for a clean install
   - Rebuild Rollup with correct native binaries
   - Build your project successfully

3. **Verify deployment:**
   - Check Vercel dashboard for successful build
   - Test the deployed app URL
   - Verify React Router navigation works (thanks to rewrites)

## 🔍 Why This Works

- **`.npmrc`**: Ensures npm handles peer dependencies and hoisting correctly
- **`npm ci`**: Provides a clean, reproducible install from package-lock.json
- **`npm rebuild rollup`**: Recompiles native modules for the Linux build environment
- **Rewrites**: Ensures all routes are handled by React Router (SPA behavior)

## 🎯 Expected Result

Your Vercel deployment should now:
- ✅ Install dependencies without errors
- ✅ Build successfully with Vite
- ✅ Deploy to production
- ✅ Handle all React Router routes correctly

## 📝 Additional Notes

- The `vercel.json` is in the **root** directory (`/vercel.json`), not in `/Skills/`
- The `.npmrc` is in the **Skills** directory (`/Skills/.npmrc`)
- Make sure your Vercel project settings point to the correct root directory

## 🆘 If Issues Persist

If you still encounter issues:

1. **Clear Vercel build cache:**
   - Go to Vercel Dashboard → Your Project → Settings → General
   - Scroll to "Build & Development Settings"
   - Clear the build cache

2. **Check Node version:**
   - Vercel uses Node.js 20.x by default
   - You can specify a version in `package.json`:
     ```json
     "engines": {
       "node": ">=18.0.0"
     }
     ```

3. **Verify environment variables:**
   - Make sure all required env vars are set in Vercel Dashboard
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY`

---

**Deployment should now work! 🎉**

