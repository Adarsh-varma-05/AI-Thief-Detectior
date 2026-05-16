# AI Thief Detection Alarm

A real-time AI object detection application built with Next.js 14, Tailwind CSS, and TensorFlow.js. This application uses the device's webcam to detect objects, specifically identifying people (potential intruders) and triggering an audio alarm when a person is detected in the frame.

## Features

- Real-time webcam feed object detection
- Built-in `lite_mobilenet_v2` model from TensorFlow for lightweight browser-based detection
- Visual bounding boxes and labels for identified objects
- Specialized "Thief Detection" logic (triggers alarm when a person is detected)
- Fully responsive design with Tailwind CSS
- Highly optimized with `requestAnimationFrame` for smooth UI performance without blocking the main thread

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **AI/ML:** @tensorflow/tfjs, @tensorflow-models/coco-ssd
- **Webcam:** react-webcam
- **Utilities:** lodash (for throttling alarm sounds)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How It Works

1. The app loads a pre-trained COCO-SSD object detection model.
2. It captures the video feed from your webcam.
3. The TensorFlow model analyzes each frame and draws bounding boxes on a hidden canvas overlay.
4. If it detects a 'person', it highlights them in red and triggers an audio alarm. The alarm is throttled to avoid overlapping audio.
