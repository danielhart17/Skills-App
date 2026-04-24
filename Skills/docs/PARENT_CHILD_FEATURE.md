# Parent Login + Linked Child Athlete Feature

## Overview

This feature allows parent/guardian accounts to:
1. Link to their child athlete accounts via secure invite codes
2. Track their child's progress (IQ curriculum, workouts/drills completion, streaks/levels)
3. Go through the IQ curriculum themselves (parent has their own learning/progress)
4. Log game stats and shooting sessions for their child

> **Note on workout assignment UI:** the `workout_assignments` schema, RLS,
> RPCs, and the athlete-side "Assigned by Parent" view are in place, but the
> Parent Dashboard UI to create/lead assignments has not shipped in this PR.
> Parents currently see Progress / IQ / Game Stats / Shooting tabs only.
> Follow-up work will add the Workouts tab described below.

## Database Schema

### New Tables

#### `parent_child_links`
Links parent accounts to child athlete accounts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| parent_id | UUID | References public.profiles(id) |
| child_id | UUID | References public.profiles(id) |
| status | TEXT | 'pending', 'linked', or 'revoked' |
| created_at | TIMESTAMPTZ | When link was created |
| linked_at | TIMESTAMPTZ | When link was activated |
| revoked_at | TIMESTAMPTZ | When link was revoked |

#### `child_invite_codes`
Temporary invite codes for linking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| child_id | UUID | References public.profiles(id) |
| code | TEXT | 6-character alphanumeric code |
| expires_at | TIMESTAMPTZ | Code expiration (15 minutes) |
| used_at | TIMESTAMPTZ | When code was used |
| used_by_parent_id | UUID | References public.profiles(id) |

#### `workout_assignments`
Parent-assigned workouts for children.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| child_id | UUID | References public.profiles(id); child receiving the assignment |
| assigned_by_parent_id | UUID | References public.profiles(id); parent who assigned it |
| challenge_id | UUID | The workout/challenge |
| status | TEXT | 'assigned', 'in_progress', 'completed', 'cancelled' |
| completion_source | TEXT | 'child' or 'parent' (who marked complete) |

### Extended Tables

#### `challenge_progress`
Added columns to track parent-guided completions:

| Column | Type | Description |
|--------|------|-------------|
| completed_for_user_id | UUID | User this completion counts for |
| completed_by_user_id | UUID | User who performed the action |
| assignment_id | UUID | Related workout assignment |

### Extended Enum

The `user_role` enum now includes:
- `user` (existing)
- `trainer` (existing)
- `admin` (existing)
- `parent` (new)
- `athlete` (new - explicit alternative to 'user')

## RPC Functions

### `create_child_invite_code()`
- **Caller**: Athlete
- **Returns**: `{code: string, expires_at: timestamp}`
- **Behavior**: Generates a 6-character invite code valid for 15 minutes

### `link_parent_to_child_by_code(code TEXT)`
- **Caller**: Parent
- **Returns**: `{child_id: uuid, child_name: text, child_email: text}`
- **Behavior**: Links parent to child using valid invite code

### `complete_assigned_workout(assignment_id UUID, time_spent_seconds INT, notes TEXT)`
- **Caller**: Child or linked parent
- **Returns**: void
- **Behavior**: Completes assignment AND updates child's challenge_progress

### `get_linked_children()`
- **Caller**: Parent
- **Returns**: Table of linked children with their stats

### `get_child_progress_summary(child_id UUID)`
- **Caller**: Linked parent only
- **Returns**: Lessons completed, challenges completed, XP, level, streak, recent activity

### `revoke_parent_child_link(link_id UUID)`
- **Caller**: Parent or child
- **Behavior**: Revokes link and cancels pending assignments

## Row Level Security (RLS)

### Key Policies

1. **Parent-Child Links**
   - Parents can view/update their own links
   - Children can view/update links where they are the child

2. **Invite Codes**
   - Only children can create codes (via RPC)
   - Children can view their own codes

3. **Workout Assignments**
   - Parents can create for linked children only
   - Both parent and child can view assignments they're involved in
   - Both can update status when linked

4. **Challenge Progress**
   - Users see their own progress
   - Parents see linked children's progress
   - Progress completed for a user is visible to that user

## Frontend Components

### New Pages

1. **ParentDashboard** (`/ParentDashboard`)
   - List of linked children
   - Child progress overview
   - Game stats and shooting session logging
   - *Planned (not shipped in this PR):* workout assignment management

2. **WorkoutSession** (`/workout-session/:assignmentId`)
   - Timer and instructions
   - Completion marking
   - Works for both parent (guiding) and child (self-completion)

### Updated Pages

1. **Auth** - Role selection (Athlete vs Parent) on signup
2. **Profile** - "Link a Parent" section for athletes
3. **Challenges** - "Assigned by Parent" section for athletes
4. **Layout** - Parent-specific navigation

## How to Test Locally

### 1. Run the Migration

```bash
# In the Skills directory
cd supabase

# Apply the migration
supabase db push
# OR run the SQL directly in Supabase Dashboard > SQL Editor
```

### 2. Create Test Users

1. **Create a Parent Account**
   - Go to the app's Auth page
   - Click "Sign Up"
   - Select "Parent" role
   - Complete registration

2. **Create an Athlete Account**
   - Sign out
   - Click "Sign Up"
   - Select "Athlete" role
   - Complete registration

### 3. Link Parent to Child

1. **As Athlete**: Go to Profile → "Link a Parent" section
2. Click "Generate Invite Code"
3. Copy the 6-character code

4. **As Parent**: Go to Parent Dashboard → "Link a Child" section
5. Enter the invite code
6. Click "Link Child"

### 4. Test Workout Assignment (backend only in this PR)

The Parent Dashboard UI for assigning workouts is not yet shipped. The
backend path can still be exercised directly:

1. **As Parent**: insert a row via the `workout_assignments` table or the
   `WorkoutAssignment.create(childId, challengeId)` entity in a dev console,
   using a linked child_id.
2. **As Athlete**: go to the Workouts page; the "Assigned by Parent" section
   should show the new assignment and link to `WorkoutSession`.
3. Completing the session should call `complete_assigned_workout` and credit
   the child's `challenge_progress`.

### 5. Test Guided Workout (Parent Leading) — planned

Parent-led sessions require the Parent Dashboard "Workouts" tab UI, which is
not included in this PR. `WorkoutSession` already supports a parent-driven
flow (`isParent` branch), so enabling this only requires the dashboard UI.

### 6. Verify RLS Policies

Run the test queries in `supabase/migrations/test_parent_child_system.sql`:

```sql
-- As parent, should NOT see unlinked child progress
SELECT * FROM challenge_progress WHERE user_id = '<unlinked_child_id>';
-- Expected: 0 rows

-- As parent, SHOULD see linked child progress
SELECT * FROM challenge_progress WHERE user_id = '<linked_child_id>';
-- Expected: Progress rows visible
```

## Assumptions Made

1. **Role Selection**: Users select their role during signup. Existing users default to 'user' (athlete).

2. **Invite Code Security**: Codes expire in 15 minutes and can only be used once.

3. **Progress Ownership**: When a parent completes a workout for their child:
   - The completion is recorded in `challenge_progress` with `user_id = child_id`
   - `completed_by_user_id` tracks who did the action
   - XP and streak updates apply to the child's profile

4. **Single Progress Source**: We extend `challenge_progress` rather than creating a separate parent progress table to maintain a single source of truth.

5. **Backward Compatibility**: Existing users with role='user' are treated as athletes.

## Security Considerations

- All RPCs use `SECURITY DEFINER` with explicit validation
- RLS policies prevent unauthorized access
- Parent can only access linked children's data
- Invite codes are time-limited and single-use
- Links can be revoked by either party

## Files Changed

### New Files
- `supabase/migrations/add_parent_child_system.sql` - Database schema and RLS
- `supabase/migrations/test_parent_child_system.sql` - Verification queries
- `src/pages/ParentDashboard.jsx` - Parent dashboard UI
- `src/pages/WorkoutSession.jsx` - Guided workout session
- `docs/PARENT_CHILD_FEATURE.md` - This documentation

### Modified Files
- `src/api/supabaseEntities.js` - Added ParentChild and WorkoutAssignment entities
- `src/api/entities.js` - Exported new entities
- `src/contexts/AuthContext.jsx` - Added isParent, isAthlete helpers; role in signup
- `src/pages/Auth.jsx` - Role selection UI
- `src/pages/Profile.jsx` - Parent linking section for athletes
- `src/pages/Challenges.jsx` - Parent-assigned workouts section
- `src/pages/Layout.jsx` - Parent navigation
- `src/pages/index.jsx` - New routes
