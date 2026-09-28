"use client";

import { useEffect, useState } from "react";

const WORDS = ["droit", "médecine", "économie", "sciences", "lettres"];
const TYPING_SPEED_MS = 80;
const DELETING_SPEED_MS = 40;
const PAUSE_AFTER_TYPING_MS = 1400;
const PAUSE_AFTER_DELETING_MS = 300;

export default function TypewriterCycle() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("typing");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayed(WORDS[0]);
      return;
    }

    const currentWord = WORDS[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (displayed.length < currentWord.length) {
        timeout = setTimeout(
          () => setDisplayed(currentWord.slice(0, displayed.length + 1)),
          TYPING_SPEED_MS,
        );
      } else {
        timeout = setTimeout(() => setPhase("pausing"), PAUSE_AFTER_TYPING_MS);
      }
    } else if (phase === "pausing") {
      timeout = setTimeout(() => setPhase("deleting"), PAUSE_AFTER_TYPING_MS / 4);
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(
          () => setDisplayed(displayed.slice(0, -1)),
          DELETING_SPEED_MS,
        );
      } else {
        timeout = setTimeout(() => {
          setWordIndex((i) => (i + 1) % WORDS.length);
          setPhase("typing");
        }, PAUSE_AFTER_DELETING_MS);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayed, phase, wordIndex, reducedMotion]);

  return (
    <span className="text-[#38bdf8]">
      {displayed}
      {!reducedMotion && <span className="animate-pulse">|</span>}
    </span>
  );
}
