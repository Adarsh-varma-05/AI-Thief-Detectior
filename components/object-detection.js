"use client";

import React, {useEffect, useRef, useState, useCallback} from "react";
import Webcam from "react-webcam";
import {load as cocoSSDLoad} from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import {renderPredictions} from "@/utils/render-predictions";

import { throttle } from "lodash";

let detectInterval;

const ObjectDetection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSystemStarted, setIsSystemStarted] = useState(false);
  const [statusText, setStatusText] = useState("Initializing...");
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const playAlarm = useCallback(
    throttle(() => {
      if (audioRef.current && isAudioUnlocked) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => {
          console.error("Audio play failed:", err);
        });
        
        // Vibrate phone for 500ms
        if (navigator.vibrate) {
          navigator.vibrate(500);
        }
      }
    }, 2000),
    [isAudioUnlocked]
  );

  const runCoco = useCallback(async () => {
    setIsLoading(true);
    setStatusText("Loading AI Model...");
    try {
      await tf.ready();
      const net = await cocoSSDLoad({ base: "lite_mobilenet_v2" });
      setIsLoading(false);
      setStatusText("Ready! Tap to Start Monitoring");

      const detectLoop = async () => {
        await runObjectDetection(net);
        detectInterval = requestAnimationFrame(detectLoop);
      };
      detectLoop();
    } catch (error) {
      console.error("Error loading model:", error);
      setIsLoading(false);
      setStatusText("Error: Check Camera Permissions");
    }
  }, []);

  async function runObjectDetection(net) {
    if (
      canvasRef.current &&
      webcamRef.current !== null &&
      webcamRef.current.video?.readyState === 4
    ) {
      canvasRef.current.width = webcamRef.current.video.videoWidth;
      canvasRef.current.height = webcamRef.current.video.videoHeight;

      // Reduced threshold to 0.4 for better detection on mobile
      const detectedObjects = await net.detect(
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
        setStatusText("⚠️ PERSON DETECTED!");
        if (isAudioUnlocked) {
          playAlarm();
        }
      } else {
        setStatusText(isAudioUnlocked ? "Scanning..." : "System Idle (Tap Screen)");
      }
    }
  }

  const showmyVideo = useCallback(() => {
    if (
      webcamRef.current !== null &&
      webcamRef.current.video?.readyState === 4
    ) {
      const myVideoWidth = webcamRef.current.video.videoWidth;
      const myVideoHeight = webcamRef.current.video.videoHeight;

      webcamRef.current.video.width = myVideoWidth;
      webcamRef.current.video.height = myVideoHeight;
    }
  }, []);

  useEffect(() => {
    runCoco();
    showmyVideo();

    return () => {
      if (detectInterval) {
        cancelAnimationFrame(detectInterval);
      }
    };
  }, [runCoco, showmyVideo]);

  const unlockAudio = () => {
    setIsAudioUnlocked(true);
    setIsSystemStarted(true);
    setStatusText("System Live & Sound Active");
    
    // Unlock audio context
    if (audioRef.current) {
      audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }).catch(e => console.log("Unlock failed", e));
    }
  };

  return (
    <div className="mt-8 flex flex-col items-center w-full px-4">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} src="/pols-aagyi-pols.mp3" preload="auto" />

      {/* Tap Overlay to unlock audio on mobile */}
      {!isAudioUnlocked && !isLoading && (
        <div 
          onClick={unlockAudio}
          className="fixed inset-0 z-[100000] bg-black/60 flex flex-col justify-center items-center cursor-pointer backdrop-blur-sm"
        >
          <div className="bg-red-600 p-8 rounded-full animate-pulse shadow-2xl mb-4 border-4 border-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
          </div>
          <h2 className="text-white text-3xl font-bold tracking-tighter text-center px-6">TAP TO ENABLE ALARM</h2>
          <p className="text-gray-300 mt-2 text-sm italic">Required for mobile audio playback</p>
        </div>
      )}

      {isLoading ? (
        <div className="gradient-text text-xl font-semibold animate-pulse">
          {statusText}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
          <div className="flex flex-col items-center gap-2">
            <div className={`flex items-center gap-2 ${isAudioUnlocked ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'} px-6 py-3 rounded-full border border-current font-bold transition-colors shadow-lg`}>
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isAudioUnlocked ? 'bg-green-400' : 'bg-yellow-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isAudioUnlocked ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              </span>
              {isAudioUnlocked ? 'ALARM MONITORING LIVE' : 'WAITING FOR UNLOCK...'}
            </div>
            
            <p className={`mt-2 font-mono text-lg ${statusText.includes('⚠️') ? 'text-red-500 animate-pulse font-extrabold scale-110' : 'text-gray-400'} transition-all`}>
              {statusText}
            </p>
          </div>

          <div className="relative flex justify-center items-center gradient p-1.5 rounded-3xl shadow-[0_0_80px_rgba(239,68,68,0.15)] overflow-hidden border border-white/10 w-full aspect-video lg:aspect-auto">
            <Webcam
              ref={webcamRef}
              className="rounded-2xl w-full h-full lg:h-[720px] object-cover"
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 z-99999 w-full h-full"
            />
          </div>
          
          <div className="text-gray-500 text-xs text-center flex flex-col gap-1">
            <p>AI Model: Lite MobileNet V2 | Precision: High</p>
            <p>Audio source: /pols-aagyi-pols.mp3</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectDetection;
