# 🏀 Skillz App - Quick Start Guide

This is a fresh clone of your Skills basketball training app with all permissions issues fixed!

## 🚀 Setup (First Time Only)

Run the setup script to fix npm cache permissions and install dependencies:

```bash
cd /Users/danielhart/Desktop/Skillz-App/Skillz
./setup.sh
```

**What the script does:**
1. Fixes npm cache permissions (requires your password once)
2. Cleans npm cache
3. Installs all dependencies with proper settings

## 🎯 Start Development Server

After setup is complete:

```bash
npm run dev
```

The app will be available at: `http://localhost:5173`

## 📝 What's Included

✅ **All source code** from Skills app  
✅ **Supabase integration** (database, auth, storage)  
✅ **Environment variables** (`.env.local` already configured)  
✅ **Database schema & seed data** (`supabase/` folder)  
✅ **Proper file permissions** (no sudo required!)  

## 🗄️ Database Setup

If you haven't set up Supabase yet:

1. See `SUPABASE_SETUP.md` for detailed instructions
2. Your Supabase credentials are already in `.env.local`
3. Run the SQL scripts in your Supabase dashboard:
   - First: `supabase/schema.sql`
   - Then: `supabase/seed.sql`

## 🔧 Available Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📁 Project Structure

```
Skillz/
├── src/
│   ├── api/          # Supabase client & entities
│   ├── components/   # UI components
│   ├── contexts/     # React contexts (Auth)
│   ├── pages/        # App pages
│   └── utils/        # Utility functions
├── supabase/
│   ├── schema.sql    # Database schema
│   └── seed.sql      # Sample data
└── .env.local        # Supabase credentials
```

## 🐛 Troubleshooting

### If npm install fails:
```bash
npm cache clean --force
npm install --legacy-peer-deps
```

### If dev server won't start:
```bash
rm -rf node_modules .vite
npm install --legacy-peer-deps
npm run dev
```

### Permission errors:
All files are owned by you (`danielhart`) - no sudo should be needed!
If you encounter permission issues, check file ownership:
```bash
ls -la
```

## 🎨 Features

- **IQ Mode**: Basketball theory and strategy lessons
- **On-Court**: Physical training drills and skills
- **Challenges**: Skill challenges and practice library
- **Trainers**: Find and book professional coaches
- **Profile**: Track your stats and progress
- **Shooting Session**: Interactive court tracking

---

**Ready to ball? Run `./setup.sh` to get started!** 🏀

