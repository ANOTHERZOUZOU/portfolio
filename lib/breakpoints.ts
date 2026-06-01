"use client";

import { useEffect, useState } from "react";

/**
 * 标准响应式断点 (与 Tailwind v4 默认值 + 业界主流约定一致):
 *   xs   < 640    极小手机 (iPhone SE/Mini)
 *   sm   ≥ 640    大屏手机 / 小屏 landscape
 *   md   ≥ 768    平板竖屏
 *   lg   ≥ 1024   平板横屏 / 小屏笔记本
 *   xl   ≥ 1280   桌面 (设计稿基准 1440 落在此区间)
 *   2xl  ≥ 1536   大屏桌面
 *
 * 全站统一以这套断点为响应式判断锚点; 在 CSS 中可用 Tailwind 同名前缀
 * (sm:/md:/lg:/xl:/2xl:), 在 JS 中可用 useBreakpoint / useMediaQuery
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;
export type BreakpointName = "xs" | BreakpointKey;

const ORDER: readonly BreakpointName[] = ["xs", "sm", "md", "lg", "xl", "2xl"];

function widthToBreakpoint(width: number): BreakpointName {
  if (width >= BREAKPOINTS["2xl"]) return "2xl";
  if (width >= BREAKPOINTS.xl) return "xl";
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  if (width >= BREAKPOINTS.sm) return "sm";
  return "xs";
}

/**
 * 监听任意 media query, SSR 安全 (服务端始终返回 false, 客户端 mount 后立即同步).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/**
 * 返回当前命中的断点档位. SSR 阶段默认按桌面 (xl) 渲染, 客户端 mount 后
 * 根据 window.innerWidth 即时更新, 避免桌面端首屏出现 mobile 闪烁.
 */
export function useBreakpoint(): BreakpointName {
  const [bp, setBp] = useState<BreakpointName>("xl");

  useEffect(() => {
    const compute = () => setBp(widthToBreakpoint(window.innerWidth));
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return bp;
}

/**
 * 判断当前断点是否 ≥ 目标断点 (含). 用于条件渲染:
 *   const isDesktop = useIsAtLeast("lg");
 */
export function useIsAtLeast(target: BreakpointKey): boolean {
  const bp = useBreakpoint();
  return ORDER.indexOf(bp) >= ORDER.indexOf(target);
}
