# Gesture + Gaze Controlled 3D Interaction (Web)

A web-based 3D interaction demo that combines hand tracking and gaze estimation to create an immersive, futuristic user experience. Control 3D objects using hand gestures and head direction.

## 🎯 Features

- **Hand Tracking**: Real-time hand landmark detection using MediaPipe
- **Pinch Gesture**: Detect and track pinch gestures for grabbing objects
- **Gaze Estimation**: Approximate head direction tracking for object selection
- **3D Interaction**: Smooth, physics-like object manipulation in a 3D scene
- **Visual Polish**: Glow effects, smooth animations, and modern UI

## 🛠️ Tech Stack

- **Next.js 14** (App Router)
- **React Three Fiber** - React renderer for Three.js
- **Three.js** - 3D graphics library
- **MediaPipe** - Hand tracking
- **TensorFlow.js** - Face/head direction estimation
- **TypeScript** - Type safety

## 📁 Project Structure

```
gesture-gaze-3d/
├── app/
│   ├── page.tsx          # Main page component
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
│
├── components/
│   ├── Scene/
│   │   ├── CanvasScene.tsx      # Main 3D canvas
│   │   ├── InteractiveObject.tsx # 3D interactive objects
│   │   └── Lighting.tsx         # Scene lighting setup
│   │
│   ├── Vision/
│   │   ├── useWebcam.ts         # Webcam access hook
│   │   ├── useHandTracking.ts   # MediaPipe hand tracking
│   │   ├── useFaceTracking.ts   # Head direction estimation
│   │   └── VisionProvider.tsx   # Vision context provider
│   │
│   ├── Interaction/
│   │   ├── usePinchGesture.ts   # Pinch detection logic
│   │   ├── useGrabController.ts # Grab state machine
│   │   ├── GazeRayProvider.tsx  # Gaze ray calculation
│   │   ├── InteractionProvider.tsx # Interaction context
│   │   └── InteractionContext.tsx   # Object registry
│   │
│   └── UI/
│       ├── DebugPanel.tsx       # Debug information overlay
│       └── Overlay.tsx          # Loading/error overlay
│
├── lib/
│   ├── math/
│   │   ├── vectorUtils.ts       # Vector math utilities
│   │   ├── screenToWorld.ts     # Coordinate transformations
│   │   └── smoothing.ts         # Smoothing algorithms
│   │
│   └── constants.ts            # Configuration constants
│
└── types/
    ├── hand.ts                 # Hand tracking types
    ├── gaze.ts                 # Gaze estimation types
    └── interaction.ts          # Interaction state types
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Webcam access

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gesture-gaze-3d
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

5. Allow camera access when prompted

## 🎮 How to Use

1. **Allow Camera Access**: Grant permission for webcam access when prompted
2. **Look at Objects**: Move your head to aim your gaze at 3D objects - they will glow when hovered
3. **Pinch to Grab**: Make a pinch gesture (thumb and index finger together) while looking at an object to grab it
4. **Move Objects**: While pinching, move your hand to drag the object in 3D space
5. **Release**: Open your hand to release the object

### Debug Mode

Add `?debug=true` to the URL to enable the debug panel, which shows:
- FPS counter
- Hand detection status
- Gaze tracking status
- Pinch gesture state
- Real-time position data

## 🧠 Architecture Overview

### Vision Layer
- **useWebcam**: Manages webcam stream
- **useHandTracking**: MediaPipe hand landmark detection
- **useFaceTracking**: Simplified head pose estimation

### Gesture Layer
- **usePinchGesture**: Calculates pinch state from hand landmarks
- Distance threshold between thumb and index finger tips
- Temporal smoothing for stable detection

### Gaze Layer
- **GazeRayProvider**: Converts head direction to 3D ray
- Raycasting for object intersection detection

### Interaction Layer
- **useGrabController**: State machine (IDLE → HOVER → GRABBING → RELEASE)
- Coordinate mapping from screen space to 3D world space
- Smooth object movement with lerp interpolation

### 3D Layer
- **CanvasScene**: React Three Fiber canvas setup
- **InteractiveObject**: 3D meshes with hover/glow effects
- **Lighting**: Ambient, directional, and point lights

## 📐 Coordinate Mapping

The system maps hand positions from normalized screen coordinates (0-1) to 3D world space:

1. Normalized screen coordinates → NDC (-1 to 1)
2. Raycast from camera through NDC point
3. Intersect with plane at fixed Z depth
4. Map intersection point to object position

## ⚙️ Configuration

Key constants in `lib/constants.ts`:

- `PINCH_DISTANCE_THRESHOLD`: Distance threshold for pinch detection
- `GRAB_SMOOTHING`: Lerp factor for smooth object movement
- `LERP_FACTOR`: Animation smoothing factor
- `GLOW_INTENSITY`: Hover glow effect intensity

## 🎨 Visual Features

- **Dark Theme**: Futuristic dark background (#0a0a0a)
- **Glow Effects**: Objects emit colored glow on hover
- **Smooth Animations**: Lerp-based interpolation for fluid movement
- **Shadows**: Soft shadows for depth perception
- **Bloom**: Subtle emissive materials for modern look

## 🐛 Known Limitations

- Face tracking is simplified (uses center-based estimation)
- Single hand tracking only
- Desktop browser only (no mobile support)
- Requires good lighting for reliable hand detection

## 🔜 Phase B (Future Enhancements)

- MediaPipe Face Mesh integration for accurate head pose
- Kalman filter for smoother tracking
- Multi-object support with collision detection
- Performance profiling and optimization
- Raycast optimization
- Mathematical documentation

## 📝 License

This project is a demo/portfolio piece. Feel free to use as inspiration for your own projects.

## 🙏 Credits

- MediaPipe for hand tracking
- Three.js and React Three Fiber communities
- TensorFlow.js team

---

**Note**: This is a Phase A demo focused on UX and visual polish. Phase B will include more robust tracking and performance optimizations.
