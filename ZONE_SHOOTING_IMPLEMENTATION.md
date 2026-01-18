# Zone-Based Shooting Session Implementation

## Overview
Implemented a zone-based shooting tracking system that divides the basketball court into 11 distinct zones. Users tap zones to record shots, and stats are tracked per zone with real-time visual feedback.

## Features

### 🎯 Interactive Court Zones
- **11 Zones**: Left Corner, Left Wing, Left Elbow, Left Paint, Free Throw, Right Paint, Right Elbow, Right Wing, Right Corner, Top of Key, Restricted Area
- **Color-Coded**: Gray (corners), Blue (left wing), Red (mid-range/paint), Orange (restricted)
- **Tap to Select**: Users tap any zone to select it for shot tracking
- **Visual Feedback**: Selected zones highlight in blue, zones with stats show in their designated colors

### 📊 Real-Time Statistics
- **Per-Zone Stats**: Each zone displays:
  - Made-Attempts (e.g., "4-8")
  - Shooting percentage (e.g., "50%")
- **Overall Stats**: Total shots, made shots, accuracy percentage, session duration
- **Best Zone**: Automatically calculated and displayed in session summary

### 🎨 Visual Design
- **Background Image**: Uses `half-court.png` as the court background
- **Transparent Overlays**: Semi-transparent colored zones overlay the court image
- **Hover Effects** (Web): Zones brighten when hovered
- **Selection Indicator**: Blue highlight and bottom banner showing selected zone name

### 💾 Data Tracking
- **Zone-Based Storage**: Each shot is stored with its zone ID
- **Zone Stats Object**: Separate stats object tracks performance per zone
- **Session Summary**: Includes best performing zone with percentage

## Implementation Details

### Web App (`Skills/src/pages/ShootingSession.jsx`)

#### Zone Definitions
```javascript
const COURT_ZONES = [
  {
    id: "left-corner",
    name: "Left Corner",
    color: "rgba(128, 128, 128, 0.5)", // Gray
    path: "M 0 50 L 0 85 L 15 100 L 32 85 L 15 50 Z",
  },
  // ... 10 more zones
];
```

#### Key State Variables
- `selectedZone`: Currently selected zone ID
- `hoveredZone`: Zone being hovered (web only)
- `zoneStats`: Object mapping zone IDs to `{ made, attempts }`
- `shots`: Array of shot objects with `{ zone, made, timestamp }`

#### Shot Recording Flow
1. User clicks a zone → `handleZoneClick(zoneId)` → Sets `selectedZone`
2. User clicks "Made" or "Miss" → `recordShot(made)` → Records shot with zone
3. `zoneStats` updates automatically
4. Zone displays updated stats (e.g., "5-10 50%")

#### Visual Rendering
- **Background**: `<img src="/images/half-court.png" />`
- **Zones**: SVG `<path>` elements with dynamic fill colors
- **Stats**: SVG `<text>` elements positioned at zone centers
- **Helpers**: `getZoneCenterX()` and `getZoneCenterY()` calculate text positions

### iOS App (`skills-ios/skills-ios/Views/ShootingSession/ShootingSessionView.swift`)

#### Zone Structure
```swift
struct CourtZone: Identifiable {
    let id: String
    let name: String
    let path: Path
    let color: Color
    
    func contains(point: CGPoint, in size: CGSize) -> Bool
}
```

#### Key Components
- **Image**: `Image("half-court")` as background
- **Canvas**: SwiftUI `Canvas` for drawing interactive zones
- **Gesture**: `DragGesture(minimumDistance: 0)` for tap detection
- **Hit Testing**: `zone.contains(point:in:)` to determine which zone was tapped

#### Shot Recording Flow
1. User taps court → `handleCourtTap(at:in:)` → Finds zone via hit testing
2. Sets `selectedZone` → Shows "Did you make the shot?" banner
3. User taps "Made" or "Missed" → `recordShot(made:)` → Records shot
4. `zoneStats` updates → Canvas redraws with new stats

#### Path Parsing
- **Helper Function**: `createPath(_ pathString: String) -> Path`
- **Supports**: M (move), L (line), Z (close) commands
- **Converts**: SVG-like path strings to SwiftUI `Path` objects

### Data Models

#### Shot Model (Both Platforms)
```swift
struct Shot {
    let id: UUID
    var x: Double      // Legacy (not used in zone mode)
    var y: Double      // Legacy (not used in zone mode)
    var made: Bool
    var zone: String?  // NEW: Zone ID
}
```

#### Zone Stats
- **Web**: `{ [zoneId: string]: { made: number, attempts: number } }`
- **iOS**: `[String: ZoneStat]` where `ZoneStat = { made: Int, attempts: Int }`

### Session Summary Enhancements

#### New "Best Zone" Feature
- Calculates highest shooting percentage across all zones
- Displays in session summary with trophy icon
- Shows zone name, made-attempts, and percentage

**Web**:
```javascript
const bestZone = Object.entries(zoneStats).reduce((best, [zoneId, stats]) => {
  const percentage = (stats.made / stats.attempts) * 100;
  if (!best || percentage > best.percentage) {
    return { name: zoneName, percentage, made: stats.made, attempts: stats.attempts };
  }
  return best;
}, null);
```

**iOS**:
```swift
private var bestZone: (name: String, percentage: Double, made: Int, attempts: Int)? {
    let best = zoneStats.max { a, b in
        let aPerc = Double(a.value.made) / Double(a.value.attempts)
        let bPerc = Double(b.value.made) / Double(b.value.attempts)
        return aPerc < bPerc
    }
    // ... format and return
}
```

## User Experience Flow

### Starting a Session
1. User sees court with overlay: "Start Your Session - Tap zones to track shots"
2. User clicks/taps "Start Session"
3. Timer starts, zones become interactive

### Recording Shots
1. User taps any zone on the court
2. Zone highlights in blue
3. Bottom banner shows: "[Zone Name] - Did you make the shot?"
4. User taps "✅ Made" or "❌ Miss"
5. Shot recorded, stats update instantly
6. Zone displays: "1-1 100%" (or updated stats)

### During Session
- **Undo**: Remove last shot (updates zone stats)
- **Pause** (Web): Pause timer
- **End Session**: Stop timer, show summary

### Session Summary
- Total shots, made shots, accuracy percentage
- Session duration
- **🏆 Best Zone**: Highest percentage zone with stats
- Options: Save Session or Discard

## Technical Highlights

### Coordinate System
- **Normalized**: All zones use 0-100 coordinate system
- **Scalable**: Zones scale to any screen size
- **Aspect Ratio**: Court maintains 1:1 aspect ratio

### Performance
- **Efficient Rendering**: Only redraws when stats change
- **Hit Testing**: O(n) where n = 11 zones (fast)
- **State Updates**: Minimal re-renders with proper state management

### Responsive Design
- **Web**: Adapts to desktop/tablet/mobile
- **iOS**: Uses GeometryReader for dynamic sizing
- **Image**: Court image scales while maintaining aspect ratio

## Files Modified

### Web App
- ✅ `Skills/src/pages/ShootingSession.jsx` - Complete rewrite with zones
- ✅ `Skills/public/images/half-court.png` - Court background image (existing)

### iOS App
- ✅ `skills-ios/skills-ios/Views/ShootingSession/ShootingSessionView.swift` - Complete rewrite
- ✅ `skills-ios/skills-ios/Assets.xcassets/half-court.imageset/` - Added court image
- ✅ `skills-ios/skills-ios/Models/ShootingSession.swift` - Already had `zone` field

### Database
- ✅ `shooting_sessions.shots_data` - Already supports zone field (JSONB)
- ✅ `shooting_sessions.zone_stats` - NEW: Stores zone statistics (JSONB)

## Testing Checklist

### Web
- [ ] Zones are clickable and highlight on selection
- [ ] Stats update correctly after recording shots
- [ ] Hover effects work on desktop
- [ ] Best zone calculates correctly
- [ ] Session saves to database with zone data
- [ ] Responsive on mobile/tablet

### iOS
- [ ] Court image displays correctly
- [ ] Tap detection works for all zones
- [ ] Stats render on zones
- [ ] Best zone shows in summary
- [ ] Session saves to Supabase
- [ ] Works on different iPhone sizes

## Future Enhancements

### Potential Features
1. **Heat Map Mode**: Color zones by shooting percentage
2. **Zone Filters**: View stats for specific zones only
3. **Historical Comparison**: Compare zone performance over time
4. **Shot Streaks**: Track consecutive makes per zone
5. **Zone Challenges**: "Make 5 shots from each corner"
6. **3D Court View**: Rotate court for different angles
7. **Shot Arc Visualization**: Show shot trajectory
8. **Zone Recommendations**: Suggest zones to practice based on weaknesses

### Technical Improvements
1. **Offline Support**: Cache sessions locally
2. **Animation**: Smooth zone transitions
3. **Sound Effects**: Audio feedback for makes/misses
4. **Haptic Feedback**: Vibration on iOS
5. **Voice Commands**: "Made from left corner"
6. **Apple Watch Integration**: Track sessions on watch

## Conclusion

The zone-based shooting system provides a structured, data-driven approach to tracking shooting performance. By dividing the court into specific zones, users can identify strengths and weaknesses, track improvement over time, and make data-informed practice decisions.

The implementation maintains consistency between web and iOS platforms while leveraging platform-specific features (Canvas on iOS, SVG on web) for optimal performance and user experience.
