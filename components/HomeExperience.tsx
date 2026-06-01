"use client";

import { useCallback, useState } from "react";
import { CredmexSection } from "@/components/CredmexSection";
import { Preloader } from "@/components/Preloader";
import { JobyTimeline } from "@/components/JobyTimeline";
import { TopNavigation as SiteTopNavigation } from "@/components/TopNavigation";

// 站点主背景色 (深色)
const navy = "#000000";

/**
 * 现役首页编排: Preloader → JobyTimeline (经历时间线) → CredmexSection
 * (产品构建 + 其他项目 + AI 项目 + 设计 + footer), 顶部常驻 TopNavigation。
 *
 * 注: 早期整套 Hero 开场动画 / GlobalScrubBackground / GlobalDockedNav 系统
 * 目前未启用, 完整代码已归档在 _unused/HomeExperience.hero-legacy.tsx,
 * 需要时可迁回。TopNav 配色由 CSS mix-blend-difference 自适应, 无需 scheme。
 */
export function HomeExperience() {
  const [showPreloader, setShowPreloader] = useState(true);
  const handlePreloaderComplete = useCallback(() => {
    setShowPreloader(false);
  }, []);

  return (
    <main
      className="relative min-h-screen text-white"
      style={{ backgroundColor: navy }}
    >
      {showPreloader ? <Preloader onComplete={handlePreloaderComplete} /> : null}

      <div className="relative z-10">
        {/* Joby 风格 Timeline (Intro + Content 合并): 个人经历时间线 */}
        <JobyTimeline introReady={!showPreloader} />

        {/* 第二大部分: Credmex 产品构建 (含其他项目 / AI / 设计 / footer) */}
        <CredmexSection />
      </div>

      {/* 全局 fixed TopNav: 配色靠 CSS mix-blend-difference 自适应明暗背景 */}
      <SiteTopNavigation play={!showPreloader} />
    </main>
  );
}
