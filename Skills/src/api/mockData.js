// Mock data to replace Base44 entities
// This allows you to develop the app without Base44 dependencies

// Mock User data
const mockUser = {
  id: "user_001",
  email: "demo@Skills.app",
  full_name: "Demo Player",
  current_level: 5,
  total_xp: 1250,
  current_streak: 7,
  longest_streak: 14,
  created_at: new Date().toISOString(),
};

// Mock Lessons
const mockLessons = [
  {
    id: "lesson_001",
    title: "Understanding Court Spacing",
    description: "Learn the fundamentals of proper court spacing in basketball",
    mode: "iq",
    chapter: "Fundamentals",
    difficulty: "beginner",
    level: 1,
    estimated_time: 10,
    xp_reward: 50,
  },
  {
    id: "lesson_002",
    title: "Pick and Roll Defense",
    description: "Master defensive strategies for pick and roll situations",
    mode: "iq",
    chapter: "Defense",
    difficulty: "intermediate",
    level: 3,
    estimated_time: 15,
    xp_reward: 75,
  },
  {
    id: "lesson_003",
    title: "Ball Handling Drills",
    description: "Improve your dribbling with these essential drills",
    mode: "oncourt",
    chapter: "Skills",
    difficulty: "beginner",
    level: 1,
    estimated_time: 20,
    xp_reward: 60,
  },
];

// Mock Challenges
const mockChallenges = [
  {
    id: "challenge_001",
    title: "Perfect Form Shooter",
    description: "Make 50 shots with perfect shooting form",
    category: "shooting",
    difficulty: "beginner",
    duration_minutes: 20,
    xp_reward: 100,
    equipment_needed: ["Basketball", "Hoop"],
    is_featured: false,
    trainer_id: null,
  },
  {
    id: "challenge_002",
    title: "Elite Ball Handler",
    description: "Complete advanced dribbling drills without losing control",
    category: "dribbling",
    difficulty: "advanced",
    duration_minutes: 30,
    xp_reward: 150,
    equipment_needed: ["Basketball", "Cones"],
    is_featured: true,
    trainer_id: "trainer_001",
  },
];

// Mock Trainers
const mockTrainers = [
  {
    id: "trainer_001",
    name: "Coach Mike Johnson",
    bio: "Former NBA player with 15 years of coaching experience",
    specializations: ["shooting", "offense"],
    years_experience: 15,
    location: "Los Angeles, CA",
    profile_image: "https://ui-avatars.com/api/?name=Mike+Johnson&size=200",
    verified: true,
    hourly_rate: 100,
    rating: 4.8,
  },
  {
    id: "trainer_002",
    name: "Sarah Williams",
    bio: "College basketball coach specializing in defensive fundamentals",
    specializations: ["defense", "fundamentals"],
    years_experience: 10,
    location: "New York, NY",
    profile_image: "https://ui-avatars.com/api/?name=Sarah+Williams&size=200",
    verified: true,
    hourly_rate: 85,
    rating: 4.9,
  },
];

// Mock Trainer Services
const mockTrainerServices = [
  {
    id: "service_001",
    trainer_id: "trainer_001",
    name: "1-on-1 Shooting Session",
    description: "Personalized shooting technique and form improvement",
    price: 100,
    duration_minutes: 60,
  },
  {
    id: "service_002",
    trainer_id: "trainer_001",
    name: "Group Skills Training",
    description: "Small group training for offensive skills",
    price: 150,
    duration_minutes: 90,
  },
  {
    id: "service_003",
    trainer_id: "trainer_002",
    name: "Defensive Fundamentals",
    description: "Master the basics of lockdown defense",
    price: 85,
    duration_minutes: 60,
  },
];

// Mock Shooting Sessions
const mockShootingSessions = [
  {
    id: "session_001",
    user_id: "user_001",
    date: new Date(Date.now() - 86400000).toISOString(),
    total_shots: 50,
    made_shots: 35,
    shooting_percentage: 70,
    duration_seconds: 1200,
  },
  {
    id: "session_002",
    user_id: "user_001",
    date: new Date(Date.now() - 172800000).toISOString(),
    total_shots: 40,
    made_shots: 28,
    shooting_percentage: 70,
    duration_seconds: 900,
  },
];

// Mock Bookings
const mockBookings = [];

// Mock Training Events
const mockTrainingEvents = [
  {
    id: "event_001",
    trainer_id: "trainer_001",
    title: "Saturday Skills Camp",
    date: new Date(Date.now() + 86400000 * 3).toISOString(),
    location: "LA Sports Center",
    price: 50,
    spots_available: 12,
  },
];

// Mock Reviews
const mockReviews = [
  {
    id: "review_001",
    trainer_id: "trainer_001",
    user_name: "John D.",
    rating: 5,
    comment: "Excellent coach! Really helped improve my shooting form.",
    date: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    id: "review_002",
    trainer_id: "trainer_001",
    user_name: "Emily R.",
    rating: 5,
    comment: "Very knowledgeable and patient. Highly recommend!",
    date: new Date(Date.now() - 1209600000).toISOString(),
  },
];

export const mockData = {
  user: mockUser,
  lessons: mockLessons,
  challenges: mockChallenges,
  trainers: mockTrainers,
  trainerServices: mockTrainerServices,
  shootingSessions: mockShootingSessions,
  bookings: mockBookings,
  trainingEvents: mockTrainingEvents,
  reviews: mockReviews,
};
