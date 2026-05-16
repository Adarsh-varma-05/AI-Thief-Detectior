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

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const playAlarm = useCallback(
    throttle(() => {
      if (audioRef.current && isSystemStarted) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => {
          console.error("Audio play failed:", err);
          setStatusText("Audio Error: " + err.message);
        });
      }
    }, 2000),
    [isSystemStarted]
  );

  const runCoco = useCallback(async () => {
    setIsLoading(true);
    setStatusText("Loading AI Model...");
    try {
      await tf.ready();
      const net = await cocoSSDLoad({ base: "lite_mobilenet_v2" });
      setIsLoading(false);
      setStatusText("System Ready");

      const detectLoop = async () => {
        await runObjectDetection(net);
        detectInterval = requestAnimationFrame(detectLoop);
      };
      detectLoop();
    } catch (error) {
      console.error("Error loading model:", error);
      setIsLoading(false);
      setStatusText("Error loading AI model");
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

      const detectedObjects = await net.detect(
        webcamRef.current.video,
        undefined,
        0.6
      );

      const context = canvasRef.current.getContext("2d");
      renderPredictions(detectedObjects, context);

      const isPersonDetected = detectedObjects.some(
        (obj) => obj.class === "person"
      );

      if (isPersonDetected) {
        if (isSystemStarted) {
          setStatusText("⚠️ PERSON DETECTED! ALARM ON");
          playAlarm();
        } else {
          setStatusText("Person detected (System Off)");
        }
      } else {
        if (isSystemStarted) {
          setStatusText("Scanning... (System Active)");
        } else {
          setStatusText("System Idle");
        }
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

  const handleStartSystem = () => {
    setIsSystemStarted(true);
    setStatusText("System Activated");
    
    // Explicitly unlock audio element on user click
    if (audioRef.current) {
      audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }).catch(e => {
          console.error("Unlock failed", e);
          setStatusText("Click again to enable audio");
      });
    }
  };

  return (
    <div className="mt-8 flex flex-col items-center">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} src="/pols-aagyi-pols.mp3" preload="auto" />

      {isLoading ? (
        <div className="gradient-text text-xl font-semibold animate-pulse">
          {statusText}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="flex flex-col items-center gap-2">
            {!isSystemStarted ? (
              <button
                onClick={handleStartSystem}
                className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-full font-bold text-2xl shadow-xl transition-all transform hover:scale-105 active:scale-95 animate-bounce border-4 border-red-400"
              >
                🚨 START ALARM SYSTEM
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-6 py-3 rounded-full border border-green-500/30 font-bold">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  SYSTEM IS LIVE
                </div>
                <button 
                  onClick={() => setIsSystemStarted(false)}
                  className="text-gray-400 hover:text-white text-sm underline"
                >
                  Stop System
                </button>
              </div>
            )}
            
            <p className={`mt-2 font-mono text-sm ${statusText.includes('⚠️') ? 'text-red-500 animate-pulse font-bold' : 'text-gray-500'}`}>
              Status: {statusText}
            </p>
          </div>

          <div className="relative flex justify-center items-center gradient p-1.5 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden border border-white/10 max-w-4xl w-full">
            <Webcam
              ref={webcamRef}
              className="rounded-2xl w-full h-auto lg:h-[720px] object-cover"
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 z-99999 w-full h-full"
            />
          </div>
          
          <div className="text-gray-500 text-xs text-center max-w-md">
            Note: Ensure your device is not on silent mode and volume is up. 
            The system works best in well-lit environments.
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectDetection;
