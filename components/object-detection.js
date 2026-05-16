"use client";

import React, {useEffect, useRef, useState, useCallback} from "react";
import Webcam from "react-webcam";
import {load as cocoSSDLoad} from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import {renderPredictions} from "@/utils/render-predictions";
import { throttle } from "lodash";

let detectInterval;

const ObjectDetection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSystemStarted, setIsSystemStarted] = useState(false);
  const [statusText, setStatusText] = useState("System Offline");
  const [net, setNet] = useState(null);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const playAlarm = useCallback(
    throttle(() => {
      if (audioRef.current && isSystemStarted) {
        audioRef.current.volume = 1.0;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log("Audio Error", e));
        
        if (navigator.vibrate) {
          navigator.vibrate([500, 200, 500]);
        }
      }
    }, 2000),
    [isSystemStarted]
  );

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
  }, [isSystemStarted, playAlarm]);

  const startMonitoring = async () => {
    setIsLoading(true);
    setStatusText("Initializing AI & Camera...");
    
    // Unlock Audio Context
    if (audioRef.current) {
        audioRef.current.play().then(() => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }).catch(e => console.log("Sound unlock error", e));
    }

    try {
      await tf.ready();
      const loadedNet = await cocoSSDLoad({ base: "lite_mobilenet_v2" });
      setNet(loadedNet);
      setIsSystemStarted(true);
      setIsLoading(false);
      setStatusText("System Active");

      const detectLoop = async () => {
        await runObjectDetection(loadedNet);
        detectInterval = requestAnimationFrame(detectLoop);
      };
      detectLoop();
    } catch (error) {
      console.error("Setup Error:", error);
      setIsLoading(false);
      setStatusText("Error: Check Camera Access");
    }
  };

  useEffect(() => {
    return () => {
      if (detectInterval) {
        cancelAnimationFrame(detectInterval);
      }
    };
  }, []);

  return (
    <div className="mt-8 flex flex-col items-center w-full px-4 text-white">
      <audio 
        ref={audioRef} 
        src="/pols-aagyi-pols.mp3" 
        preload="auto" 
        playsInline
      />

      {!isSystemStarted && (
        <div className="flex flex-col items-center gap-6 py-12">
            <div className="bg-red-600/10 p-10 rounded-full border-4 border-red-600/20 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h2 className="text-3xl font-black text-center max-w-md">PROTECTION SYSTEM IS OFFLINE</h2>
            <p className="text-gray-400 text-center -mt-4">One-click to arm the security alarm</p>
            <button
                disabled={isLoading}
                onClick={startMonitoring}
                className={`${isLoading ? 'bg-gray-700' : 'bg-red-600 hover:bg-red-700'} text-white px-12 py-6 rounded-full font-black text-2xl shadow-[0_0_40px_rgba(220,38,38,0.4)] transition-all transform hover:scale-110 active:scale-95 border-b-8 border-red-900`}
            >
                {isLoading ? 'ARMING SYSTEM...' : '🛡️ ACTIVATE ALARM'}
            </button>
        </div>
      )}

      {isSystemStarted && (
        <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-4 bg-green-500/20 text-green-400 px-8 py-4 rounded-full border-2 border-green-500/50 font-black tracking-wide shadow-lg">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
              </span>
              SYSTEM ARMED & AUTOMATIC
            </div>
            
            <p className={`mt-2 font-mono text-xl ${statusText.includes('⚠️') ? 'text-red-500 animate-pulse font-black scale-110' : 'text-gray-400'} transition-all`}>
              {statusText}
            </p>
          </div>

          <div className="relative flex justify-center items-center p-1 bg-gray-900 rounded-3xl shadow-[0_0_100px_rgba(220,38,38,0.1)] overflow-hidden border border-white/10 w-full">
            <div className="absolute inset-0 gradient opacity-10"></div>
            
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden z-10 bg-black">
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
          
          <button 
            onClick={() => window.location.reload()}
            className="text-gray-500 hover:text-white text-sm underline mt-4"
          >
            Deactivate & Reset
          </button>
        </div>
      )}
    </div>
  );
};

export default ObjectDetection;
