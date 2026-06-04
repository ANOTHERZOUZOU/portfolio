"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import VibeCodingHero from "@/components/VibeCodingHero";

/* ============================================================
 * AI 项目: 嵌入 Figma Slides 演示 (deck 演示视图), 外观精装.
 *
 * 方案 A — 整段用 Figma 原生演示替换:
 *   - embed.figma.com/deck/<fileKey> 演示视图, 幻灯片内视频自动播放;
 *   - 标题区 + 仿窗口卡片(圆角/描边/柔光投影 + 顶部三点 chrome) + 背景氛围光;
 *   - 默认遮罩拦截指针: 滚轮照常翻页、视频后台预览, 点击 "进入演示" 才接管交互,
 *     避免满屏 iframe 抢滚动陷住页面.
 *
 * 前提: 该 Figma 文件需开启 "任何人凭链接可查看" 共享.
 * ============================================================ */

const FILE_KEY = "ajStlT2cYgU314wfgMfsuA";
const EMBED_SRC = `https://embed.figma.com/deck/${FILE_KEY}/AI-%E9%A1%B9%E7%9B%AE%E5%88%86%E4%BA%AB?embed-host=portfolio&viewport-controls=true`;
const ACCENT = "#ff583f"; // 与文稿橙色标签一致

const CN_FONT = "var(--font-sans)";

export default function AiProjectSection({ id = "ai" }: { id?: string }) {
  const t = useT();
  const [active, setActive] = useState(false);
  const [hint, setHint] = useState(false);

  const enter = () => {
    setActive(true);
    setHint(true);
    window.setTimeout(() => setHint(false), 4600);
  };

  return (
    <section
      id={id}
      data-light-section={false}
      className="relative flex w-full flex-col items-center justify-start overflow-hidden"
      style={{
        minHeight: "100vh",
        padding: "0 24px 96px",
        backgroundColor: "#000000",
        fontFamily: CN_FONT,
      }}
    >
      {/* 背景氛围光 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          top: "calc(100svh - 12vh)",
          left: "50%",
          width: "70vw",
          height: "55vh",
          transform: "translateX(-50%)",
          background: `radial-gradient(closest-side, ${ACCENT}22, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* 整屏 ASCII 字符跳动 logo (复刻 artefakt.mov 首屏)
          用负 margin 抵消 section 的 24px 左右 padding 实现全宽, 避开 100vw 的滚动条偏移
          → hero 左缘精确落在视口 0, 内部 padX 才能和顶部导航 logo 对齐 */}
      <div
        className="relative z-10 select-none"
        style={{ width: "calc(100% + 48px)", marginLeft: "-24px", marginRight: "-24px" }}
      >
        <VibeCodingHero
          text="Vibe Coding"
          title={t("AI 驱动\n设计重构", "AI-DRIVEN\nDESIGN, REIMAGINED")}
          description={t(
            "用 AI 与 Design Token 重构海外业务的设计流程 —— 跨语言文案处理与设计规范系统化的完整实践。",
            "Rebuilding the design workflow for overseas business with AI and design tokens — an end-to-end practice in cross-language copy handling and systematized design standards."
          )}
        />
      </div>

      {/* 仿窗口卡片 */}
      <div
        className="relative z-10"
        style={{
          marginTop: "clamp(64px, 12vh, 140px)",
          width: "min(86vw, calc((100vh - 300px) * 16 / 9), 940px)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.03)",
          boxShadow:
            "0 40px 120px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04) inset",
          overflow: "hidden",
        }}
      >
        {/* 顶部 chrome 条 */}
        <div
          className="flex items-center"
          style={{
            height: 44,
            padding: "0 16px",
            gap: 8,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "rgba(255,255,255,0.025)",
          }}
        >
          <span style={dot("#ff5f57")} />
          <span style={dot("#febc2e")} />
          <span style={dot("#28c840")} />
          <span
            className="mx-auto inline-flex items-center gap-2"
            style={{
              padding: "4px 14px",
              borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.55)",
              fontSize: "var(--text-caption)",
              letterSpacing: "0.02em",
              transform: "translateX(-26px)", // 视觉居中(抵消左侧三点)
            }}
          >
            <FigmaMark />
            {t("AI 项目分享 · Figma Slides", "AI Project Showcase · Figma Slides")}
          </span>
        </div>

        {/* 演示区 16:9 */}
        <div className="relative" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src={EMBED_SRC}
            title={t("AI 项目分享", "AI Project Showcase")}
            allow="autoplay; fullscreen; clipboard-read; clipboard-write"
            loading="lazy"
            className="absolute inset-0 h-full w-full"
            style={{
              border: 0,
              display: "block",
              pointerEvents: active ? "auto" : "none",
            }}
          />

          {!active && (
            <button
              type="button"
              onClick={enter}
              aria-label={t("进入演示", "Enter presentation")}
              className="group absolute inset-0 flex items-center justify-center"
              style={{
                cursor: "pointer",
                background:
                  "radial-gradient(60% 60% at 50% 50%, rgba(0,0,0,0.25), rgba(0,0,0,0.55))",
              }}
            >
              <span
                className="flex items-center gap-2.5 rounded-full backdrop-blur transition-transform duration-300 group-hover:scale-105"
                style={{
                  padding: "13px 24px",
                  backgroundColor: "rgba(10,10,16,0.6)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  color: "#ffffff",
                  fontSize: "var(--text-body)",
                  letterSpacing: "0.02em",
                  boxShadow: `0 8px 30px -8px ${ACCENT}66`,
                }}
              >
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 26, height: 26, backgroundColor: ACCENT }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                {t("进入演示", "Enter presentation")}
              </span>
            </button>
          )}

          {/* 翻页提示: 进入演示后短暂浮现, 4.6s 自动淡出 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: "50%",
              bottom: 20,
              opacity: active && hint ? 1 : 0,
              transform: `translateX(-50%) translateY(${
                active && hint ? "0" : "8px"
              })`,
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            <span
              className="flex items-center gap-2.5 rounded-full backdrop-blur"
              style={{
                padding: "9px 18px",
                backgroundColor: "rgba(10,10,16,0.66)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.9)",
                fontSize: "var(--text-body-sm)",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.8)",
              }}
            >
              <CursorClick />
              {t("点击画面翻页", "Click to flip slides")}
              <span style={{ opacity: 0.45 }}>·</span>
              <kbd style={kbd}>←</kbd>
              <kbd style={kbd}>→</kbd>
              <span style={{ opacity: 0.7 }}>{t("切换", "to switch")}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const kbd = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  height: 22,
  padding: "0 6px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.25)",
  backgroundColor: "rgba(255,255,255,0.08)",
  fontSize: "var(--text-caption)",
  lineHeight: 1,
  color: "#fff",
} as const;

function CursorClick() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3.5 9 14l2.6-2.2 1.7 3.9 2-0.9-1.7-3.8 3.4-0.2L9 3.5Z"
        fill="#fff"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M5 5.5 6.2 8M4 10h2.4M6 14.8 7.7 13"
        stroke={ACCENT}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function dot(color: string) {
  return {
    width: 12,
    height: 12,
    borderRadius: 99,
    backgroundColor: color,
    display: "inline-block",
  } as const;
}

function FigmaMark() {
  return (
    <svg width="11" height="16" viewBox="0 0 38 57" aria-hidden="true">
      <path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z" />
      <path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0Z" />
      <path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19Z" />
      <path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z" />
      <path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z" />
    </svg>
  );
}
