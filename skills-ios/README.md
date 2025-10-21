# Skills iOS App

A native iOS basketball training application built with SwiftUI, featuring IQ Mode lessons, shooting tracking, challenges, trainer booking, and more.

## 📱 Features

### Core Features
- ✅ **User Authentication** - Sign up, sign in, and session management via Supabase
- ✅ **Home Dashboard** - View stats, XP, streaks, and quick actions
- ✅ **IQ Mode** - Basketball theory lessons with interactive quizzes
- ✅ **Challenges & Drills** - Practice drills and skill challenges
- ✅ **Shooting Tracker** - Interactive court with shot tracking and analytics
- ✅ **Trainer Booking** - Find trainers, view profiles, and book sessions
- ✅ **Profile** - View stats, progress, and manage account
- ⏳ **Events** - Training events with registration (in progress)
- ⏳ **Admin Dashboard** - Content management (planned)
- ⏳ **Trainer Dashboard** - Trainer-specific features (planned)

### Technical Features
- Modern SwiftUI architecture
- Supabase backend integration
- Real-time data synchronization
- Offline-capable design
- Clean MVVM architecture
- Reusable components

## 🛠 Tech Stack

- **Framework**: SwiftUI (iOS 16+)
- **Language**: Swift 5.0
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Architecture**: MVVM with ObservableObject
- **Networking**: URLSession with async/await
- **State Management**: @StateObject, @Published

## 📦 Project Structure

```
skills-ios/
├── Models/                    # Data models
│   ├── User.swift
│   ├── Lesson.swift
│   ├── Challenge.swift
│   ├── Trainer.swift
│   ├── Event.swift
│   ├── Question.swift
│   ├── Drill.swift
│   ├── ShootingSession.swift
│   └── Booking.swift
├── Services/                  # API and business logic
│   ├── SupabaseClient.swift  # Core Supabase client
│   ├── AuthService.swift     # Authentication service
│   └── APIService.swift      # Data fetching service
├── Views/                     # SwiftUI views
│   ├── Auth/
│   │   └── AuthView.swift
│   ├── Home/
│   │   └── HomeView.swift
│   ├── IQMode/
│   │   └── IQModeView.swift
│   ├── Lessons/
│   │   ├── LessonDetailView.swift
│   │   └── QuestionView.swift
│   ├── Challenges/
│   │   └── ChallengesView.swift
│   ├── Drills/
│   │   └── DrillDetailView.swift
│   ├── Trainers/
│   │   ├── TrainersView.swift
│   │   └── TrainerDetailView.swift
│   ├── ShootingSession/
│   │   └── ShootingSessionView.swift
│   ├── Profile/
│   │   └── ProfileView.swift
│   └── MainTabView.swift
├── Config.swift               # Configuration constants
└── skills_iosApp.swift        # App entry point
```

## 🚀 Getting Started

### Prerequisites

- Xcode 15.0 or later
- iOS 16.0+ deployment target
- Active Supabase project

### Setup

1. **Open the Project**
   ```bash
   cd /Users/danielhart/Desktop/Skills-App/skills-ios
   open skills-ios.xcodeproj
   ```

2. **Configure Supabase**
   
   Edit `Config.swift` and add your Supabase credentials:
   ```swift
   static let supabaseURL = "https://your-project.supabase.co"
   static let supabaseAnonKey = "your-anon-key-here"
   ```

3. **Build and Run**
   - Select a simulator or device
   - Press `Cmd + R` to build and run

### Database Setup

The iOS app connects to the same Supabase database as the web app. Ensure you have:

1. Run all migrations from `/Skills/supabase/migrations/`
2. Seeded the database with initial data
3. Configured RLS policies

See `/Skills/SUPABASE_SETUP.md` for detailed instructions.

## 📝 Features Detail

### Authentication
- Email/password sign up and sign in
- Automatic session management
- Profile creation on sign up
- Role-based access (user, trainer, admin)

### IQ Mode
- Browse lessons by chapter
- Filter lessons by difficulty
- Take interactive quizzes
- Track progress and completion
- Earn XP for passing lessons

### Shooting Tracker
- Interactive basketball court
- Tap to record shots
- Real-time stats (percentage, made/total)
- Session timer
- Save sessions to database
- View shooting history

### Challenges & Drills
- Browse challenges and drills
- Filter by category and difficulty
- View detailed instructions
- Mark drills as complete
- Track time spent

### Trainers
- Browse available trainers
- View trainer profiles and ratings
- See specializations and certifications
- Book training sessions
- View trainer services and pricing

### Profile
- View user stats (Level, XP, Streaks)
- Shooting statistics
- Recent session history
- Sign out

## 🔧 Configuration

### Stripe Integration (Optional)
To enable event payments, add your Stripe key to `Config.swift`:
```swift
static let stripePublishableKey = "pk_test_your_key_here"
```

### Environment Variables
All configuration is in `Config.swift`:
- Supabase URL and keys
- Stripe keys
- API endpoints

## 🎨 Design

The app follows iOS Human Interface Guidelines with:
- Native iOS navigation patterns
- SF Symbols for icons
- System colors with custom accents
- Dark mode support (automatic)
- Accessibility features
- Responsive layouts

### Color Scheme
- **Primary**: Orange (`Color.orange`)
- **Success**: Green
- **Error**: Red
- **Warning**: Yellow
- **Info**: Blue

## 📊 Data Flow

```
User Action
    ↓
View (SwiftUI)
    ↓
Service Layer (APIService, AuthService)
    ↓
Supabase Client (SupabaseClient)
    ↓
Supabase Backend
    ↓
PostgreSQL Database
```

## 🔐 Security

- Supabase handles authentication
- JWT tokens for API requests
- Row Level Security (RLS) on database
- Secure credential storage
- HTTPS for all requests

## 🐛 Known Issues

- Events view not yet implemented
- Admin dashboard pending
- Trainer dashboard pending
- No offline mode (requires internet connection)

## 🚀 Future Enhancements

- [ ] Events view with Stripe payments
- [ ] Admin dashboard for content management
- [ ] Trainer dashboard for booking management
- [ ] Push notifications
- [ ] Offline mode with local caching
- [ ] Social features (friends, leaderboards)
- [ ] Video playback for lessons
- [ ] Advanced shooting analytics
- [ ] Export/share shooting sessions

## 📱 Requirements

- iOS 16.0+
- iPhone or iPad
- Internet connection

## 🤝 Contributing

This is a private project. For issues or feature requests, contact the development team.

## 📄 License

Private - All rights reserved

## 📞 Support

For technical support or questions:
- Check the documentation in `/Skills/` directory
- Review Supabase setup guides
- Contact the development team

---

**Built with ❤️ for basketball players everywhere** 🏀

