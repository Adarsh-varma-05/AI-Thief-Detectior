"use client";

import React, {useEffect, useRef, useState, useCallback, useMemo} from "react";
import Webcam from "react-webcam";
import {load as cocoSSDLoad} from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import {renderPredictions} from "@/utils/render-predictions";
import { throttle } from "lodash";

let detectInterval;

const ObjectDetection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [statusText, setStatusText] = useState("Initializing System...");
  const [net, setNet] = useState(null);
  const [isSystemStarted, setIsSystemStarted] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: facingMode,
  };

  // Memoize throttled alarm function to avoid ESLint warnings and performance issues
  const playAlarm = useMemo(
    () =>
      throttle(() => {
        if (audioRef.current && isSystemStarted) {
          audioRef.current.currentTime = 0;
          audioRef.current.volume = 1.0;
          
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => {
              console.log("Audio play failed. Need user interaction.", e);
              setStatusText("⚠️ TAP SCREEN TO ENABLE AUDIO");
            });
          }
          
          if (navigator.vibrate) {
            navigator.vibrate([500, 200, 500]);
          }
        }
      }, 2000),
    [isSystemStarted]
  );

  // Main Detection Logic
  const runObjectDetection = useCallback(async (model) => {
    if (
      canvasRef.current &&
      webcamRef.current !== null &&
      webcamRef.current.video?.readyState === 4
    ) {
      canvasRef.current.width = webcamRef.current.video.videoWidth;
      canvasRef.current.height = webcamRef.current.video.videoHeight;

      const detectedObjects = await model.detect(
        webcamRef.current.video,
        undefined,
        0.4
      );

      const context = canvasRef.current.getContext("2d");
      renderPredictions(detectedObjects, context);

      const isPersonDetected = detectedObjects.some(
        (obj) => obj.class === "person"
      );

      if (isPersonDetected) {
        setStatusText("⚠️ INTRUDER DETECTED!");
        playAlarm();
      } else {
        setStatusText("Monitoring: No Person Found");
      }
    }
  }, [playAlarm]);

  // Auto-start system on mount
  useEffect(() => {
    const initSystem = async () => {
      try {
        await tf.ready();
        const loadedNet = await cocoSSDLoad({ base: "lite_mobilenet_v2" });
        setNet(loadedNet);
        setIsLoading(false);
        setStatusText("System Ready. Arm to Start.");

        const detectLoop = async () => {
          if (isSystemStarted) {
            await runObjectDetection(loadedNet);
          }
          detectInterval = requestAnimationFrame(detectLoop);
        };
        detectLoop();
      } catch (error) {
        console.error("Init Error:", error);
        setStatusText("Error: Failed to start AI");
      }
    };

    initSystem();

    // Cleanup
    return () => {
      if (detectInterval) cancelAnimationFrame(detectInterval);
    };
  }, [runObjectDetection, isSystemStarted]);

  const handleArmSystem = () => {
    if (audioRef.current) {
      // Prime the audio for mobile
      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsSystemStarted(true);
        setStatusText("Monitoring: Active");
      }).catch(e => {
        console.error("Audio unlock failed:", e);
        setIsSystemStarted(true);
        setStatusText("⚠️ Sound might be blocked");
      });
    } else {
      setIsSystemStarted(true);
    }
    
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
    setStatusText("Switching Camera...");
  };

  // Silent Audio Unlock (Requirement for Mobile/Chrome)
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
      <audio 
        ref={audioRef} 
        src="/pols-aagyi-pols.mp3" 
        preload="auto" 
        playsInline
      />

      <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
        {/* Status Header */}
        <div className="flex flex-col items-center gap-2">
          <div className={`flex items-center gap-4 ${isLoading ? 'bg-yellow-500/20 text-yellow-400' : isSystemStarted ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} px-8 py-4 rounded-full border-2 ${isLoading ? 'border-yellow-500/50' : isSystemStarted ? 'border-green-500/50' : 'border-red-500/50'} font-black tracking-wide shadow-lg transition-all`}>
            <span className="relative flex h-4 w-4">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLoading ? 'bg-yellow-400' : isSystemStarted ? 'bg-green-400' : 'bg-red-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-4 w-4 ${isLoading ? 'bg-yellow-500' : isSystemStarted ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            {isLoading ? "SYSTEM LOADING..." : isSystemStarted ? "SYSTEM ARMED & ACTIVE" : "SYSTEM DISARMED"}
          </div>
          
          <p className={`mt-2 font-mono text-xl ${statusText.includes('⚠️') || statusText.includes('INTRUDER') ? 'text-red-500 animate-pulse font-black scale-110' : 'text-gray-400'} transition-all text-center`}>
            {statusText}
          </p>
          {!isLoading && !isSystemStarted && (
            <button 
              onClick={handleArmSystem}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-black py-4 px-10 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all transform hover:scale-105 active:scale-95 animate-bounce"
            >
              🚀 ARM SYSTEM (ENABLE SOUND)
            </button>
          )}
          {isSystemStarted && (
            <button 
              onClick={toggleCamera}
              className="mt-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg border border-white/10 transition-all"
            >
              🔄 Switch to {facingMode === "user" ? "Back" : "Front"} Camera
            </button>
          )}
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
        
        <p className="text-gray-600 text-xs mt-4 italic">Automatically detecting &apos;Person&apos; in frame</p>
      </div>
    </div>
  );
};

export default ObjectDetection;



