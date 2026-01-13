# Basketball Court Zone Map

## Visual Layout

```
HOOP/BASELINE (TOP)
┌─────────────────────────────────────────────────────┐
│ Left    │  Left Wing  │  Restricted  │ Right Wing │  Right  │
│ Corner  │   (Blue)    │    (Red)     │   (Red)    │ Corner  │
│ (Gray)  │             │              │            │ (Gray)  │
├─────────┴─────────────┴──────────────┴────────────┴─────────┤
│                                                               │
│                   Top of Key (Red)                           │
│                                                               │
├───────────────────────┬──────────────┬────────────────────────┤
│                       │  Free Throw  │                       │
│      Left Mid         │    (Red)     │      Right Mid        │
│       (Red)           │              │        (Red)          │
│                       ├──────────────┤                       │
│                       │              │                       │
│                       │ Left/Right   │                       │
│                       │  Baseline    │                       │
│                       │   (Red)      │                       │
└───────────────────────┴──────────────┴────────────────────────┘
HALF-COURT LINE (BOTTOM)
```

## Zone Details

### 1. Left Corner (Gray)
- **Location**: Far left at baseline/hoop
- **Type**: Corner three-pointers, baseline shots
- **Path**: Left corner from baseline
- **Color**: Gray (rgba(128, 128, 128, 0.5))

### 2. Left Wing (Blue)
- **Location**: Left side near baseline
- **Type**: Wing shots, elbow jumpers
- **Path**: Left of restricted area, near baseline
- **Color**: Blue (rgba(59, 130, 246, 0.5))

### 3. Restricted Area (Red)
- **Location**: Center at baseline/under hoop
- **Type**: Close-range shots, layups, paint shots
- **Path**: Central paint area under basket
- **Color**: Red (rgba(239, 68, 68, 0.5))

### 4. Right Wing (Red)
- **Location**: Right side near baseline
- **Type**: Wing shots, elbow jumpers
- **Path**: Right of restricted area, near baseline
- **Color**: Red (rgba(239, 68, 68, 0.5))

### 5. Right Corner (Gray)
- **Location**: Far right at baseline/hoop
- **Type**: Corner three-pointers, baseline shots
- **Path**: Right corner from baseline
- **Color**: Gray (rgba(128, 128, 128, 0.5))

### 6. Top of Key (Red)
- **Location**: Middle section, above restricted area
- **Type**: Mid-range shots, top of key
- **Path**: Above paint, below free throw area
- **Color**: Red (rgba(239, 68, 68, 0.5))

### 7. Free Throw (Red)
- **Location**: Center, at free throw line
- **Type**: Free throw line shots
- **Path**: Free throw circle area
- **Color**: Red (rgba(239, 68, 68, 0.5))

### 8. Left Mid (Red)
- **Location**: Left side, mid-range area
- **Type**: Mid-range jump shots
- **Path**: Left side extending toward half-court
- **Color**: Red (rgba(239, 68, 68, 0.5))

### 9. Right Mid (Red)
- **Location**: Right side, mid-range area
- **Type**: Mid-range jump shots
- **Path**: Right side extending toward half-court
- **Color**: Red (rgba(239, 68, 68, 0.5))

### 10. Left Baseline (Red)
- **Location**: Left center, below free throw
- **Type**: Baseline mid-range
- **Path**: Left of center, lower area
- **Color**: Red (rgba(239, 68, 68, 0.5))

### 11. Right Baseline (Red)
- **Location**: Right center, below free throw
- **Type**: Baseline mid-range
- **Path**: Right of center, lower area
- **Color**: Red (rgba(239, 68, 68, 0.5))

## Zone Statistics Display

When a zone has recorded shots, it displays:

```
┌─────────────┐
│   4-8       │  ← Made-Attempts
│   50%       │  ← Shooting Percentage
└─────────────┘
```

## Color Legend

- 🟠 **Orange**: Restricted area (close range)
- 🔴 **Red**: Mid-range and paint areas
- 🔵 **Blue**: Left wing three-point area
- ⚫ **Gray**: Corner three-point areas
- 🔵 **Bright Blue**: Selected zone (when tapped)
- ⚪ **White/Transparent**: Zones with no shots

## Shot Type Classification

### Close Range (0-5 feet)
- Restricted Area

### Mid-Range (5-23 feet)
- Left Elbow
- Right Elbow
- Left Paint
- Right Paint
- Free Throw
- Top of Key (inside arc)

### Three-Point Range (23+ feet)
- Left Corner
- Right Corner
- Left Wing
- Right Wing
- Top of Key (outside arc)

## Example Session Stats

```
Session: 20 shots, 12 made (60%)

Zone Breakdown:
┌──────────────────┬──────────┬──────────┬────────────┐
│ Zone             │ Attempts │ Made     │ Percentage │
├──────────────────┼──────────┼──────────┼────────────┤
│ Left Corner      │ 3        │ 2        │ 67%        │
│ Left Wing        │ 4        │ 3        │ 75%        │ ← Best Zone
│ Left Elbow       │ 2        │ 1        │ 50%        │
│ Free Throw       │ 3        │ 2        │ 67%        │
│ Right Paint      │ 2        │ 1        │ 50%        │
│ Right Wing       │ 3        │ 2        │ 67%        │
│ Right Corner     │ 2        │ 1        │ 50%        │
│ Restricted Area  │ 1        │ 0        │ 0%         │
└──────────────────┴──────────┴──────────┴────────────┘

🏆 Best Zone: Left Wing (75%)
```

## Coordinate System

All zones use a normalized 0-100 coordinate system:
- **X-axis**: 0 (left baseline) to 100 (right baseline)
- **Y-axis**: 0 (baseline/hoop) to 100 (half court line)

Example zone path:
```
"M 0 50 L 0 85 L 15 100 L 32 85 L 15 50 Z"
│   │    │   │    │  │     │  │    │  │    │
│   │    │   │    │  │     │  │    │  │    └─ Close path
│   │    │   │    │  │     │  │    │  └─ Y: 50
│   │    │   │    │  │     │  │    └─ X: 15
│   │    │   │    │  │     │  └─ Y: 85
│   │    │   │    │  │     └─ X: 32
│   │    │   │    │  └─ Y: 100
│   │    │   │    └─ X: 15
│   │    │   └─ Y: 85
│   │    └─ X: 0
│   └─ Y: 50
└─ Move to X: 0
```

## Usage Tips

1. **Start with corners**: Corners are easier to shoot from (shorter three-point distance)
2. **Practice weak zones**: Focus on zones with low percentages
3. **Balance practice**: Try to get at least 5 shots from each zone
4. **Track progress**: Compare zone stats across multiple sessions
5. **Set goals**: Aim for 50%+ from mid-range, 40%+ from three-point zones

## Integration with App

### Web App
- Zones are SVG `<path>` elements overlaid on court image
- Click zone → Highlight → Record shot → Update stats
- Hover effects show zone boundaries

### iOS App
- Zones are SwiftUI `Path` objects rendered in `Canvas`
- Tap zone → Highlight → Record shot → Update stats
- Hit testing determines which zone was tapped

### Database
```json
{
  "shots_data": [
    { "zone": "left-corner", "made": true, "timestamp": "..." },
    { "zone": "free-throw", "made": false, "timestamp": "..." }
  ],
  "zone_stats": {
    "left-corner": { "made": 2, "attempts": 3 },
    "free-throw": { "made": 1, "attempts": 2 }
  }
}
```
