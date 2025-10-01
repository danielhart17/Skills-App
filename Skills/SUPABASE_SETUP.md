# Supabase Setup Guide for Skills

This guide will help you set up Supabase as the backend for Skills.

## 🚀 Quick Start

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/sign in
2. Click **"New Project"**
3. Fill in your project details:
   - **Name**: Skills (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"** and wait for it to initialize (~2 minutes)

### 2. Run the Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the entire contents of `/supabase/schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. You should see a success message

### 3. Seed the Database with Mock Data

1. Still in SQL Editor, create another **"New Query"**
2. Copy the contents of `/supabase/seed.sql`
3. Paste and **"Run"**
4. Verify data was inserted by running:
   ```sql
   SELECT * FROM public.lessons;
   SELECT * FROM public.trainers;
   ```

### 4. Get Your API Keys

1. Go to **Settings** → **API** (in left sidebar)
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### 5. Configure Your App

1. In your Skills project, create a file named `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Open `.env.local` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 6. Install Dependencies

```bash
npm install
```

### 7. Start the App

```bash
npm run dev
```

## 🔐 Create Your First User

### Option 1: Using the App

1. Open the app at `http://localhost:5173`
2. Click **"Sign Up"** on the auth screen
3. Enter your email, password, and full name
4. Check your email for verification link
5. Click the link to verify
6. Sign in with your credentials

### Option 2: Manual Creation (for testing)

1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Click **"Add user"**
3. Choose **"Create new user"**
4. Fill in:
   - **Email**: your-email@example.com
   - **Password**: your-password
   - **Auto Confirm User**: ✅ (for testing)
5. Click **"Create user"**

### Add User Data

After creating a user, you need to populate their profile with the demo data:

1. Go to **SQL Editor**
2. First, get your user ID:
   ```sql
   SELECT id, email FROM auth.users;
   ```
3. Copy your user ID (a UUID like `123e4567-e89b-12d3-a456-426614174000`)
4. Run this, replacing `YOUR_USER_ID`:
   ```sql
   -- Update the profile
   INSERT INTO public.profiles (id, email, full_name, current_level, total_xp, current_streak, longest_streak)
   VALUES 
     ('YOUR_USER_ID'::uuid, 'your-email@example.com', 'Your Name', 5, 1250, 7, 14)
   ON CONFLICT (id) DO UPDATE SET
     current_level = 5,
     total_xp = 1250,
     current_streak = 7,
     longest_streak = 14;

   -- Add demo shooting sessions
   INSERT INTO public.shooting_sessions (user_id, date, total_shots, made_shots, duration_seconds)
   VALUES
     ('YOUR_USER_ID'::uuid, NOW() - INTERVAL '1 day', 50, 35, 1200),
     ('YOUR_USER_ID'::uuid, NOW() - INTERVAL '2 days', 40, 28, 900);
   ```

## 🎨 Customize Row Level Security (Optional)

The schema includes RLS policies for security. You can modify them in **Authentication** → **Policies**.

Current setup:
- ✅ Users can only see/edit their own data (sessions, bookings, progress)
- ✅ Public data is readable by everyone (lessons, trainers, challenges)
- ✅ Authenticated users can create reviews and bookings

## 📊 Database Tables

Your database now has these tables:

### User Data
- `profiles` - User profiles and stats
- `shooting_sessions` - Shooting practice records
- `bookings` - Trainer bookings
- `user_progress` - Lesson/challenge completion

### Content
- `lessons` - IQ Mode and On-Court lessons
- `challenges` - Skill challenges
- `trainers` - Trainer profiles
- `trainer_services` - Services offered by trainers
- `training_events` - Group training events
- `reviews` - Trainer reviews

## 🔧 Troubleshooting

### "Missing environment variables" error
- Make sure `.env.local` exists in the project root
- Check that both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart your dev server after creating/editing `.env.local`

### "User not found" or data not showing
- Verify you're signed in (check browser console)
- Make sure your user ID matches the data in the database
- Check RLS policies are properly configured

### Authentication errors
- Verify email confirmation if required
- Check Supabase Dashboard → Authentication → Users
- Try signing out and back in

### Database query errors
- Check SQL Editor → History for failed queries
- Verify all tables were created (look in Table Editor)
- Make sure seed data was inserted

## 🚀 Next Steps

1. **Customize the mock data** in `seed.sql` to match your needs
2. **Add more trainers, lessons, or challenges** via SQL or create admin UI
3. **Set up email templates** in Supabase for auth emails
4. **Configure storage** for profile images and uploads (if needed)
5. **Add Edge Functions** for complex operations (payments, AI features, etc.)

## 📚 Useful Supabase Features

### Realtime (for live updates)
```javascript
// Subscribe to changes
supabase
  .channel('bookings')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'bookings' 
  }, payload => {
    console.log('Booking changed:', payload)
  })
  .subscribe()
```

### Storage (for images)
```javascript
// Upload profile image
const { data, error } = await supabase
  .storage
  .from('avatars')
  .upload('user-id/avatar.png', file)
```

### Edge Functions (serverless functions)
- Process payments with Stripe
- Send notifications
- Generate AI content
- Complex business logic

## 🔗 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

---

Need help? Check the [Supabase Discord](https://discord.supabase.com) or [GitHub Discussions](https://github.com/supabase/supabase/discussions).

