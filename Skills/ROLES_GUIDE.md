# User Roles & Permissions Guide

This guide explains how to use the role-based access control system in the Skills app.

## 🎭 User Roles

The app supports three user roles:

### 1. **User** (Default)
- Access to all standard features
- Can view lessons, challenges, and trainers
- Can book training sessions
- Track personal progress and stats

### 2. **Trainer**
- All user features, plus:
- Access to **Trainer Dashboard**
- Create and manage custom challenges
- View all bookings for their services
- Manage trainer profile

### 3. **Admin**
- Full access to everything
- Access to **Admin Dashboard**
- Create/edit/delete lessons
- Create/edit/delete challenges  
- Manage training events
- Update user roles
- View all system users

## 🚀 Setup Instructions

### Step 1: Run the Database Migration

In your Supabase SQL Editor, run the migration script:

```bash
/supabase/migrations/add_roles.sql
```

This will:
- Add a `role` column to the `profiles` table
- Create role-based policies
- Add helper functions for permission checks

### Step 2: Create Your First Admin

After running the migration, make yourself an admin:

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

Replace `your-email@example.com` with your actual email.

### Step 3: Refresh the App

Sign out and sign back in. You should now see the **Admin Dashboard** in your navigation.

## 📋 Managing User Roles

### As an Admin

1. Navigate to **Admin Dashboard**
2. Click the **Users** tab
3. Find the user you want to update
4. Select their new role from the dropdown:
   - **User** - Standard user
   - **Trainer** - Can create challenges
   - **Admin** - Full system access

Changes take effect immediately!

## 🎓 Creating a Trainer

To create a trainer account:

### Option 1: Promote Existing User

1. Go to **Admin Dashboard** → **Users**
2. Change their role to "Trainer"
3. User should sign out and back in
4. They'll see **Trainer Dashboard** in navigation
5. They can set up their trainer profile

### Option 2: Direct Database

```sql
-- Create trainer profile
UPDATE public.profiles 
SET role = 'trainer' 
WHERE email = 'trainer-email@example.com';

-- Link to trainers table (optional, for bookings)
INSERT INTO public.trainers (user_id, name, bio, location, hourly_rate)
VALUES (
  (SELECT id FROM public.profiles WHERE email = 'trainer-email@example.com'),
  'Trainer Name',
  'Bio here',
  'City, State',
  100.00
);
```

## 🛠️ Admin Features

### Lesson Management
- Create new lessons (IQ Mode or On-Court)
- Set difficulty levels and XP rewards
- Organize by chapters
- Edit or delete existing lessons

### Challenge Management
- Create challenges for all users
- Set categories (shooting, dribbling, defense, etc.)
- Feature important challenges
- Track who created each challenge

### User Management
- View all registered users
- Update user roles
- See user stats and progress
- Manage permissions

### Events Management (Coming Soon)
- Create training events
- Manage registrations
- Set capacity limits

## 👨‍🏫 Trainer Features

### Challenge Creation
- Create custom challenges for your students
- Set difficulty and duration
- Assign XP rewards
- Mark challenges as featured

### Booking Management
- View all your upcoming bookings
- See student contact information
- Track session notes
- Manage your schedule

### Trainer Profile
- Set your bio and specializations
- Define your hourly rate
- Add your location
- Build your reputation

## 🔒 Permissions

### What Each Role Can Do

| Feature | User | Trainer | Admin |
|---------|------|---------|-------|
| View Lessons | ✅ | ✅ | ✅ |
| Create Lessons | ❌ | ❌ | ✅ |
| View Challenges | ✅ | ✅ | ✅ |
| Create Challenges | ❌ | ✅ | ✅ |
| Book Trainers | ✅ | ✅ | ✅ |
| View Own Bookings | ✅ | ✅ | ✅ |
| View All Bookings | ❌ | Own Only | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| Change Roles | ❌ | ❌ | ✅ |

## 🎯 Navigation

### Navigation Items by Role

**Standard User:**
- Home
- IQ Mode
- On-Court
- Challenges
- Shooting Session
- Trainers
- Profile

**Trainer:**
- Home
- **Trainer Dashboard** ⭐ (New)
- IQ Mode
- On-Court
- Challenges
- Shooting Session
- Trainers
- Profile

**Admin:**
- **Admin Dashboard** ⭐ (New)
- Home
- **Trainer Dashboard** ⭐ (New)
- IQ Mode
- On-Court
- Challenges
- Shooting Session
- Trainers
- Profile

Note: Admins have access to both dashboards!

## 🐛 Troubleshooting

### "I don't see the Admin/Trainer Dashboard"

1. Check your role in the database:
   ```sql
   SELECT email, role FROM public.profiles WHERE email = 'your-email@example.com';
   ```

2. Make sure you've signed out and back in after changing roles

3. Clear browser cache and reload

### "I can't create lessons/challenges"

- Lessons: You must be an **Admin**
- Challenges: You must be a **Trainer** or **Admin**

### "Permission Denied" errors

Make sure the RLS policies were created properly:

```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'lessons';
```

If policies are missing, re-run the migration script.

## 🔄 Future Enhancements

Planned features:
- [ ] Trainer analytics dashboard
- [ ] Student-trainer messaging
- [ ] Training event management
- [ ] Payment integration
- [ ] Advanced permissions (moderators, etc.)
- [ ] Bulk user management
- [ ] Content approval workflow

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify your database policies
3. Ensure you're signed in with the correct role
4. Try signing out and back in

---

**Happy coaching! 🏀**

