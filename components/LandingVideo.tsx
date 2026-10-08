"use client";

import { useEffect, useRef, useState } from "react";

export default function LandingVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // On tente d'abord le son : certains navigateurs l'autorisent. S'il est
    // refusé (Safari, notamment), on relance aussitôt en muet plutôt que de
    // ne jamais démarrer — la vidéo doit toujours se lancer toute seule.
    video.play().catch(() => {
      video.muted = true;
      setMuted(true);
      video.play().catch(() => {});
    });
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    setMuted(false);
    video.play();
    setEnded(false);
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#232d45] bg-[#141b2e] shadow-sm">
      <video
        ref={videoRef}
        src="/memoflash-demo.mp4"
        playsInline
        preload="auto"
        onEnded={() => setEnded(true)}
        className="w-full"
      />

      {!ended && (
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
      )}

      {ended && (
        <button
          onClick={replay}
          className="absolute inset-0 flex items-center justify-center bg-[#0b1120]/70 transition-colors hover:bg-[#0b1120]/80"
        >
          <span className="flex items-center gap-2 rounded-full bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform duration-150 active:scale-95">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M3 12a9 9 0 1 1 3 6.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 17v-5h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Revoir avec le son
          </span>
        </button>
      )}
    </div>
  );
}
