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

## 🚀 Getting Started

### Prerequisites

- npm or yarn
- Webcam access

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
