// Supabase data layer - replaces localEntities.js
// Uses Supabase for all CRUD operations

import { supabase, getCurrentUser, getCurrentUserProfile } from './supabaseClient';

// =============================================
// USER ENTITY
// =============================================
export const User = {
  async me() {
    return await getCurrentUserProfile();
  },
  
  async update(id, data) {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return updated;
  }
};

// =============================================
// LESSON ENTITY
// =============================================
export const Lesson = {
  async list() {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('level', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },
  
  async get(id) {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async filter(query) {
    let queryBuilder = supabase.from('lessons').select('*');
    
    Object.entries(query).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });
    
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  }
};

// =============================================
// CHALLENGE ENTITY
// =============================================
export const Challenge = {
  async list() {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  async get(id) {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async filter(query) {
    let queryBuilder = supabase.from('challenges').select('*');
    
    Object.entries(query).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });
    
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  }
};

// =============================================
// SHOOTING SESSION ENTITY
// =============================================
export const ShootingSession = {
  async list() {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from('shooting_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  async get(id) {
    const { data, error } = await supabase
      .from('shooting_sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async create(sessionData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from('shooting_sessions')
      .insert({
        ...sessionData,
        user_id: user.id,
        date: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async filter(query) {
    const user = await getCurrentUser();
    let queryBuilder = supabase
      .from('shooting_sessions')
      .select('*')
      .eq('user_id', user.id);
    
    Object.entries(query).forEach(([key, value]) => {
      if (key !== 'user_id') {
        queryBuilder = queryBuilder.eq(key, value);
      }
    });
    
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  }
};

// =============================================
// TRAINER ENTITY
// =============================================
export const Trainer = {
  async list() {
    const { data, error } = await supabase
      .from('trainers')
      .select('*')
      .order('rating', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  async get(id) {
    const { data, error } = await supabase
      .from('trainers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async filter(query) {
    let queryBuilder = supabase.from('trainers').select('*');
    
    Object.entries(query).forEach(([key, value]) => {
      // Handle array fields (specializations)
      if (key === 'specializations') {
        queryBuilder = queryBuilder.contains(key, [value]);
      } else {
        queryBuilder = queryBuilder.eq(key, value);
      }
    });
    
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  }
};

// =============================================
// TRAINER SERVICE ENTITY
// =============================================
export const TrainerService = {
  async list() {
    const { data, error } = await supabase
      .from('trainer_services')
      .select('*');
    
    if (error) throw error;
    return data || [];
  },
  
  async get(id) {
    const { data, error } = await supabase
      .from('trainer_services')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async filter(query) {
    let queryBuilder = supabase.from('trainer_services').select('*');
    
    Object.entries(query).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });
    
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  }
};

// =============================================
// TRAINING EVENT ENTITY
// =============================================
export const TrainingEvent = {
  async list() {
    const { data, error } = await supabase
      .from('training_events')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },
  
  async get(id) {
    const { data, error } = await supabase
      .from('training_events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async filter(query) {
    let queryBuilder = supabase.from('training_events').select('*');
    
    Object.entries(query).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });
    
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  }
};

// =============================================
// REVIEW ENTITY
// =============================================
export const Review = {
  async list() {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  async get(id) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async filter(query) {
    let queryBuilder = supabase.from('reviews').select('*');
    
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
      .from('reviews')
      .insert({
        ...reviewData,
        user_id: user.id,
        date: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// =============================================
// BOOKING ENTITY
// =============================================
export const Booking = {
  async list() {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('booking_datetime', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },
  
  async get(id) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async create(bookingData) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...bookingData,
        user_id: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async filter(query) {
    const user = await getCurrentUser();
    let queryBuilder = supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id);
    
    Object.entries(query).forEach(([key, value]) => {
      if (key !== 'user_id') {
        // Handle date range queries
        if (typeof value === 'object' && value.$gte && value.$lte) {
          queryBuilder = queryBuilder
            .gte(key, value.$gte)
            .lte(key, value.$lte);
        } else {
          queryBuilder = queryBuilder.eq(key, value);
        }
      }
    });
    
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  }
};

