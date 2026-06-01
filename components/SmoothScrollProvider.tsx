"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

declare global {
  interface Window {
    __portfolioLenis?: Lenis;
  }
}

export function SmoothScrollProvider() {
  useEffect(() => {
    const previousScrollRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return () => {
        history.scrollRestoration = previousScrollRestoration;
      };
    }

    const isTouchLike = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 768;

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: isTouchLike ? 0.8 : 1.3,
      wheelMultiplier: 0.75,
      touchMultiplier: 1.1,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
    });
    window.__portfolioLenis = lenis;

    // Lenis ↔ GSAP ScrollTrigger 集成: 用 gsap.ticker 驱动 lenis.raf,
    // 并在 lenis 滚动时刷新 ScrollTrigger, 否则 scrub 动画的触发位置会
    // 与平滑滚动脱节 (出场动画提前跑完). 与参考站 (Joby) 集成方式一致.
    lenis.on("scroll", ScrollTrigger.update);
    const tickerHandler = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerHandler);
    gsap.ticker.lagSmoothing(0);

    const resetScrollPosition = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      lenis.scrollTo(0, { immediate: true, force: true });
      ScrollTrigger.update();
    };

    resetScrollPosition();

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetScrollPosition();
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      gsap.ticker.remove(tickerHandler);
      lenis.off("scroll", ScrollTrigger.update);
      if (window.__portfolioLenis === lenis) {
        delete window.__portfolioLenis;
      }
      lenis.destroy();
      history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  return null;
}
