"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const REVEAL_DURATION = 1.05;
const ease = [0.77, 0, 0.175, 1] as const;
const brandGreen = "#c7fc07";
const firstScreenBackground = "#f5f4df";

const LOADING_LETTERS = "LOADING".split("");

// LOADING 字母渲染: 轨道层与填充层共用同一字母盒结构, 保证双层像素级对齐 ——
// 否则两层基线错位会看起来像"两个 LOADING"。
function LoadingWord() {
  return (
    <span className="inline-block" style={{ whiteSpace: "nowrap" }}>
      {LOADING_LETTERS.map((ch, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <span className="inline-block">{ch}</span>
        </span>
      ))}
    </span>
  );
}

const MAX_VISIBLE_MS = 1600;

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

// 单个 odometer 滚轮位: 0-9 重复排列若干组, 通过 translateY 滚到"绝对索引"对应的行。
// 关键: 传入的 index 是单调递增的绝对值 (可 >9), 进位时持续向上滚动、不回弹。
// DIGIT_H = 行高 (em, 对齐 Bebas Neue 字高); REPEAT 决定可滚动的最大圈数。
// DIGIT_W = 单位字宽 (em, Bebas 数字偏窄)。
const DIGIT_H = 0.82;
const DIGIT_W = 0.42;
const REPEAT = 11; // 0-9 重复 11 组 = 110 行, 足够覆盖个位 0~99 的累计滚动
function SlotDigit({ index }: { index: number }) {
  return (
    <span
      className="relative inline-block overflow-hidden align-bottom"
      style={{ height: `${DIGIT_H}em`, width: `${DIGIT_W}em` }}
      aria-hidden="true"
    >
      <motion.span
        className="absolute left-0 top-0 flex flex-col items-center"
        animate={{ y: `-${index * DIGIT_H}em` }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
      >
        {Array.from({ length: REPEAT * 10 }, (_, n) => (
          <span
            key={n}
            className="flex items-start justify-center"
            style={{ height: `${DIGIT_H}em`, lineHeight: String(DIGIT_H) }}
          >
            {n % 10}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

// Odometer 数字滚轮: 固定两位槽位 (十位 + 个位), 保留前导 0 (如 05% / 09%)。
// 进度单调递增且封顶 99 → 两位都持续向上滚动、不回弹, 最终停在 9 / 9。
//   个位: 用绝对值 v 驱动 (0,1,...,9,10,11,... → 显示 v%10, 进位连续);
//   十位: 用 floor(v/10) 驱动 (0~9)。
function SlotNumber({ value }: { value: number }) {
  const v = Math.min(99, Math.max(0, Math.round(value)));
  return (
    <span className="inline-flex" style={{ letterSpacing: "-0.02em" }}>
      <SlotDigit index={Math.floor(v / 10)} />
      <SlotDigit index={v} />
    </span>
  );
}

export function Preloader({ onComplete }: PreloaderProps) {
  const [isRevealing, setIsRevealing] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1, 真实加载进度
  const shouldReduceMotion = useReducedMotion();
  const hasCompleted = useRef(false);
  const startedAt = useRef(0);

  if (startedAt.current === 0 && typeof performance !== "undefined") {
    startedAt.current = performance.now();
  }

  const complete = useCallback(() => {
    if (hasCompleted.current) {
      return;
    }
    hasCompleted.current = true;
    onComplete();
  }, [onComplete]);

  // 偏好减少动效: 跳过预加载与揭幕, 直接快速放行。
  useEffect(() => {
    if (!shouldReduceMotion) {
      return;
    }
    const id = window.setTimeout(complete, 350);
    return () => window.clearTimeout(id);
  }, [complete, shouldReduceMotion]);

  // Preloader 只负责短暂的进入状态, 不再主动 fetch/decode 首屏序列帧。
  // 真实首屏图片由页面中的 <img> 自己加载, 避免 preloader 与 LCP 图片争抢网络。
  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    let cancelled = false;
    setProgress(0.01);

    const started = performance.now();
    const tick = window.setInterval(() => {
      const elapsed = performance.now() - started;
      const next = Math.min(0.99, elapsed / MAX_VISIBLE_MS);
      setProgress(next);
      if (next >= 0.99) {
        window.clearInterval(tick);
        if (!cancelled) {
          setIsRevealing(true);
        }
      }
    }, 80);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, [shouldReduceMotion]);

  // 即使切到后台导致 interval 被限流, 也最多展示 MAX_VISIBLE_MS。
  useEffect(() => {
    if (shouldReduceMotion || isRevealing) {
      return;
    }

    const elapsed = performance.now() - startedAt.current;
    const wait = Math.max(0, MAX_VISIBLE_MS - elapsed);
    const id = window.setTimeout(() => setIsRevealing(true), wait);
    return () => window.clearTimeout(id);
  }, [isRevealing, shouldReduceMotion]);

  // 揭幕动画兜底完成 (防止 onAnimationComplete 未触发)。
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

  // 揭幕开始后把进度锁定到 100%, 数字不再回退。
  const displayProgress = isRevealing ? 1 : progress;
  // 数字最高只显示到 99%: 满 100% 时直接揭幕消失, 不停留在 "100%" 这一帧。
  const pct = Math.min(99, Math.round(displayProgress * 100));

  return (
    <motion.div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ backgroundColor: brandGreen }}
      initial={false}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
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

      {/* 底部 LOADING 进度区: LOADING 在左, 数字滚轮 + % 在右, 同一行底对齐。
          以 1440 为设计基准把整行铺满; 其他视口用 transform: scale(100vw/1440)
          整行等比缩放 (宽高同比例)。揭幕时整体上移淡出。 */}
      {/* 整行占满视口宽 (w-full): LOADING 在左, 数字滚轮 + % 在右 (justify-between)。
          字号用 vw 自适应, 任意视口铺满。LOADING 设 min-w-0 + overflow, 被挤时裁切
          而非把数字推出视口, 保证数字 + % 始终靠右可见。整体下沉 22%, 形成底部裁切。 */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex select-none items-end justify-between overflow-hidden whitespace-nowrap"
        style={{ color: "#000000", translate: "0 22%" }}
        animate={isRevealing ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
        transition={{ duration: isRevealing ? 0.5 : 0.5, ease }}
      >
        {/* LOADING 文字本身就是进度: 底层淡色轨道 + 上层实色按进度从左裁切填充。
 */}
        <span
          className="relative min-w-0 overflow-hidden font-[family-name:var(--font-bebas)] leading-[0.82]"
          style={{
            fontSize: "min(20vw, 30vh)",
            letterSpacing: "0",
            translate: "0 0.06em",
          }}
        >
          {/* 轨道层 (淡) */}
          <span className="inline-block" style={{ color: "rgba(0,0,0,0.32)" }}>
            <LoadingWord />
          </span>
          {/* 填充层 (实色), clip 宽度 = 进度。与轨道层同字母盒结构, 像素级对齐。 */}
          <motion.span
            className="absolute left-0 top-0 overflow-hidden text-black"
            aria-hidden="true"
            initial={{ width: "0%" }}
            animate={{ width: `${displayProgress * 100}%` }}
            transition={{ ease: "easeOut", duration: 0.3 }}
          >
            <LoadingWord />
          </motion.span>
        </span>
        {/* 数字 + %: 靠右, 不收缩, 始终可见 */}
        <span className="flex shrink-0 items-end whitespace-nowrap pr-[1vw]">
          <span
            className="font-[family-name:var(--font-bebas)] leading-[0.82]"
            style={{ fontSize: "min(20vw, 30vh)", translate: "0 0.06em" }}
          >
            <SlotNumber value={pct} />
          </span>
          <span
            className="font-[family-name:var(--font-bebas)] leading-[0.82]"
            style={{ fontSize: "min(8vw, 12vh)", translate: "0 -0.5em" }}
          >
            %
          </span>
        </span>
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
