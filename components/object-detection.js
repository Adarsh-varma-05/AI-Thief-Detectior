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

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize audio object
    audioRef.current = new Audio("/pols-aagyi-pols.mp3");
  }, []);

  const playAlarm = useCallback(
    throttle(() => {
      if (audioRef.current && isSystemStarted) {
        audioRef.current.play().catch((err) => console.error("Audio play failed:", err));
      }
    }, 2000),
    [isSystemStarted]
  );

  const runCoco = useCallback(async () => {
    setIsLoading(true);
    try {
      await tf.ready();
      const net = await cocoSSDLoad({ base: "lite_mobilenet_v2" });
      setIsLoading(false);

      const detectLoop = async () => {
        await runObjectDetection(net);
        detectInterval = requestAnimationFrame(detectLoop);
      };
      detectLoop();
    } catch (error) {
      console.error("Error loading model:", error);
      setIsLoading(false);
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

      // find detected objects
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

      if (isPersonDetected && isSystemStarted) {
        playAlarm();
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
    // Unlocking audio on mobile
    if (audioRef.current) {
      audioRef.current.muted = true;
      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.muted = false;
      });
    }
  };

  return (
    <div className="mt-8 flex flex-col items-center">
      {isLoading ? (
        <div className="gradient-text text-xl font-semibold animate-pulse">
          Loading AI Model...
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 w-full">
          {!isSystemStarted && (
            <button
              onClick={handleStartSystem}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-bold text-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 animate-bounce"
            >
              🚀 START ALARM SYSTEM
            </button>
          )}

          {isSystemStarted && (
            <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full border border-green-500/30">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              System Active & Sound Enabled
            </div>
          )}

          <div className="relative flex justify-center items-center gradient p-1.5 rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            {/* webcam */}
            <Webcam
              ref={webcamRef}
              className="rounded-xl w-full lg:h-[720px] object-cover"
              muted
            />
            {/* canvas */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 z-99999 w-full lg:h-[720px]"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectDetection;
