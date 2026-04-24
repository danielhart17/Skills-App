// Supabase data layer - replaces localEntities.js
// Uses Supabase for all CRUD operations

import {
  supabase,
  getCurrentUser,
  getCurrentUserProfile,
} from "./supabaseClient";

// =============================================
// CHAPTER ENTITY
// =============================================
export const Chapter = {
  async list() {
    const { data, error } = await supabase
      .from("chapters")
      .select("*")
      .eq("is_active", true)
      .order("order_index");

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from("chapters")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async filter(query) {
    let queryBuilder = supabase.from("chapters").select("*");

    Object.entries(query).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });

    const { data, error } = await queryBuilder.order("order_index");

    if (error) throw error;
    return data || [];
  },
};

// =============================================
// USER ENTITY
// =============================================
export const User = {
  async me() {
    return await getCurrentUserProfile();
  },

  async update(id, data) {
    const { data: updated, error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },
};

// =============================================
// LESSON ENTITY
// =============================================
export const Lesson = {
  async list() {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .order("level", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async filter(query) {
    let queryBuilder = supabase.from("lessons").select("*");

    Object.entries(query).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },
};

// =============================================
// CHALLENGE ENTITY
// =============================================
export const Challenge = {
  async list() {
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async filter(query) {
    let queryBuilder = supabase.from("challenges").select("*");

    Object.entries(query).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },
};

// =============================================
// SHOOTING SESSION ENTITY
// =============================================
export const ShootingSession = {
  async list() {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("shooting_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from("shooting_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(sessionData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("shooting_sessions")
      .insert({
        ...sessionData,
        user_id: user.id,
        date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async filter(query) {
    const user = await getCurrentUser();
    let queryBuilder = supabase
      .from("shooting_sessions")
      .select("*")
      .eq("user_id", user.id);

    Object.entries(query).forEach(([key, value]) => {
      if (key !== "user_id") {
        queryBuilder = queryBuilder.eq(key, value);
      }
    });

    // Order by date, newest first
    queryBuilder = queryBuilder.order("date", { ascending: false });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },

  /** Save a session for a linked child (requires RLS policy for parent → child). */
  async createForChild(childId, sessionData) {
    const { data, error } = await supabase
      .from("shooting_sessions")
      .insert({
        ...sessionData,
        user_id: childId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// =============================================
// TRAINER ENTITY
// =============================================
export const Trainer = {
  async list() {
    const { data, error } = await supabase
      .from("trainers")
      .select("*")
      .order("rating", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from("trainers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async filter(query) {
    let queryBuilder = supabase.from("trainers").select("*");

    Object.entries(query).forEach(([key, value]) => {
      // Handle array fields (specializations)
      if (key === "specializations") {
        queryBuilder = queryBuilder.contains(key, [value]);
      } else {
        queryBuilder = queryBuilder.eq(key, value);
      }
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },
};

// =============================================
// TRAINER SERVICE ENTITY
// =============================================
export const TrainerService = {
  async list() {
    const { data, error } = await supabase.from("trainer_services").select("*");

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from("trainer_services")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async filter(query) {
    let queryBuilder = supabase.from("trainer_services").select("*");

    Object.entries(query).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },
};

// =============================================
// TRAINING EVENT ENTITY
// =============================================
export const TrainingEvent = {
  async list() {
    const { data, error } = await supabase
      .from("training_events")
      .select("*")
      .order("date", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from("training_events")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async filter(query) {
    let queryBuilder = supabase.from("training_events").select("*");

    Object.entries(query).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },
};

// =============================================
// REVIEW ENTITY
// =============================================
export const Review = {
  async list() {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async filter(query) {
    let queryBuilder = supabase.from("reviews").select("*");

    Object.entries(query).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },

  async create(reviewData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        ...reviewData,
        user_id: user.id,
        date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// =============================================
// BOOKING ENTITY
// =============================================
export const Booking = {
  async list() {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("booking_datetime", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(bookingData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        ...bookingData,
        user_id: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async filter(query) {
    const user = await getCurrentUser();
    let queryBuilder = supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id);

    Object.entries(query).forEach(([key, value]) => {
      if (key !== "user_id") {
        // Handle date range queries
        if (typeof value === "object" && value.$gte && value.$lte) {
          queryBuilder = queryBuilder.gte(key, value.$gte).lte(key, value.$lte);
        } else {
          queryBuilder = queryBuilder.eq(key, value);
        }
      }
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },
};

// =============================================
// QUESTION ENTITY
// =============================================
export const Question = {
  async list() {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("lesson_id", { ascending: true })
      .order("order_index", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(questionData) {
    const { data, error } = await supabase
      .from("questions")
      .insert(questionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, questionData) {
    const { data, error } = await supabase
      .from("questions")
      .update(questionData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from("questions").delete().eq("id", id);

    if (error) throw error;
    return true;
  },

  async filter(query) {
    let queryBuilder = supabase.from("questions").select("*");

    Object.entries(query).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });

    queryBuilder = queryBuilder.order("order_index", { ascending: true });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },
};

// =============================================
// USER LESSON ATTEMPT ENTITY
// =============================================
export const UserLessonAttempt = {
  async list() {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("user_lesson_attempts")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from("user_lesson_attempts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(attemptData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("user_lesson_attempts")
      .insert({
        ...attemptData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async filter(query) {
    const user = await getCurrentUser();
    let queryBuilder = supabase
      .from("user_lesson_attempts")
      .select("*")
      .eq("user_id", user.id);

    Object.entries(query).forEach(([key, value]) => {
      if (key !== "user_id") {
        queryBuilder = queryBuilder.eq(key, value);
      }
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },
};

// =============================================
// USER PROGRESS ENTITY
// =============================================
export const UserProgress = {
  async create(progressData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("user_progress")
      .upsert(
        {
          ...progressData,
          user_id: user.id,
        },
        {
          onConflict: "user_id,item_type,item_id",
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async filter(query) {
    const user = await getCurrentUser();
    let queryBuilder = supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id);

    Object.entries(query).forEach(([key, value]) => {
      if (key !== "user_id") {
        queryBuilder = queryBuilder.eq(key, value);
      }
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },

  async getCompletedLessons() {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("user_progress")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("item_type", "lesson")
      .eq("completed", true);

    if (error) throw error;
    return data?.map((item) => item.item_id) || [];
  },
};

// =============================================
// USER QUESTION PROGRESS ENTITY
// =============================================
export const UserQuestionProgress = {
  async create(progressData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("user_question_progress")
      .upsert(
        {
          ...progressData,
          user_id: user.id,
        },
        {
          onConflict: "user_id,question_id",
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async filter(query) {
    const user = await getCurrentUser();
    let queryBuilder = supabase
      .from("user_question_progress")
      .select("*")
      .eq("user_id", user.id);

    Object.entries(query).forEach(([key, value]) => {
      if (key !== "user_id") {
        queryBuilder = queryBuilder.eq(key, value);
      }
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },
};

// =============================================
// CHALLENGE RATING ENTITY
// =============================================
export const ChallengeRating = {
  async create(ratingData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("challenge_ratings")
      .insert({
        ...ratingData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      // If rating already exists, update it instead
      if (error.code === "23505") {
        return await this.update(ratingData.challenge_id, ratingData);
      }
      throw error;
    }
    return data;
  },

  async update(challengeId, ratingData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("challenge_ratings")
      .update(ratingData)
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getByChallenge(challengeId) {
    const { data, error } = await supabase
      .from("challenge_ratings")
      .select("*")
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getUserRating(challengeId) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("challenge_ratings")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async delete(ratingId) {
    const { error } = await supabase
      .from("challenge_ratings")
      .delete()
      .eq("id", ratingId);

    if (error) throw error;
    return true;
  },
};

// =============================================
// CHALLENGE PROGRESS ENTITY
// =============================================
export const ChallengeProgress = {
  async create(progressData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("challenge_progress")
      .insert({
        ...progressData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      // If progress already exists, update it instead
      if (error.code === "23505") {
        return await this.update(progressData.challenge_id, progressData);
      }
      throw error;
    }
    return data;
  },

  async update(challengeId, progressData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("challenge_progress")
      .update(progressData)
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markComplete(challengeId, timeSpent = 0, notes = "") {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("challenge_progress")
      .upsert(
        {
          user_id: user.id,
          challenge_id: challengeId,
          is_completed: true,
          completed_at: new Date().toISOString(),
          time_spent_seconds: timeSpent,
          notes: notes,
        },
        {
          onConflict: "user_id,challenge_id",
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserProgress(challengeId) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getCompletedChallenges() {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("challenge_progress")
      .select("challenge_id")
      .eq("user_id", user.id)
      .eq("is_completed", true);

    if (error) throw error;
    return data?.map((p) => p.challenge_id) || [];
  },

  async filter(query) {
    const user = await getCurrentUser();
    let queryBuilder = supabase
      .from("challenge_progress")
      .select("*")
      .eq("user_id", user.id);

    Object.entries(query).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },
};

// =============================================
// DRILL ENTITY
// =============================================
export const Drill = {
  async list() {
    const { data, error } = await supabase
      .from("drills")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from("drills")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(drillData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("drills")
      .insert({
        ...drillData,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, drillData) {
    const { data, error } = await supabase
      .from("drills")
      .update(drillData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from("drills").delete().eq("id", id);

    if (error) throw error;
    return true;
  },

  async filter(query) {
    let queryBuilder = supabase
      .from("drills")
      .select("*")
      .eq("is_active", true);

    Object.entries(query).forEach(([key, value]) => {
      if (key === "category" || key === "difficulty") {
        queryBuilder = queryBuilder.eq(key, value);
      }
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },

  async getAverageRating(drillId) {
    const { data, error } = await supabase.rpc("get_drill_average_rating", {
      p_drill_id: drillId,
    });

    if (error) throw error;
    return data || 0;
  },

  async getRatingCount(drillId) {
    const { data, error } = await supabase.rpc("get_drill_rating_count", {
      p_drill_id: drillId,
    });

    if (error) throw error;
    return data || 0;
  },
};

// =============================================
// DRILL RATING ENTITY
// =============================================
export const DrillRating = {
  async create(ratingData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("drill_ratings")
      .upsert(
        {
          ...ratingData,
          user_id: user.id,
        },
        {
          onConflict: "user_id,drill_id",
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getByDrill(drillId) {
    const { data, error } = await supabase
      .from("drill_ratings")
      .select("*")
      .eq("drill_id", drillId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getUserRating(drillId) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("drill_ratings")
      .select("*")
      .eq("drill_id", drillId)
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async delete(ratingId) {
    const { error } = await supabase
      .from("drill_ratings")
      .delete()
      .eq("id", ratingId);

    if (error) throw error;
    return true;
  },
};

// =============================================
// ENTRY EXAM ENTITY
// =============================================
export const EntryExam = {
  async getQuestions() {
    const { data, error } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("is_active", true)
      .order("difficulty")
      .order("order_index");

    if (error) throw error;
    return data || [];
  },

  async getQuestionsByDifficulty(difficulty) {
    const { data, error } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("is_active", true)
      .eq("difficulty", difficulty)
      .order("order_index");

    if (error) throw error;
    return data || [];
  },

  async hasCompletedExam() {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("entry_exam_results")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  },

  async getExamResult() {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("entry_exam_results")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async submitExamResult(resultData) {
    const user = await getCurrentUser();
    
    // Calculate rewards using the scoring logic
    const beginnerXP = resultData.beginner_correct * 10;
    const intermediateXP = resultData.intermediate_correct * 25;
    const advancedXP = resultData.advanced_correct * 50;
    const totalXP = beginnerXP + intermediateXP + advancedXP;
    
    let startingLevel = 1;
    if (totalXP <= 50) startingLevel = 1;
    else if (totalXP <= 150) startingLevel = 2;
    else if (totalXP <= 300) startingLevel = 3;
    else startingLevel = 4;

    const { data, error } = await supabase
      .from("entry_exam_results")
      .insert({
        user_id: user.id,
        ...resultData,
        starting_level: startingLevel,
        starting_xp: totalXP,
      })
      .select()
      .single();

    if (error) throw error;

    // Update user profile with starting XP and level, and mark exam as completed
    await supabase
      .from("profiles")
      .update({
        total_xp: totalXP,
        current_level: startingLevel,
        entry_exam_completed: true,
      })
      .eq("id", user.id);

    return data;
  },
};

// =============================================
// DRILL PROGRESS ENTITY
// =============================================
export const DrillProgress = {
  async create(progressData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("drill_progress")
      .upsert(
        {
          ...progressData,
          user_id: user.id,
        },
        {
          onConflict: "user_id,drill_id",
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markComplete(drillId, timeSpent = 0, notes = "") {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("drill_progress")
      .upsert(
        {
          drill_id: drillId,
          user_id: user.id,
          is_completed: true,
          completed_at: new Date().toISOString(),
          time_spent_minutes: timeSpent,
          notes: notes,
        },
        {
          onConflict: "user_id,drill_id",
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserProgress(drillId) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("drill_progress")
      .select("*")
      .eq("drill_id", drillId)
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async getCompletedDrills() {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("drill_progress")
      .select("drill_id")
      .eq("user_id", user.id)
      .eq("is_completed", true);

    if (error) throw error;
    return data?.map((item) => item.drill_id) || [];
  },

  async filter(query) {
    const user = await getCurrentUser();
    let queryBuilder = supabase
      .from("drill_progress")
      .select("*")
      .eq("user_id", user.id);

    Object.entries(query).forEach(([key, value]) => {
      if (key !== "user_id") {
        queryBuilder = queryBuilder.eq(key, value);
      }
    });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  },
};

// =============================================
// PLAYER GAME STATS (parent-logged games for children)
// =============================================

export const PlayerGameStats = {
  async list(childId) {
    if (!childId) return [];
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("player_game_stats")
      .select("*")
      .eq("parent_id", user.id)
      .eq("child_id", childId)
      .order("game_date", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(row) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("player_game_stats")
      .insert({
        ...row,
        parent_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async get(id) {
    const { data, error } = await supabase
      .from("player_game_stats")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from("player_game_stats")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};

// =============================================
// PARENT-CHILD LINKING SYSTEM
// =============================================

export const ParentChild = {
  // Create an invite code for child to share with parent
  async createInviteCode() {
    const { data, error } = await supabase.rpc("create_child_invite_code");

    if (error) throw error;
    return data?.[0] || data;
  },

  // Link parent to child using invite code
  async linkByCode(code) {
    const { data, error } = await supabase.rpc("link_parent_to_child_by_code", {
      p_code: code.toUpperCase(),
    });

    if (error) throw error;
    return data?.[0] || data;
  },

  // Get all linked children for current parent
  async getLinkedChildren() {
    const { data, error } = await supabase.rpc("get_linked_children");

    if (error) throw error;
    return data || [];
  },

  // Get progress summary for a linked child
  async getChildProgressSummary(childId) {
    const { data, error } = await supabase.rpc("get_child_progress_summary", {
      p_child_id: childId,
    });

    if (error) throw error;
    return data?.[0] || data;
  },

  // Revoke a parent-child link
  async revokeLink(linkId) {
    const { data, error } = await supabase.rpc("revoke_parent_child_link", {
      p_link_id: linkId,
    });

    if (error) throw error;
    return data;
  },

  // Get active invite codes for current child
  async getMyInviteCodes() {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("child_invite_codes")
      .select("*")
      .eq("child_id", user.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all parent links for current child
  async getMyParentLinks() {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("parent_child_links")
      .select(
        `
        *,
        parent:parent_id(id, full_name, email)
      `
      )
      .eq("child_id", user.id)
      .eq("status", "linked");

    if (error) throw error;
    return data || [];
  },
};

// =============================================
// WORKOUT ASSIGNMENTS ENTITY
// =============================================

export const WorkoutAssignment = {
  // Create a new assignment (parent assigns to child)
  async create(childId, challengeId, notes = null) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("workout_assignments")
      .insert({
        child_id: childId,
        assigned_by_parent_id: user.id,
        challenge_id: challengeId,
        notes: notes,
      })
      .select(
        `
        *,
        challenge:challenge_id(id, title, description, category, difficulty, duration_minutes, xp_reward)
      `
      )
      .single();

    if (error) throw error;
    return data;
  },

  // Get assignments created by current parent
  async getMyAssignments(status = null) {
    const user = await getCurrentUser();
    let query = supabase
      .from("workout_assignments")
      .select(
        `
        *,
        challenge:challenge_id(id, title, description, category, difficulty, duration_minutes, xp_reward),
        child:child_id(id, full_name, email)
      `
      )
      .eq("assigned_by_parent_id", user.id)
      .order("assigned_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get assignments for current child
  async getAssignedToMe(status = null) {
    const user = await getCurrentUser();
    let query = supabase
      .from("workout_assignments")
      .select(
        `
        *,
        challenge:challenge_id(id, title, description, category, difficulty, duration_minutes, xp_reward),
        parent:assigned_by_parent_id(id, full_name)
      `
      )
      .eq("child_id", user.id)
      .order("assigned_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Start an assignment
  async start(assignmentId) {
    const { data, error } = await supabase
      .from("workout_assignments")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Complete an assignment (via RPC for proper credit)
  async complete(assignmentId, timeSpentSeconds = 0, notes = null) {
    const { data, error } = await supabase.rpc("complete_assigned_workout", {
      p_assignment_id: assignmentId,
      p_time_spent_seconds: timeSpentSeconds,
      p_notes: notes,
    });

    if (error) throw error;
    return data;
  },

  // Cancel an assignment
  async cancel(assignmentId) {
    const { data, error } = await supabase
      .from("workout_assignments")
      .update({
        status: "cancelled",
      })
      .eq("id", assignmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get a single assignment by ID
  async get(assignmentId) {
    const { data, error } = await supabase
      .from("workout_assignments")
      .select(
        `
        *,
        challenge:challenge_id(id, title, description, category, difficulty, duration_minutes, xp_reward, setup, instructions, focus, equipment_needed),
        child:child_id(id, full_name, email),
        parent:assigned_by_parent_id(id, full_name)
      `
      )
      .eq("id", assignmentId)
      .single();

    if (error) throw error;
    return data;
  },
};
