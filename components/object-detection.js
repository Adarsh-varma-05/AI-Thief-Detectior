"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { load as cocoSSDLoad } from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import { renderPredictions } from "@/utils/render-predictions";
import { throttle } from "lodash";

const ObjectDetection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [statusText, setStatusText] = useState("Initializing AI System...");
  const [net, setNet] = useState(null);
  const [isSystemStarted, setIsSystemStarted] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: facingMode,
  };

  // Improved Alarm Logic with Cooldown and State Tracking
  const alarmTimeoutRef = useRef(null);
  const isAlarmPlayingRef = useRef(false);

  const triggerAlarm = useCallback(
    (isActive) => {
      if (!audioRef.current || !isSystemStarted) return;

      if (isActive) {
        // Clear any pending stop-timeout since person is detected
        if (alarmTimeoutRef.current) {
          clearTimeout(alarmTimeoutRef.current);
          alarmTimeoutRef.current = null;
        }

        // Play alarm if not already playing
        if (!isAlarmPlayingRef.current) {
          console.log("Alarm Triggered: Person detected!");
          setStatusText("⚠️ INTRUDER DETECTED!");
          if (audioRef.current.paused) {
            audioRef.current.play().catch((e) => console.log("Play failed", e));
          }
          isAlarmPlayingRef.current = true;
        }

        if (navigator.vibrate) {
          navigator.vibrate([300, 100, 300]);
        }
      } else {
        // If alarm is playing and no stop-timeout is active, schedule alarm to stop
        if (isAlarmPlayingRef.current && !alarmTimeoutRef.current) {
          console.log("No person detected, scheduling alarm stop...");
          alarmTimeoutRef.current = setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              console.log("Alarm Stopped: Room is clear");
            }
            setStatusText("Monitoring: Active");
            isAlarmPlayingRef.current = false;
            alarmTimeoutRef.current = null;
          }, 1000); // 1 second cooldown to avoid rapid audio stutter
        }
      }
    },
    [isSystemStarted],
  );

  // Main Detection Logic
  const runObjectDetection = useCallback(
    async (model) => {
      if (
        canvasRef.current &&
        webcamRef.current !== null &&
        webcamRef.current.video?.readyState === 4
      ) {
        const video = webcamRef.current.video;
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;

        try {
          const detectedObjects = await model.detect(video, undefined, 0.4);

          const context = canvasRef.current.getContext("2d");
          renderPredictions(detectedObjects, context);

          const isPersonDetected = detectedObjects.some(
            (obj) => obj.class === "person",
          );

          triggerAlarm(isPersonDetected);
        } catch (error) {
          console.error("Detection Error:", error);
        }
      }
    },
    [triggerAlarm],
  );

  // Load Model Once on Component Mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        setStatusText("Loading AI Model...");
        await tf.ready();
        const loadedNet = await cocoSSDLoad({ base: "lite_mobilenet_v2" });
        setNet(loadedNet);
        setIsLoading(false);
        setIsSystemStarted(true);
        setStatusText("Monitoring: Active");
      } catch (error) {
        console.error("AI Model Initialization Error:", error);
        setStatusText("❌ Error: Failed to start AI Model");
      }
    };

    loadModel();

    // Cleanup timeouts on unmount
    return () => {
      if (alarmTimeoutRef.current) {
        clearTimeout(alarmTimeoutRef.current);
      }
    };
  }, []);

  // Run Object Detection Loop when Armed and Model is loaded
  useEffect(() => {
    if (!isSystemStarted || !net) return;

    let detectInterval;

    const detectLoop = async () => {
      await runObjectDetection(net);
      // Run every 100ms for stable realtime detection
      detectInterval = setTimeout(detectLoop, 100);
    };

    detectLoop();

    return () => {
      if (detectInterval) {
        clearTimeout(detectInterval);
      }
    };
  }, [isSystemStarted, net, runObjectDetection]);

  const handleArmSystem = () => {
    if (audioRef.current) {
      // Prime/Unlock the audio context for mobile and desktop browsers
      audioRef.current
        .play()
        .then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsSystemStarted(true);
          setStatusText("Monitoring: Active");
        })
        .catch((e) => {
          console.error("Audio unlock failed:", e);
          setIsSystemStarted(true);
          setStatusText("⚠️ Sound might be blocked");
        });
    } else {
      setIsSystemStarted(true);
      setStatusText("Monitoring: Active");
    }

    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  const handleDisarmSystem = () => {
    setIsSystemStarted(false);
    setStatusText("System Ready. Arm to Start.");

    // Stop alarm immediately
    if (alarmTimeoutRef.current) {
      clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    isAlarmPlayingRef.current = false;

    // Clear drawings from canvas
    if (canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      context.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height,
      );
    }

    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    setStatusText("Switching Camera...");
  };

  // Silent Audio Unlock (Requirement for Mobile/Chrome on first interaction)
  useEffect(() => {
    const unlockAudio = () => {
      if (!isSystemStarted && audioRef.current) {
        handleArmSystem();
      }
    };
    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, [isSystemStarted]);

  return (
    <div className="mt-8 flex flex-col items-center w-full px-4 text-white">
      <audio ref={audioRef} src="/alarm_audio.mp3?v=2" preload="auto" loop />

      <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
        {/* Status Header */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={`flex items-center gap-4 ${isLoading ? "bg-yellow-500/20 text-yellow-400" : isSystemStarted ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"} px-8 py-4 rounded-full border-2 ${isLoading ? "border-yellow-500/50" : isSystemStarted ? "border-green-500/50" : "border-red-500/50"} font-black tracking-wide shadow-lg transition-all`}
          >
            <span className="relative flex h-4 w-4">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLoading ? "bg-yellow-400" : isSystemStarted ? "bg-green-400" : "bg-red-400"} opacity-75`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-4 w-4 ${isLoading ? "bg-yellow-500" : isSystemStarted ? "bg-green-500" : "bg-red-500"}`}
              ></span>
            </span>
            {isLoading
              ? "SYSTEM LOADING..."
              : isSystemStarted
                ? "SYSTEM ARMED & ACTIVE"
                : "SYSTEM DISARMED"}
          </div>

          <p
            className={`mt-2 font-mono text-xl ${statusText.includes("⚠️") || statusText.includes("INTRUDER") ? "text-red-500 animate-pulse font-black scale-110" : "text-gray-400"} transition-all text-center`}
          >
            {statusText}
          </p>

          <div className="flex flex-wrap gap-4 justify-center mt-2">
            {!isLoading && (
              <button
                onClick={toggleCamera}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-3 rounded-xl border border-white/10 transition-all font-bold"
              >
                🔄 Switch Camera
              </button>
            )}
          </div>
        </div>

        {/* Camera Feed */}
        <div className="relative flex justify-center items-center p-1 bg-gray-900 rounded-3xl shadow-[0_0_100px_rgba(220,38,38,0.1)] overflow-hidden border border-white/10 w-full">
          <div className="absolute inset-0 gradient opacity-10"></div>

          <div className="relative w-full aspect-video rounded-2xl overflow-hidden z-10 bg-black">
            <Webcam
              ref={webcamRef}
              className="w-full h-full object-cover"
              muted
              videoConstraints={videoConstraints}
              onUserMedia={() => setStatusText("System Active")}
              onUserMediaError={(err) => {
                console.error("Webcam Error:", err);
                setStatusText("❌ Error: Camera Access Denied");
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 z-20 w-full h-full"
            />
          </div>
        </div>

        <p className="text-gray-600 text-xs mt-4 italic">
          Automatically detecting &apos;Person&apos; in frame
        </p>
      </div>
    </div>
  );
};

export default ObjectDetection;
