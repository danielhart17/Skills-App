# Skills - Basketball Training Platform

A modern basketball training app built with Vite + React, featuring IQ Mode (theory), On-Court training, challenges, and trainer booking.

## 🚀 Quick Start

### Option 1: With Supabase (Full Backend)

```bash
# 1. Install dependencies
npm install

# 2. Set up Supabase (see SUPABASE_SETUP.md for detailed instructions)
cp env.example .env.local
# Add your Supabase URL and API key to .env.local

# 3. Run development server
npm run dev
```

### Option 2: With Mock Data (No Backend Required)

If you want to run with mock data (no Supabase), temporarily switch entities:

1. Edit `src/api/entities.js`
2. Change imports from `./supabaseEntities` to `./localEntities`
3. Run `npm run dev`

The app will be available at `http://localhost:5173`

## 📦 What's Changed

**Migrated to Supabase**: This app was originally built with Base44, then migrated to local mock data, and now uses Supabase for:
- ✅ **Authentication** - Email/password auth with session management
- ✅ **Database** - PostgreSQL with Row Level Security
- ✅ **Real-time Updates** - Live data synchronization (optional)
- ✅ **Storage** - File uploads (ready to implement)

### New Architecture

- **Local Data Layer**: All data is now managed locally (see `src/api/mockData.js`)
- **No Authentication Required**: Instant development without API dependencies
- **Mock Entities**: Full CRUD operations with simulated async behavior
- **Easy Migration Path**: Structure mirrors backend APIs for easy integration later

## 🎯 Current Features

### Data & State
- **Mock Data**: Realistic sample data for all entities
- **Local Entities**: Full CRUD operations for:
  - User profiles
  - Lessons (IQ Mode & On-Court)
  - Challenges
  - Trainers & Services
  - Bookings
  - Shooting Sessions
  - Reviews

### Pages
- **Home**: Dashboard with stats, streaks, and quick actions
- **IQ Mode**: Basketball theory and strategic lessons
- **On-Court**: Physical training drills and skills
- **Challenges**: Shooting challenges and trainer-created drills
- **Trainers**: Browse and book training sessions
- **Profile**: User stats, achievements, and progress
- **Shooting Session**: Interactive court tracking

## 🔧 Project Structure

```
src/
├── api/
│   ├── entities.js        # Entity exports (uses local data)
│   ├── localEntities.js   # Local CRUD operations
│   ├── mockData.js        # Sample data
│   └── integrations.js    # Integration placeholders
├── components/ui/         # Shadcn UI components
├── pages/                 # Application pages
└── utils/                 # Utility functions
```

## 🔄 Migrating to Real Backend

When you're ready to connect to a real backend:

1. **Update `src/api/localEntities.js`** to call your API
2. **Replace mock data** with API endpoints
3. **Add authentication** if needed
4. **Keep the same API structure** for minimal changes

Example:
```javascript
// Before (local)
export const User = {
  async me() {
    return { ...mockData.user };
  }
};

// After (API)
export const User = {
  async me() {
    const response = await fetch('/api/users/me');
    return response.json();
  }
};
```

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Routing**: React Router v7
- **UI**: Shadcn UI + Radix UI
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Charts**: Recharts
- **Date**: date-fns

## 🗄️ Supabase Backend

Skills uses Supabase for a complete backend solution:

### Features Implemented
- ✅ **User Authentication** - Email/password with automatic profile creation
- ✅ **Row Level Security** - Users can only access their own data
- ✅ **Database Tables** - Lessons, Trainers, Challenges, Bookings, Sessions, Reviews
- ✅ **Auto-calculated Fields** - Shooting percentages, trainer ratings
- ✅ **Relationships** - Foreign keys and cascading deletes

### Setup Instructions
📖 **See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for complete setup guide

Quick setup:
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run `/supabase/schema.sql` in SQL Editor
3. Run `/supabase/seed.sql` to add mock data
4. Add your credentials to `.env.local`
5. Sign up in the app to create your user account

## 📝 Development Notes

### Adding New Data
Edit `src/api/mockData.js` to add more sample data for testing.

### Adding New Entities
1. Add data to `mockData.js`
2. Create CRUD methods in `localEntities.js`
3. Export from `entities.js`

### Integration Placeholders
The `integrations.js` file has placeholders for:
- LLM/AI features
- Email notifications
- File uploads
- Image generation

Implement these when needed with your preferred services.

## 🐛 Troubleshooting

### App won't start
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Data not showing
Check browser console for errors and verify mock data in `src/api/mockData.js`

## 📄 License

Private - All rights reserved