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
        audioRef.current.volume = 1.0;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => {
          console.error("Audio play failed:", err);
        });
        
        // Vibrate phone pattern: 500ms on, 200ms off, 500ms on
        if (navigator.vibrate) {
          navigator.vibrate([500, 200, 500]);
        }
      }
    }, 2000),
    [isAudioUnlocked]
  );

  // ... (runCoco and runObjectDetection remain same)

  const unlockAudio = () => {
    setIsAudioUnlocked(true);
    setIsSystemStarted(true);
    setStatusText("System Live & Sound Active");
    
    if (audioRef.current) {
      audioRef.current.volume = 1.0;
      audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }).catch(e => console.log("Unlock failed", e));
    }
  };

  const testSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  return (
    <div className="mt-8 flex flex-col items-center w-full px-4">
      {/* Hidden Audio Element with mobile specific attributes */}
      <audio 
        ref={audioRef} 
        src="/pols-aagyi-pols.mp3" 
        preload="auto" 
        playsInline
      />

      {/* Tap Overlay to unlock audio on mobile */}
      {!isAudioUnlocked && !isLoading && (
        <div 
          onClick={unlockAudio}
          className="fixed inset-0 z-[100000] bg-black/80 flex flex-col justify-center items-center cursor-pointer backdrop-blur-md"
        >
          <div className="bg-red-600 p-10 rounded-full animate-bounce shadow-[0_0_50px_rgba(220,38,38,0.5)] mb-6 border-8 border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
          </div>
          <h2 className="text-white text-4xl font-black tracking-tighter text-center px-6">TAP TO ENABLE ALARM</h2>
          <p className="text-red-400 mt-4 text-lg font-bold animate-pulse">Required for Phone Sound</p>
        </div>
      )}

      {isLoading ? (
        <div className="gradient-text text-xl font-semibold animate-pulse">
          {statusText}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
          <div className="flex flex-col items-center gap-2">
            <div className={`flex items-center gap-4 ${isAudioUnlocked ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'} px-8 py-4 rounded-full border-2 border-current font-black tracking-wide shadow-lg`}>
              <span className="relative flex h-4 w-4">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isAudioUnlocked ? 'bg-green-400' : 'bg-yellow-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-4 w-4 ${isAudioUnlocked ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              </span>
              {isAudioUnlocked ? 'SYSTEM ACTIVE' : 'WAITING FOR UNLOCK'}
            </div>
            
            <p className={`mt-2 font-mono text-xl ${statusText.includes('⚠️') ? 'text-red-500 animate-pulse font-black scale-110' : 'text-gray-400'} transition-all`}>
              {statusText}
            </p>
          </div>

          <div className="relative flex justify-center items-center p-1 bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-white/10 w-full max-w-4xl">
            <div className="absolute inset-0 gradient opacity-20"></div>
            
            <div className="relative w-full h-full rounded-2xl overflow-hidden z-10 bg-black">
              <Webcam
                ref={webcamRef}
                className="w-full h-full object-cover"
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 z-20 w-full h-full"
              />
            </div>
          </div>
          
          {isAudioUnlocked && (
            <button 
              onClick={testSound}
              className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-4 py-2 rounded-lg border border-white/10 transition-colors"
            >
              Test Sound 🔊
            </button>
          )}
          
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
