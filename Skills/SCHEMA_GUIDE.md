# Database Schema Guide - Chapter/Module System

## Overview

This guide explains the hierarchical learning structure and progress tracking system in the Skills app.

## 📚 Hierarchy Structure

```
Chapters (e.g., "Fundamentals", "Defense", "Offense")
    └── Lessons (e.g., "Understanding Court Spacing")
            └── Modules (e.g., "Intro Video", "Court Spacing Quiz")
```

## 🗄️ Database Tables

### 1. **chapters**
Represents overarching learning topics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Chapter name (unique) - e.g., "Fundamentals" |
| `description` | TEXT | Chapter overview |
| `mode` | TEXT | Either 'iq' or 'oncourt' |
| `order_index` | INTEGER | Display order |
| `icon` | TEXT | Icon identifier or URL |
| `estimated_time` | INTEGER | Total time in minutes |
| `total_xp` | INTEGER | Total XP available |
| `is_active` | BOOLEAN | Whether chapter is visible |

**Example:**
```sql
{
  "id": "uuid-123",
  "title": "Fundamentals",
  "mode": "iq",
  "order_index": 1,
  "estimated_time": 120,
  "total_xp": 500
}
```

---

### 2. **lessons** (Updated)
Individual lessons within chapters.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `chapter_id` | UUID | Foreign key to chapters |
| `title` | TEXT | Lesson name |
| `description` | TEXT | Lesson overview |
| `mode` | TEXT | 'iq' or 'oncourt' |
| `chapter` | TEXT | Legacy field (kept for compatibility) |
| `difficulty` | TEXT | beginner/intermediate/advanced |
| `level` | INTEGER | Difficulty level |
| `order_index` | INTEGER | Order within chapter |
| `estimated_time` | INTEGER | Time in minutes |
| `xp_reward` | INTEGER | Total XP for completing lesson |
| `is_active` | BOOLEAN | Whether lesson is visible |

**Example:**
```sql
{
  "id": "uuid-456",
  "chapter_id": "uuid-123",
  "title": "Understanding Court Spacing",
  "order_index": 1,
  "estimated_time": 15,
  "xp_reward": 50
}
```

---

### 3. **modules** (New)
Individual learning units within lessons.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `lesson_id` | UUID | Foreign key to lessons |
| `title` | TEXT | Module name |
| `description` | TEXT | Module overview |
| `module_type` | TEXT | video/quiz/reading/interactive/practice |
| `order_index` | INTEGER | Order within lesson |
| `content` | JSONB | Module-specific content (see below) |
| `estimated_time` | INTEGER | Time in minutes |
| `xp_reward` | INTEGER | XP for completing module |
| `passing_score` | INTEGER | Required % score for quizzes |
| `is_required` | BOOLEAN | Must complete to finish lesson |

**Content Field Examples:**

**Video Module:**
```json
{
  "video_url": "https://...",
  "duration_seconds": 300,
  "thumbnail": "https://...",
  "transcript": "..."
}
```

**Quiz Module:**
```json
{
  "questions": [
    {
      "id": 1,
      "question": "What is proper court spacing?",
      "type": "multiple_choice",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "B",
      "explanation": "..."
    }
  ]
}
```

---

## 📊 Progress Tracking Tables

### 4. **chapter_progress**
Tracks user progress through entire chapters.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | Foreign key to profiles |
| `chapter_id` | UUID | Foreign key to chapters |
| `started_at` | TIMESTAMP | When chapter was first accessed |
| `last_accessed_at` | TIMESTAMP | Most recent access |
| `completed_lessons` | INTEGER | Number of lessons completed |
| `total_lessons` | INTEGER | Total lessons in chapter |
| `completion_percentage` | DECIMAL | % complete (0-100) |
| `total_xp_earned` | INTEGER | XP earned in this chapter |
| `is_completed` | BOOLEAN | All lessons complete |
| `completed_at` | TIMESTAMP | When chapter was completed |

**Auto-calculated:** Progress automatically updates when lessons are completed.

---

### 5. **lesson_progress**
Tracks user progress through individual lessons.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | Foreign key to profiles |
| `lesson_id` | UUID | Foreign key to lessons |
| `chapter_id` | UUID | Foreign key to chapters |
| `started_at` | TIMESTAMP | When lesson was first accessed |
| `last_accessed_at` | TIMESTAMP | Most recent access |
| `completed_modules` | INTEGER | Number of modules completed |
| `total_modules` | INTEGER | Total modules in lesson |
| `completion_percentage` | DECIMAL | % complete (0-100) |
| `xp_earned` | INTEGER | XP earned in this lesson |
| `is_completed` | BOOLEAN | All required modules complete |
| `completed_at` | TIMESTAMP | When lesson was completed |

**Auto-calculated:** Progress automatically updates when modules are completed.

---

### 6. **module_progress**
Tracks detailed progress for individual modules.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | Foreign key to profiles |
| `module_id` | UUID | Foreign key to modules |
| `lesson_id` | UUID | Foreign key to lessons |
| `started_at` | TIMESTAMP | When module was first accessed |
| `last_accessed_at` | TIMESTAMP | Most recent access |
| `time_spent_seconds` | INTEGER | Total time spent |
| `attempts` | INTEGER | Number of attempts (for quizzes) |
| `is_completed` | BOOLEAN | Module completed |
| `completed_at` | TIMESTAMP | When completed |
| **Quiz-specific:** |
| `score` | DECIMAL | Percentage score (0-100) |
| `answers` | JSONB | User's quiz answers |
| **Video-specific:** |
| `video_progress_seconds` | INTEGER | Current playback position |
| `video_watched_percentage` | DECIMAL | % of video watched |

---

## 🔄 Automatic Progress Updates

The schema includes **database triggers** that automatically:

1. **Module → Lesson:** When a module is completed, the lesson progress updates
2. **Lesson → Chapter:** When a lesson is completed, the chapter progress updates
3. **XP Calculation:** XP is automatically summed from completed modules

**Example Flow:**
```
User completes "Court Spacing Video" module
    ↓
Trigger updates lesson_progress
    ↓
If all modules in lesson complete → marks lesson as complete
    ↓
Trigger updates chapter_progress
    ↓
If all lessons in chapter complete → marks chapter as complete
```

---

## 📝 Example Queries

### Get User's Chapter Progress
```sql
SELECT 
  c.title as chapter_name,
  cp.completion_percentage,
  cp.completed_lessons,
  cp.total_lessons,
  cp.total_xp_earned
FROM chapter_progress cp
JOIN chapters c ON c.id = cp.chapter_id
WHERE cp.user_id = 'user-uuid'
ORDER BY c.order_index;
```

### Get All Lessons in a Chapter with Progress
```sql
SELECT 
  l.title as lesson_name,
  l.order_index,
  COALESCE(lp.completion_percentage, 0) as progress,
  COALESCE(lp.is_completed, false) as completed
FROM lessons l
LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = 'user-uuid'
WHERE l.chapter_id = 'chapter-uuid'
ORDER BY l.order_index;
```

### Get All Modules in a Lesson with Progress
```sql
SELECT 
  m.title as module_name,
  m.module_type,
  m.order_index,
  COALESCE(mp.is_completed, false) as completed,
  mp.score,
  mp.video_watched_percentage
FROM modules m
LEFT JOIN module_progress mp ON mp.module_id = m.id AND mp.user_id = 'user-uuid'
WHERE m.lesson_id = 'lesson-uuid'
ORDER BY m.order_index;
```

---

## 🚀 Migration Steps

1. **Run the migration:**
   ```sql
   -- In Supabase SQL Editor, run:
   -- Skills/supabase/migrations/add_chapter_module_system.sql
   ```

2. **Existing data is preserved:**
   - Chapters are automatically created from existing lesson chapter names
   - Lessons are linked to new chapter records
   - Old `chapter` TEXT field is kept for backward compatibility

3. **Update your application code:**
   - Use new `chapter_id` instead of `chapter` text field
   - Create/update modules when creating lessons
   - Use progress tables instead of localStorage

---

## 💡 Benefits

✅ **Granular Progress Tracking** - Track completion at chapter, lesson, and module levels  
✅ **Flexible Content** - Support videos, quizzes, readings, interactive modules  
✅ **Automatic Calculations** - Progress and XP update automatically via triggers  
✅ **Detailed Metrics** - Track time spent, quiz scores, video watch progress  
✅ **Scalable** - Easy to add new module types or progress metrics  
✅ **Type Safety** - Structured JSONB content with validation  

---

## 🔐 Security

All progress tables have **Row Level Security (RLS)** policies:
- Users can only view/modify their own progress
- Chapters and modules are publicly readable
- Only admins can create/modify chapters and modules

---

## 📌 Next Steps

1. Run the migration in Supabase
2. Create module records for existing lessons
3. Update frontend to use new progress tracking system
4. Remove localStorage-based progress tracking
5. Add module creation UI for admins

