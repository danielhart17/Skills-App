// Local data layer to replace Base44 SDK
// Mimics the Base44 entity API structure

import { mockData } from './mockData';

// Helper function to simulate async operations
const asyncDelay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to generate unique IDs
let idCounter = 1000;
const generateId = (prefix) => `${prefix}_${Date.now()}_${idCounter++}`;

// User entity
export const User = {
  async me() {
    await asyncDelay();
    return { ...mockData.user };
  },
  
  async update(id, data) {
    await asyncDelay();
    Object.assign(mockData.user, data);
    return { ...mockData.user };
  }
};

// Lesson entity
export const Lesson = {
  async list() {
    await asyncDelay();
    return [...mockData.lessons];
  },
  
  async get(id) {
    await asyncDelay();
    return mockData.lessons.find(l => l.id === id) || null;
  },
  
  async filter(query) {
    await asyncDelay();
    return mockData.lessons.filter(lesson => {
      return Object.entries(query).every(([key, value]) => lesson[key] === value);
    });
  }
};

// Challenge entity
export const Challenge = {
  async list() {
    await asyncDelay();
    return [...mockData.challenges];
  },
  
  async get(id) {
    await asyncDelay();
    return mockData.challenges.find(c => c.id === id) || null;
  },
  
  async filter(query) {
    await asyncDelay();
    return mockData.challenges.filter(challenge => {
      return Object.entries(query).every(([key, value]) => challenge[key] === value);
    });
  }
};

// ShootingSession entity
export const ShootingSession = {
  async list() {
    await asyncDelay();
    return [...mockData.shootingSessions];
  },
  
  async get(id) {
    await asyncDelay();
    return mockData.shootingSessions.find(s => s.id === id) || null;
  },
  
  async create(data) {
    await asyncDelay();
    const newSession = {
      id: generateId('session'),
      user_id: mockData.user.id,
      date: new Date().toISOString(),
      ...data
    };
    mockData.shootingSessions.unshift(newSession);
    return newSession;
  },
  
  async filter(query) {
    await asyncDelay();
    return mockData.shootingSessions.filter(session => {
      return Object.entries(query).every(([key, value]) => session[key] === value);
    });
  }
};

// Trainer entity
export const Trainer = {
  async list() {
    await asyncDelay();
    return [...mockData.trainers];
  },
  
  async get(id) {
    await asyncDelay();
    return mockData.trainers.find(t => t.id === id) || null;
  },
  
  async filter(query) {
    await asyncDelay();
    return mockData.trainers.filter(trainer => {
      return Object.entries(query).every(([key, value]) => {
        if (Array.isArray(trainer[key])) {
          return trainer[key].includes(value);
        }
        return trainer[key] === value;
      });
    });
  }
};

// TrainerService entity
export const TrainerService = {
  async list() {
    await asyncDelay();
    return [...mockData.trainerServices];
  },
  
  async get(id) {
    await asyncDelay();
    return mockData.trainerServices.find(s => s.id === id) || null;
  },
  
  async filter(query) {
    await asyncDelay();
    return mockData.trainerServices.filter(service => {
      return Object.entries(query).every(([key, value]) => service[key] === value);
    });
  }
};

// TrainingEvent entity
export const TrainingEvent = {
  async list() {
    await asyncDelay();
    return [...mockData.trainingEvents];
  },
  
  async get(id) {
    await asyncDelay();
    return mockData.trainingEvents.find(e => e.id === id) || null;
  },
  
  async filter(query) {
    await asyncDelay();
    return mockData.trainingEvents.filter(event => {
      return Object.entries(query).every(([key, value]) => event[key] === value);
    });
  }
};

// Review entity
export const Review = {
  async list() {
    await asyncDelay();
    return [...mockData.reviews];
  },
  
  async get(id) {
    await asyncDelay();
    return mockData.reviews.find(r => r.id === id) || null;
  },
  
  async filter(query) {
    await asyncDelay();
    return mockData.reviews.filter(review => {
      return Object.entries(query).every(([key, value]) => review[key] === value);
    });
  },
  
  async create(data) {
    await asyncDelay();
    const newReview = {
      id: generateId('review'),
      date: new Date().toISOString(),
      ...data
    };
    mockData.reviews.unshift(newReview);
    return newReview;
  }
};

// Booking entity
export const Booking = {
  async list() {
    await asyncDelay();
    return [...mockData.bookings];
  },
  
  async get(id) {
    await asyncDelay();
    return mockData.bookings.find(b => b.id === id) || null;
  },
  
  async create(data) {
    await asyncDelay();
    const newBooking = {
      id: generateId('booking'),
      created_at: new Date().toISOString(),
      status: 'confirmed',
      ...data
    };
    mockData.bookings.push(newBooking);
    return newBooking;
  },
  
  async filter(query) {
    await asyncDelay();
    return mockData.bookings.filter(booking => {
      return Object.entries(query).every(([key, value]) => {
        // Handle date range queries
        if (typeof value === 'object' && value.$gte && value.$lte) {
          const bookingDate = new Date(booking[key]);
          const startDate = new Date(value.$gte);
          const endDate = new Date(value.$lte);
          return bookingDate >= startDate && bookingDate <= endDate;
        }
        return booking[key] === value;
      });
    });
  }
};

