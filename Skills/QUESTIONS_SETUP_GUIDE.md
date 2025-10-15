# Questions System Setup Guide

This guide explains the new question-based learning system that replaces the module system.

## Overview

Each lesson can now have multiple-choice questions associated with it. Users must score at least 80% to pass a lesson.

## Database Migration

### Step 1: Run the Migration Script

In your Supabase SQL Editor, run the migration script:
```
Skills/supabase/migrations/add_lesson_questions.sql
```

This will create:
- `questions` table - stores multiple-choice questions for lessons
- `user_question_progress` table - tracks user answers to individual questions
- `user_lesson_attempts` table - tracks overall lesson attempt results

### Database Schema

#### Questions Table
- `question_text` - The question to display
- `media_type` - 'image', 'video', or 'none'
- `media_url` - URL to media file (optional)
- `option_a`, `option_b`, `option_c`, `option_d` - The four answer choices
- `correct_answer` - 'A', 'B', 'C', or 'D'
- `explanation` - Optional explanation shown after answering
- `order_index` - Order of questions in the lesson

## Admin Workflow

### Creating Questions for a Lesson

1. Navigate to **Admin Dashboard**
2. Go to the **Lessons** tab
3. Find the lesson you want to add questions to
4. Click the **Questions** button next to the lesson
5. In the Questions dialog:
   - Click **Add Question** to create a new question
   - Fill in all required fields:
     - Question text
     - Four answer options (A, B, C, D)
     - Correct answer
   - Optional fields:
     - Media type and URL (for images or videos)
     - Explanation (shown after answering)
     - Order index (for sorting questions)
6. Save the question
7. Repeat to add more questions

### Editing/Deleting Questions

- Click the **Edit** button next to any question to modify it
- Click the **Delete** button to remove a question
- Questions are displayed in order by their `order_index`

## User Experience

### Taking a Lesson Quiz

1. User selects a lesson from the Learning Path
2. Clicks "View Lesson" to see lesson details
3. Clicks "Start Lesson" to begin the quiz
4. Questions are presented one at a time
5. User selects an answer and clicks "Submit Answer"
6. After submission:
   - Correct/incorrect feedback is shown
   - Explanation is displayed (if provided)
   - User clicks "Next Question" to continue
7. After all questions:
   - Results screen shows score and pass/fail status
   - Lesson is marked complete if score >= 80%
   - User can retry if they failed, or return to learning path

### Progress Tracking

- Lessons are marked complete in localStorage if passed
- Completed lessons unlock the next lesson in the path
- All attempts are saved to the database with:
  - Total questions
  - Correct answers
  - Percentage score
  - Pass/fail status

## Features

### Question Features
- Multiple choice (A, B, C, D)
- Optional image or video media
- Explanation text for learning
- Ordered presentation

### Quiz Features
- One question at a time
- Immediate feedback
- Progress bar
- 80% passing threshold
- Retry option for failed attempts
- Results summary

### Admin Features
- Add/edit/delete questions
- Reorder questions
- View all questions for a lesson
- Question count display

## File Changes

### New Files
1. `/Skills/supabase/migrations/add_lesson_questions.sql` - Database migration
2. `/Skills/src/pages/QuestionPage.jsx` - Question quiz interface

### Modified Files
1. `/Skills/src/api/supabaseEntities.js` - Added Question, UserLessonAttempt, UserQuestionProgress entities
2. `/Skills/src/api/entities.js` - Exported new entities
3. `/Skills/src/pages/index.jsx` - Added QuestionPage route
4. `/Skills/src/pages/LessonDetail.jsx` - Updated to navigate to quiz
5. `/Skills/src/pages/AdminDashboard.jsx` - Added question management UI

## Next Steps

1. **Run the migration** in Supabase SQL Editor
2. **Add questions** to existing lessons via Admin Dashboard
3. **Test the flow**:
   - Create a lesson with 5 questions
   - Take the quiz as a user
   - Try passing (4+ correct) and failing (3 or fewer correct)
   - Verify lesson completion and unlocking

## Tips

- Start with 5-10 questions per lesson
- Include media for visual learners
- Write clear, concise questions
- Provide helpful explanations
- Test questions before publishing
- Order questions from easier to harder

## Example Question

**Question Text:**
"What is the primary purpose of court spacing in basketball?"

**Options:**
- A: To make the court look bigger
- B: To create driving lanes and passing angles
- C: To confuse the defense
- D: To practice formations

**Correct Answer:** B

**Explanation:**
"Proper court spacing (15-18 feet between players) creates driving lanes and passing angles, making it harder for defenders to help and recover."

**Media:** Optional diagram showing proper spacing

---

Need help? Check the code comments in `QuestionPage.jsx` and `AdminDashboard.jsx` for implementation details.

