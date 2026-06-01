"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const LOADING_DURATION = 1750;
const REVEAL_DURATION = 1.05;
const ease = [0.77, 0, 0.175, 1] as const;
const brandGreen = "#c7fc07";
const firstScreenBackground = "#f5f4df";

type PreloaderProps = {
  onComplete: () => void;
};

function BrandMark() {
  return (
    <img
      alt=""
      aria-hidden="true"
      className="h-7 w-7 shrink-0"
      src="/figma/anotherzouzou-logo.svg"
    />
  );
}

export function Preloader({ onComplete }: PreloaderProps) {
  const [isRevealing, setIsRevealing] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const hasCompleted = useRef(false);

  const complete = useCallback(() => {
    if (hasCompleted.current) {
      return;
    }

    hasCompleted.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (shouldReduceMotion) {
      const id = window.setTimeout(complete, 350);
      return () => window.clearTimeout(id);
    }

    const id = window.setTimeout(() => {
      setIsRevealing(true);
    }, LOADING_DURATION);

    return () => window.clearTimeout(id);
  }, [complete, shouldReduceMotion]);

  useEffect(() => {
    if (!isRevealing) {
      return;
    }

    const fallback = window.setTimeout(complete, REVEAL_DURATION * 1000 + 180);
    return () => window.clearTimeout(fallback);
  }, [complete, isRevealing]);

  if (shouldReduceMotion) {
    return (
      <div
        className="fixed inset-0 z-[9999]"
        style={{ backgroundColor: firstScreenBackground }}
        aria-hidden="true"
      />
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ backgroundColor: brandGreen }}
      initial={false}
      aria-label="Loading ANOTHERZOUZOU portfolio"
    >
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: brandGreen }}
        animate={{ y: "0%" }}
        transition={{ duration: REVEAL_DURATION, ease }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-black"
        animate={
          isRevealing
            ? { opacity: [1, 1, 0], y: [0, 0, -12] }
            : { opacity: 1, y: 0 }
        }
        transition={{
          duration: isRevealing ? REVEAL_DURATION : 0.4,
          ease,
          times: isRevealing ? [0, 0.62, 1] : undefined,
        }}
      >
        <div className="flex h-9 w-[449px] items-center justify-center gap-2 max-sm:w-[calc(100vw-40px)]">
          <BrandMark />
          <p className="whitespace-nowrap font-[family-name:var(--font-sans)] text-2xl leading-[normal] text-black max-sm:text-[18px]">
            <span className="font-medium">ANOTHERZOUZOU‘s </span>
            <span className="font-bold">Design Portfolio</span>
          </p>
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-x-0 bottom-0 z-30 h-full"
        style={{ backgroundColor: firstScreenBackground }}
        initial={{ y: "100%" }}
        animate={isRevealing ? { y: "0%" } : { y: "100%" }}
        transition={{ duration: REVEAL_DURATION, ease }}
        onAnimationComplete={() => {
          if (isRevealing) {
            complete();
          }
        }}
      />
    </motion.div>
  );
}
