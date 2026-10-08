"use client";

import { useRef, useState } from "react";

export default function LandingVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#232d45] bg-[#141b2e] shadow-sm">
      <video
        ref={videoRef}
        src="/memoflash-demo.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="w-full"
      />

      <button
        onClick={toggleMute}
        aria-label={muted ? "Activer le son" : "Couper le son"}
        className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#0b1120]/70 text-[#e7ecf5] backdrop-blur-sm transition-colors transition-transform duration-150 hover:bg-[#0b1120] active:scale-95"
      >
        {muted ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M5 9v6h4l5 5V4L9 9H5z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 9l4 6M21 9l-4 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M5 9v6h4l5 5V4L9 9H5z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 8a5 5 0 010 8M18.5 5.5a9 9 0 010 13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
