"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLang, useT } from "@/lib/i18n";
import FloatingTagsHero from "./FloatingTagsHero";
import AiProjectSection from "./AiProjectSection";
import OtherProjectsSection from "./OtherProjectsSection";
import DesignSkullSection from "./DesignSkullSection";
import SiteFooter from "./SiteFooter";
import yaoxinD1Image from "../yaoxin-img/d1.png";
import yaoxinD2Image from "../yaoxin-img/d2.png";
import yaoxinD3Image from "../yaoxin-img/d3.png";
import yaoxinD4Image from "../yaoxin-img/d4.png";
import yaoxinD5Image from "../yaoxin-img/d5.png";
import inviteK01Image from "../yaoxin-img/K01.png";
import inviteK02Image from "../yaoxin-img/K02.png";
import inviteK03Image from "../yaoxin-img/K03.png";
import inviteK04Image from "../yaoxin-img/K04.png";
import inviteK05Image from "../yaoxin-img/K05.png";
import inviteT1Image from "../yaoxin-img/T1.png";
import inviteT2Image from "../yaoxin-img/T2.png";
import inviteT3Image from "../yaoxin-img/T3.png";
import inviteT4Image from "../yaoxin-img/T4.png";
import inviteT5Image from "../yaoxin-img/T5.png";
import inviteY1Image from "../yaoxin-img/Y1.png";
import inviteY2Image from "../yaoxin-img/Y2.png";
import inviteY3Image from "../yaoxin-img/Y3.png";
import inviteY4Image from "../yaoxin-img/Y4.png";

/* ============================================================
 * 苹果式分段出场: 每个子模块独立 RevealGroup, 进入视区时整组淡入
 * 上移, 内部 RevealItem 按声明顺序错峰 100ms (8 项内封顶), 只触发
 * 一次. 用 IntersectionObserver + CSS transition, 不依赖 framer-motion.
 *
 * - threshold 0.15, rootMargin "0px 0px -10% 0px" — 模块顶部进入
 *   视区下边缘往上 10% 时触发, 跟苹果产品页观感一致
 * - 起始: opacity 0, translateY 24px
 * - 结束: opacity 1, translateY 0
 * - 时长 700ms, easing cubic-bezier(0.22, 1, 0.36, 1) (easeOutQuint)
 * ============================================================ */
const RevealCtx = createContext<{ visible: boolean } | null>(null);

function RevealGroup({
  children,
  triggerTop,
  className,
  style,
  repeat = false,
}: {
  children: ReactNode;
  /**
   * stage 坐标系下的触发参考线 (px). RevealGroup 在该 y 位置放一个 1×1 sentinel,
   * sentinel 进入视区底部 (留 25vh buffer) 时整组开始 fade-up 入场.
   */
  triggerTop?: number;
  className?: string;
  style?: CSSProperties;
  repeat?: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = sentinelRef.current ?? groupRef.current;
    if (!target) return;
    if (typeof IntersectionObserver === "undefined") {
      // 无 IntersectionObserver 的环境 (老浏览器 / 某些 SSR) 兜底: 直接显示。
      // 挂载时一次性同步 set, 无后续级联。
      setVisible(true);
      return;
    }

    // 触发线: 视区 65% 高度处, 与下方 IO rootMargin -35% 等价
    const pastTrigger = () =>
      target.getBoundingClientRect().top < window.innerHeight * 0.65;

    if (pastTrigger()) {
      setVisible(true);
    }

    const enterIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            if (!repeat) teardownEnter();
          }
        }
      },
      { threshold: 0, rootMargin: "0px 0px -35% 0px" }
    );
    enterIo.observe(target);

    // 快速滚动兜底: IntersectionObserver 按合成帧采样, 滚动过快时高度仅
    // 1px 的 sentinel 可能在相邻两帧间从视区下方直接跨到上方, isIntersecting
    // 从未被采样到 true, 导致整组 (标题/副标题/贴纸) 永远停在 opacity:0 而
    // "消失". 用 rAF 节流的 scroll 兜底补检: sentinel 越过触发线即强制显示.
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (pastTrigger()) {
          setVisible(true);
          teardownEnter();
        }
      });
    };
    function teardownEnter() {
      enterIo.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    let exitIo: IntersectionObserver | undefined;
    if (repeat) {
      // repeat 模式的显隐完全交给 enter/exit IO, 不挂 scroll 兜底
      // (会与 exitIo 的隐藏逻辑互相打架)
      exitIo = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) {
              setVisible(false);
            }
          }
        },
        { threshold: 0, rootMargin: "150% 0px 150% 0px" }
      );
      exitIo.observe(target);
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    return () => {
      enterIo.disconnect();
      exitIo?.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [repeat]);

  // 默认覆盖父级 (stage) 的整块区域: position absolute + inset 0,
  // 这样内部 absolute 子元素仍按 stage 坐标系 (left/top) 摆放.
  // pointer-events:none 让 group 容器本身不拦事件 — 三个 RevealGroup
  // 互相叠在 stage 上, 否则后渲染的 group 会盖住前一段的 iframe / hover.
  // 真正可交互的元素 (iframe / 社交图标) 自带 pointer-events:auto
  const groupStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    ...style,
  };
  return (
    <RevealCtx.Provider value={{ visible }}>
      <div ref={groupRef} className={className} style={groupStyle}>
        {triggerTop !== undefined && (
          <div
            ref={sentinelRef}
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: triggerTop,
              width: 1,
              height: 1,
              pointerEvents: "none",
              opacity: 0,
            }}
          />
        )}
        {children}
      </div>
    </RevealCtx.Provider>
  );
}

function RevealItem({
  index = 0,
  children,
  className,
  style,
  as: Tag = "div",
  from,
}: {
  index?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "span";
  from?: { x?: number; y?: number };
}) {
  const ctx = useContext(RevealCtx);
  const visible = ctx?.visible ?? true;
  const delay = Math.min(index, 8) * 100;
  const fromX = from?.x ?? 0;
  const fromY = from?.y ?? 40;
  const hasOwnPosition =
    style?.position !== undefined ||
    style?.left !== undefined ||
    style?.top !== undefined ||
    (className?.includes("absolute") ?? false) ||
    (className?.includes("fixed") ?? false);
  const merged: CSSProperties = {
    ...(hasOwnPosition
      ? { pointerEvents: "auto" as const }
      : { position: "absolute", inset: 0, pointerEvents: "none" as const }),
    ...style,
    opacity: visible ? 1 : 0,
    transform: `${style?.transform ? style.transform + " " : ""}translate3d(${
      visible ? 0 : fromX
    }px, ${visible ? 0 : fromY}px, 0)`,
    transition: `opacity 900ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 900ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
    willChange: "opacity, transform",
  };
  return (
    <Tag className={className} style={merged}>
      {children}
    </Tag>
  );
}

/* ============================================================
 * Macbook 屏幕里嵌入的 Credmex 品牌站 iframe + 浏览器顶栏 chrome.
 * 几何 (相对 Macbook 容器):
 *   - 屏幕亮区 (89,34) 670×422 (Figma 561:15325)
 *   - 顶部浏览器 chrome (89,34) 670×40 (Figma 632:7366):
 *     · 上 20: macOS 红黄绿圆点 + 标签页 (#DEE1E6 灰底)
 *     · 下 20: URL bar (白底 + 地址)
 *   - 下面 iframe (89,74) 670×382: 缩放 1440×821 → 0.4653
 * 交互:
 *   - 默认 pointer-events:none — 滚轮穿透到主页面
 *   - 鼠标 hover 时 pointer-events:auto, 可滚动 Framer 内容
 * ============================================================ */
function ScreenIframe({
  onHoverChange,
}: {
  onHoverChange?: (hover: boolean) => void;
}) {
  const [hover, setHover] = useState(false);
  const setHoverState = (v: boolean) => {
    setHover(v);
    onHoverChange?.(v);
  };
  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: 89,
        top: 34,
        width: 670,
        height: 422,
        zIndex: 2,
        backgroundColor: "#000",
        pointerEvents: "auto",
      }}
      onMouseEnter={() => setHoverState(true)}
      onMouseLeave={() => setHoverState(false)}
    >
      {/* 顶部浏览器 chrome (从 Figma 节点 647:4178 导出的整张图,
          含 macOS 红黄绿圆点 + Credmex tab + URL bar). 670×40, 占
          屏幕顶部 */}
      <img
        src="/figma/credmex/browser-chrome.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute block max-w-none select-none"
        style={{ left: 0, top: 8, width: 670, height: 40, zIndex: 3, pointerEvents: "none" }}
      />
      <iframe
        src="https://credmexbranding.framer.wiki/"
        title="Credmex Branding"
        loading="lazy"
        tabIndex={-1}
        className="block"
        style={{
          position: "absolute",
          left: 0,
          top: 48,
          width: 1440,
          height: 795,
          border: 0,
          transform: "scale(0.4653)",
          transformOrigin: "top left",
          pointerEvents: hover ? "auto" : "none",
          backgroundColor: "#fff",
        }}
      />
    </div>
  );
}

// 设计稿: Figma 节点 561:15316 (Frame 8). 整体 1440 × 2905
// (footer 底 = 2783 + 122). 黑底, 文档流模式 (不再 sticky scrub).
const STAGE_W = 1440;
const STAGE_H = 1100;
// 素材库搭建 stage 高度. 显示器 (top 350 + 高 569 = 919) 完整显示, 底部留 41px
const MATERIAL_STAGE_H = 960;

/**
 * 第二大部分: Credmex 产品构建.
 *
 * 设计稿来源: Figma 节点 561:15316. 黑底, 普通文档流, 内部按 1440 stage
 * 等比缩放, 内容包含:
 *   - 品牌宣传 (Macbook + 黄色便签)
 *   - 产品搭建 (iPhone 手持 + 两组 "额度推荐" 文案)
 *   - 底部社交媒体 footer
 *
 * 跟 Hero 段衔接: Hero 滚出后这一段从下方跟上, 黑底无缝衔接 hero
 * 月球视频 (视频会停在末帧, 这段黑底覆盖之上). 全局 docked nav / TopNav
 * 在此区段内继续保持 dark 配色.
 */
export const CredmexSection = forwardRef<HTMLElement, { id?: string }>(
  function CredmexSection({ id = "credmex" }, ref) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
      const node = wrapRef.current;
      if (!node) return;
      const compute = () => {
        const w = node.getBoundingClientRect().width;
        if (w <= 0) return;
        setScale(w / STAGE_W);
      };
      compute();
      const ro = new ResizeObserver(compute);
      ro.observe(node);
      const vv = typeof window !== "undefined" ? window.visualViewport : null;
      vv?.addEventListener("resize", compute);
      return () => {
        ro.disconnect();
        vv?.removeEventListener("resize", compute);
      };
    }, []);

    return (
      <section
        id={id}
        ref={ref}
        className="relative w-full"
        style={{ backgroundColor: "#000000" }}
      >
        {/* 项目概览: Credmex 介绍 + 8张卡片 */}
        <OverviewSection scale={scale} />

        {/* 组件库: 3D perspective scroll 动画 */}
        <ComponentLibrarySection />

        {/* Icon 展示 */}
        <CollaborationsSection scale={scale} />

        {/* 字体层级展示 */}
        <TypeHierarchySection scale={scale} />

        {/* 品牌宣传 */}
        <div
          id="brand"
          ref={wrapRef}
          className="relative w-full overflow-hidden"
          style={{ height: STAGE_H * scale }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: STAGE_W,
              height: STAGE_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <BrandSection scale={scale} />
          </div>
        </div>

        {/* 产品搭建: 独立于 scale stage, 使用真正的 CSS sticky */}
        <ProductSection />

        {/* Stacking Cards: 堆叠卡片滚动模块 */}
        <StackingCardsSection />

        {/* 额度选择: 文字 + 手持手机视频 */}
        <CreditSection scale={scale} />

        {/* 额度推荐 */}
        <RecommendSection scale={scale} />

        {/* 邀新活动 / 排行榜玩法 */}
        <InviteRankingSection scale={scale} />

        {/* 素材库搭建 */}
        <div
          id="material"
          className="relative w-full overflow-hidden"
          style={{ height: MATERIAL_STAGE_H * scale }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: STAGE_W,
              height: MATERIAL_STAGE_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <MaterialLibrarySection scale={scale} />
          </div>
        </div>

        {/* 其他项目: easyPLN / Instacash 文件夹标签切换 */}
        <OtherProjectsSection />

        {/* AI 项目: 21 屏横向滚动叙事 */}
        <AiProjectSection />

        {/* 结尾「揭示式 footer」: 骷髅模块上浮, 下层 footer 被逐渐露出。
            独立 relative 容器 + 绿色底色:
              1) 把 footer 的 sticky 作用域限制在此处, 避免前面其它模块 (透明背景) 处漏出 footer;
              2) 骷髅模块圆角缺口 / 与 footer 的缝隙处露出的是绿色 (= footer 同色) 而非黑底,
                 圆角因此清晰可见, 并与 footer 无缝衔接。 */}
        <div style={{ position: "relative", backgroundColor: "var(--brand-green)" }}>
          {/* DESIGN 石刻字 + 骷髅头盔 视觉装置 */}
          <DesignSkullSection />

          {/* 站点 footer (复刻 good-fella) */}
          <SiteFooter />
        </div>
      </section>
    );
  }
);

/* ============================================================
 * 子段: 项目概览 — 标题 + 8 张卡片三列布局
 * Figma frame "8": 1440×1333, 内容区域 120,120 1200×1093
 * 标题区域 800×224 (居中), 卡片区域 1200×797 (y=296)
 * ============================================================ */
const OVERVIEW_H = 1253;
const OVERVIEW_GAP = 20;
const OVERVIEW_CARDS: { src: string; w: number; h: number }[] = [
  { src: "/figma/credmex/card-1.webp", w: 339, h: 485 },
  { src: "/figma/credmex/card-2.webp", w: 339, h: 292 },
  { src: "/figma/credmex/card-3.webp", w: 189, h: 189 },
  { src: "/figma/credmex/card-4.webp", w: 273, h: 189 },
  { src: "/figma/credmex/card-5.webp", w: 482, h: 343 },
  { src: "/figma/credmex/card-6.webp", w: 482, h: 225 },
  { src: "/figma/credmex/card-7.webp", w: 339, h: 292 },
  { src: "/figma/credmex/card-8.webp", w: 339, h: 485 },
];

/* ============================================================
 * Type Hierarchy: 字体规范展示
 * 左侧 sticky 固定在距顶部 120px，右侧正常滚动展示更多内容
 * Figma node 1292:10849
 * ============================================================ */
const TYPE_TITLES = [
  "Type \nHierarchy",
  "Line \nHeight",
  "Line \nHeight",
  "Application \nScenarios",
];

function HorizontalPathArrow({
  width,
  viewBoxWidth,
  delay = 0,
}: {
  width: number;
  viewBoxWidth: number;
  delay?: number;
}) {
  const y = 3.68;
  const endX = viewBoxWidth - 0.5;
  const arrowStartX = viewBoxWidth - 4;

  return (
    <motion.svg
      width={width}
      height={8}
      viewBox={`0 0 ${viewBoxWidth} 7.36`}
      fill="none"
      style={{ flexShrink: 0 }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.7 }}
    >
      <motion.line
        x1={0}
        y1={y}
        x2={endX}
        y2={y}
        stroke="#6743FF"
        strokeWidth={1}
        strokeLinecap="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          show: { pathLength: 1, opacity: 1 },
        }}
        transition={{ duration: 0.65, delay, ease: "easeOut" }}
      />
      <motion.polyline
        points={`${arrowStartX},0.85 ${endX},${y} ${arrowStartX},6.51`}
        stroke="#6743FF"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          show: { pathLength: 1, opacity: 1 },
        }}
        transition={{ duration: 0.35, delay: delay + 0.45, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

function VerticalMeasureArrow({
  height,
  delay = 0,
}: {
  height: number;
  delay?: number;
}) {
  return (
    <motion.svg
      style={{ position: "absolute", top: 0, left: 462 }}
      width={7}
      height={height}
      viewBox={`0 0 7 ${height}`}
      fill="none"
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.7 }}
    >
      <motion.line
        x1={3.5}
        y1={0}
        x2={3.5}
        y2={height}
        stroke="#6743FF"
        strokeWidth={1}
        strokeLinecap="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          show: { pathLength: 1, opacity: 1 },
        }}
        transition={{ duration: 0.55, delay, ease: "easeOut" }}
      />
      <motion.polyline
        points="1,3 3.5,0.5 6,3"
        fill="none"
        stroke="#6743FF"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          show: { pathLength: 1, opacity: 1 },
        }}
        transition={{ duration: 0.3, delay: delay + 0.35, ease: "easeOut" }}
      />
      <motion.polyline
        points={`1,${height - 3} 3.5,${height - 0.5} 6,${height - 3}`}
        fill="none"
        stroke="#6743FF"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          show: { pathLength: 1, opacity: 1 },
        }}
        transition={{ duration: 0.3, delay: delay + 0.35, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

function MeasureHighlight({
  height,
  delay = 0,
}: {
  height: number;
  delay?: number;
}) {
  return (
    <motion.div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 462,
        height,
        backgroundColor: "#6743FF",
        opacity: 0.1,
        transformOrigin: "left center",
      }}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: false, amount: 0.7 }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
    />
  );
}

function TypeHierarchySection({ scale }: { scale?: number }) {
  const s = scale ?? 1;
  const W = 1440;
  const CONTENT_H = 2100;
  const SECTION_H = CONTENT_H * s;
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const threshold = window.innerHeight * 0.35;
      let idx = 0;
      for (let i = cardRefs.current.length - 1; i >= 0; i--) {
        const el = cardRefs.current[i];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < threshold) { idx = i; break; }
        }
      }
      setActiveCard(idx);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={sectionRef}
      className="relative w-full"
      data-light-section
      style={{ height: SECTION_H, backgroundColor: "#ECECEC" }}
    >
      {/* 左侧 sticky — 前3张卡片区域内保持固定，最后一张卡片时跟随滚走 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: SECTION_H * 0.70,
          pointerEvents: "none",
        }}
      >
      <div
        style={{
          position: "sticky",
          top: 120,
          height: 0,
          overflow: "visible",
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            transform: `scale(${s})`,
            transformOrigin: "top left",
            pointerEvents: "auto",
          }}
        >
          <div style={{ padding: "80px 40px" }}>
            {/* 标题 */}
            <AnimatePresence mode="wait">
              <motion.p
                key={TYPE_TITLES[activeCard]}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: 40,
                  lineHeight: "normal",
                  color: "#000",
                  whiteSpace: "pre-line",
                  margin: 0,
                }}
              >
                {TYPE_TITLES[activeCard]}
              </motion.p>
            </AnimatePresence>

            {/* Aa 展示框 */}
            <div
              style={{
                marginTop: 100,
                width: 132,
                height: 139,
                border: "2px solid #C0C1D0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", left: -5, top: "50%", transform: "translateY(-50%)", width: 7, height: 7, backgroundColor: "#DFDFE9", border: "2px solid #C0C1D0" }} />
              <div style={{ position: "absolute", right: -5, top: "50%", transform: "translateY(-50%)", width: 7, height: 7, backgroundColor: "#DFDFE9", border: "2px solid #C0C1D0" }} />
              <span
                style={{
                  fontFamily: "'Tilt Warp', sans-serif",
                  fontSize: 60,
                  fontWeight: 900,
                  color: "#5F5B7A",
                  lineHeight: "normal",
                }}
              >
                Aa
              </span>
            </div>

            {/* 动态描述 */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCard}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                style={{ marginTop: 40, width: 300, display: "flex", flexDirection: "column", gap: 4 }}
              >
                {activeCard === 0 && (
                  <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontSize: 10, fontWeight: 400, color: "#5F5B7A", lineHeight: 1.63, margin: 0 }}>
                    While we have a wide range of font weights at our disposal, we should still exercise restraint in their usage.
                  </p>
                )}
                {activeCard === 1 && (
                  <>
                    <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontSize: 10, fontWeight: 400, color: "#5F5B7A", lineHeight: 1.63, margin: 0 }}>
                      Font size <span style={{ fontWeight: 700, fontSize: 12 }}>(X)</span>px *130% = Line Height <span style={{ fontWeight: 700, fontSize: 12 }}>(Y)</span>
                    </p>
                    <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontSize: 10, fontWeight: 400, color: "#5F5B7A", lineHeight: 1.63, margin: 0 }}>
                      Font size <span style={{ fontWeight: 700, fontSize: 12 }}>(X)</span>px *145% = Line Height <span style={{ fontWeight: 700, fontSize: 12 }}>(Y)</span>
                    </p>
                  </>
                )}
                {activeCard === 2 && (
                  <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontSize: 10, fontWeight: 400, color: "#5F5B7A", lineHeight: 1.63, margin: 0 }}>
                    Font size <span style={{ fontWeight: 700, fontSize: 12 }}>(X)</span>px *160% = Line Height <span style={{ fontWeight: 700, fontSize: 12 }}>(Y)</span>
                  </p>
                )}
                {activeCard === 3 && (
                  <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontSize: 10, fontWeight: 400, color: "#5F5B7A", lineHeight: 1.63, margin: 0 }}>
                    Body text and explanatory text should maintain an appropriate character count per line.
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      </div>

      {/* 右侧正常流 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: W,
          transform: `scale(${s})`,
          transformOrigin: "top left",
        }}
      >
        <div style={{ padding: "80px 80px", paddingLeft: 600, display: "flex", flexDirection: "column", gap: 60 }}>
          {/* === 卡片1: 字体展示 (Lexend + Fugaz One) === */}
          <motion.div ref={(el) => { cardRefs.current[0] = el; }} initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0.6, scale: 0.97 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: false, amount: 0.4 }} style={{ background: "#fff", borderRadius: 20, padding: "40px" }}>
            {/* Lexend */}
            <div>
              <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 15, lineHeight: 1.3, color: "#5F5B7A", margin: 0 }}>
                Lexend
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 40, lineHeight: 1.4, color: "#464766", margin: 0, whiteSpace: "nowrap" }}>
                  Bold 700
                </p>
                <HorizontalPathArrow width={147} viewBoxWidth={147} />
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 12, lineHeight: 1.63, color: "#5F5B7A", margin: 0, whiteSpace: "nowrap" }}>
                  Headline, Key Content, Label
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24 }}>
                <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 400, fontSize: 40, lineHeight: 1.4, color: "#464766", margin: 0, whiteSpace: "nowrap" }}>
                  Regular 400
                </p>
                <HorizontalPathArrow width={91} viewBoxWidth={91.5} delay={0.08} />
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 12, lineHeight: 1.63, color: "#5F5B7A", margin: 0, whiteSpace: "nowrap" }}>
                  Sub-Title, Body, Caption
                </p>
              </div>
            </div>

            {/* Fugaz One */}
            <div style={{ marginTop: 60 }}>
              <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 15, lineHeight: 1.3, color: "#5F5B7A", margin: 0 }}>
                Fugaz One
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                <p style={{ fontFamily: "var(--font-fugaz-one), cursive", fontWeight: 400, fontSize: 40, lineHeight: 1.4, color: "#464766", margin: 0, fontStyle: "italic", whiteSpace: "nowrap" }}>
                  Fugaz One
                </p>
                <HorizontalPathArrow width={129} viewBoxWidth={129} delay={0.16} />
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 12, lineHeight: 1.63, color: "#5F5B7A", margin: 0, whiteSpace: "nowrap" }}>
                  Headline, Derivative
                </p>
              </div>
            </div>
          </motion.div>

          {/* === 卡片2: Headline Line Height === */}
          <motion.div ref={(el) => { cardRefs.current[1] = el; }} initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: false, amount: 0.4 }} style={{ background: "#fff", borderRadius: 20, padding: "40px", position: "relative" }}>
            {/* Headline | Lexend */}
            <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 15, lineHeight: 1.3, color: "#5F5B7A", margin: 0 }}>
              <span>Headline</span>
              <span style={{ display: "inline-block", width: 1, height: 12, backgroundColor: "#B3B3BF", margin: "0 8px", verticalAlign: "middle" }} />
              <span style={{ color: "#B3B3BF" }}>Lexend</span>
            </p>

            {/* Lexend 大字 + Line Height 130% 标注 */}
            <div style={{ marginTop: 24, position: "relative" }}>
              <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 30, lineHeight: 1.3, color: "#464766", margin: 0 }}>
                {"Headline，Sub-title"}
              </p>
              <div style={{ position: "relative", height: 17, marginTop: -5, marginBottom: -5 }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 462, borderTop: "1px dashed rgba(103,67,255,0.4)" }} />
                <MeasureHighlight height={17} />
                <div style={{ position: "absolute", bottom: 0, left: 0, width: 462, borderTop: "1px dashed rgba(103,67,255,0.4)" }} />
                <p style={{ position: "absolute", top: 1, left: 470, fontFamily: "var(--font-lexend), sans-serif", fontSize: 10, fontWeight: 400, color: "#6743FF", margin: 0, whiteSpace: "nowrap" }}>
                  Line Height 130%
                </p>
                <VerticalMeasureArrow height={17} />
              </div>
              <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 30, lineHeight: 1.3, color: "#464766", margin: 0 }}>
                Line Height 130%
              </p>
            </div>

            {/* Headline | Fugaz One */}
            <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 15, lineHeight: 1.3, color: "#5F5B7A", margin: 0, marginTop: 60 }}>
              <span>Headline</span>
              <span style={{ display: "inline-block", width: 1, height: 12, backgroundColor: "#B3B3BF", margin: "0 8px", verticalAlign: "middle" }} />
              <span style={{ color: "#B3B3BF" }}>Fugaz One</span>
            </p>

            {/* Fugaz One 大字 + Line Height 145% 标注 */}
            <div style={{ marginTop: 12, position: "relative" }}>
              <p style={{ fontFamily: "var(--font-fugaz-one), cursive", fontWeight: 400, fontSize: 30, lineHeight: 1.45, color: "#464766", margin: 0, fontStyle: "italic" }}>
                Headline
              </p>
              <div style={{ position: "relative", height: 21, marginTop: -6, marginBottom: -6 }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 462, borderTop: "1px dashed rgba(103,67,255,0.4)" }} />
                <MeasureHighlight height={21} delay={0.08} />
                <div style={{ position: "absolute", bottom: 0, left: 0, width: 462, borderTop: "1px dashed rgba(103,67,255,0.4)" }} />
                <p style={{ position: "absolute", top: 3, left: 470, fontFamily: "var(--font-lexend), sans-serif", fontSize: 10, fontWeight: 400, color: "#6743FF", margin: 0, whiteSpace: "nowrap" }}>
                  Line Height 145%
                </p>
                <VerticalMeasureArrow height={21} delay={0.08} />
              </div>
              <p style={{ fontFamily: "var(--font-fugaz-one), cursive", fontWeight: 400, fontSize: 30, lineHeight: 1.45, color: "#464766", margin: 0, fontStyle: "italic" }}>
                Line Height 145%
              </p>
            </div>
          </motion.div>

          {/* === 卡片3: Body / Line Height + Paragraph Spacing === */}
          <motion.div ref={(el) => { cardRefs.current[2] = el; }} initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: false, amount: 0.4 }} style={{ background: "#fff", borderRadius: 20, padding: "40px", position: "relative" }}>
            <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 15, lineHeight: 1.3, color: "#4C4962", margin: 0 }}>
              <span>Body</span>
              <span style={{ display: "inline-block", width: 1, height: 12, backgroundColor: "#B3B3BF", margin: "0 8px", verticalAlign: "middle" }} />
              <span style={{ color: "#B3B3BF" }}>Lexend</span>
            </p>

            <div style={{ marginTop: 24, position: "relative" }}>
              <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 400, fontSize: 30, lineHeight: 1.6, color: "#464766", margin: 0 }}>
                Body，Caption
              </p>
              <div style={{ position: "relative", height: 24, marginTop: -8, marginBottom: -8 }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 462, borderTop: "1px dashed rgba(103,67,255,0.4)" }} />
                <MeasureHighlight height={24} />
                <div style={{ position: "absolute", bottom: 0, left: 0, width: 462, borderTop: "1px dashed rgba(103,67,255,0.4)" }} />
                <p style={{ position: "absolute", top: 5, left: 470, fontFamily: "var(--font-lexend), sans-serif", fontSize: 10, fontWeight: 400, color: "#6743FF", margin: 0, whiteSpace: "nowrap" }}>
                  Line Height 160%
                </p>
                <VerticalMeasureArrow height={24} />
              </div>
              <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 400, fontSize: 30, lineHeight: 1.6, color: "#464766", margin: 0 }}>
                Line Height 160%
              </p>
            </div>

            <p style={{ marginTop: 20, fontFamily: "var(--font-lexend), sans-serif", fontSize: 10, fontWeight: 400, color: "#5F5B7A", lineHeight: 1.63, textAlign: "center" }}>
              Variable value 60px *160% = Line Height 96
            </p>

            <div style={{ marginTop: 48 }}>
              <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 15, lineHeight: 1.3, color: "#5F5B7A", margin: 0 }}>
                Paragraph Spacing
              </p>
              <div style={{ marginTop: 20, position: "relative" }}>
                <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 400, fontSize: 10, lineHeight: 1.6, color: "#464766", margin: 0 }}>
                  There were no fences at all by the roadside now, and the land was rough and untilled. Toward evening they cametoa great.
                </p>
                <div style={{ position: "relative", height: 19, marginTop: -4, marginBottom: -4 }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: 462, borderTop: "1px dashed rgba(103,67,255,0.4)" }} />
                  <MeasureHighlight height={19} delay={0.08} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, width: 462, borderTop: "1px dashed rgba(103,67,255,0.4)" }} />
                  <p style={{ position: "absolute", top: 2, left: 470, fontFamily: "var(--font-lexend), sans-serif", fontSize: 10, fontWeight: 400, color: "#6743FF", margin: 0, whiteSpace: "nowrap" }}>
                    {"Paragraph Spacing > 2/3 Line Height"}
                  </p>
                  <VerticalMeasureArrow height={19} delay={0.08} />
                </div>
                <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 400, fontSize: 10, lineHeight: 1.6, color: "#464766", margin: 0 }}>
                  There were no fences at all by the roadside now, and the land was rough and untilled. Toward evening they cametoa great forest where the trees grew so big and ciose together that their branches met over the road of yellow brick.
                </p>
              </div>
            </div>
          </motion.div>

          {/* === 卡片4: Character Width === */}
          <motion.div ref={(el) => { cardRefs.current[3] = el; }} initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} viewport={{ once: false, amount: 0.4 }} style={{ background: "#fff", borderRadius: 20, padding: 40, position: "relative", height: 460 }}>
            {/* 圆点: 0, 30, 60, 90 */}
            {[
              { val: "0", color: "#FF2E78", left: 0 },
              { val: "30", color: "#92BB00", left: 169 },
              { val: "60", color: "#92BB00", left: 338 },
              { val: "90", color: "#FF2E78", left: 507 },
            ].map((item) => (
              <div key={item.val} style={{ position: "absolute", top: 40, left: 40 + item.left, width: 30, height: 30, borderRadius: "50%", backgroundColor: item.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 12, color: "#fff" }}>
                  {item.val}
                </span>
              </div>
            ))}

            {/* 竖虚线: 从上到下生长 */}
            {[15, 184, 353, 521].map((left, i) => (
              <motion.div
                key={left}
                initial={{ height: 0 }}
                whileInView={{ height: 364 }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.25 + i * 0.12 }}
                viewport={{ once: false, amount: 0.4 }}
                style={{ position: "absolute", top: 76, left: 40 + left, width: 0, borderLeft: "1px dashed #C0C1D0" }}
              />
            ))}

            {/* Too Narrow */}
            <div style={{ position: "absolute", top: 111, left: 57 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width={10} height={11} viewBox="0 0 10 10.5" fill="none">
                  <rect width={3} height={5} fill="#FF2E78" />
                  <rect x={7} width={3} height={5} fill="#FF2E78" />
                  <path d="M1 10C1.39 9.33 2.72 8 4.9 8C7.09 8 8.61 9.33 9 10" stroke="#FF2E78" strokeWidth={2} />
                </svg>
                <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 12, lineHeight: 1.5, color: "#FF2E78", margin: 0 }}>
                  Too Narrow
                </p>
              </div>
            </div>
            <p style={{ position: "absolute", top: 134, left: 55, fontFamily: "var(--font-lexend), sans-serif", fontWeight: 400, fontSize: 10, lineHeight: 1.63, color: "#5F5B7A", margin: 0, width: 154 }}>
              Body text and explanatory text should maintain an appropriate character count per line.
            </p>

            {/* Ideal Range */}
            <div style={{ position: "absolute", top: 213, left: 57 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width={10} height={11} viewBox="0 0 10 11" fill="none">
                  <rect width={3} height={5} fill="#92BB00" />
                  <rect x={7} width={3} height={5} fill="#92BB00" />
                  <path d="M9 8C8.61 8.67 7.28 10 5.1 10C2.91 10 1.39 8.67 1 8" stroke="#92BB00" strokeWidth={2} />
                </svg>
                <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 12, lineHeight: 1.5, color: "#92BB00", margin: 0 }}>
                  Ideal Range
                </p>
              </div>
            </div>
            <p style={{ position: "absolute", top: 236, left: 55, fontFamily: "var(--font-lexend), sans-serif", fontWeight: 400, fontSize: 10, lineHeight: 1.63, color: "#5F5B7A", margin: 0, width: 338 }}>
              Body text and explanatory text should maintain an appropriate character count per line. Excessive character count in a line can lead to prolonged fixation, making it challenging to concentrate.
            </p>

            {/* Too Wide */}
            <div style={{ position: "absolute", top: 316, left: 57 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width={10} height={11} viewBox="0 0 10 10.5" fill="none">
                  <rect width={3} height={5} fill="#FF2E78" />
                  <rect x={7} width={3} height={5} fill="#FF2E78" />
                  <path d="M1 10C1.39 9.33 2.72 8 4.9 8C7.09 8 8.61 9.33 9 10" stroke="#FF2E78" strokeWidth={2} />
                </svg>
                <p style={{ fontFamily: "var(--font-lexend), sans-serif", fontWeight: 700, fontSize: 12, lineHeight: 1.5, color: "#FF2E78", margin: 0 }}>
                  Too Wide
                </p>
              </div>
            </div>
            <p style={{ position: "absolute", top: 339, left: 55, fontFamily: "var(--font-lexend), sans-serif", fontWeight: 400, fontSize: 10, lineHeight: 1.63, color: "#5F5B7A", margin: 0, width: 506 }}>
              Body text and explanatory text should maintain an appropriate character count per line. Excessive character count in a line can lead to prolonged fixation, making it challenging to concentrate. Conversely, too few characters per line can result in frequent eye movements and disrupt the reading flow. Optimal character count in text contributes to improved comprehension of lengthy content and enhances readability.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function TiltCard({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale3d(1.03,1.03,1.03)`,
      transition: "transform 0.1s ease-out",
    });
  };

  const handleLeave = () => {
    setStyle({
      transform: "perspective(600px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)",
      transition: "transform 0.4s cubic-bezier(0.25,1,0.5,1)",
    });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ ...style, transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

function OverviewSection({ scale }: { scale?: number }) {
  const t = useT();
  const s = scale ?? 1;
  const gap = OVERVIEW_GAP;
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let rafId: number | null = null;
    let active = false;

    const update = () => {
      rafId = null;
      const rect = section.getBoundingClientRect();
      const vpH = window.innerHeight;
      const stickyRange = rect.height - vpH;
      if (stickyRange <= 0) return;
      const scrolled = Math.max(0, -rect.top);
      setProgress(Math.min(1, scrolled / stickyRange));
    };

    const onScroll = () => {
      if (!active || rafId !== null) return;
      rafId = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          active = e.isIntersecting;
          if (active) update();
        }
      },
      { rootMargin: "200px 0px 200px 0px" }
    );
    io.observe(section);

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // 每张卡片根据自己的 index 在 progress 的不同阶段入场
  // 标题: progress 0~0.15 入场
  // 卡片: progress 0.1~0.8 间依次入场 (stagger)
  const titleProgress = Math.min(1, progress / 0.15);
  const cardProgress = (index: number, total: number) => {
    const start = 0.1 + (index / total) * 0.5;
    const end = start + 0.2;
    return Math.max(0, Math.min(1, (progress - start) / (end - start)));
  };

  const SCROLL_H = OVERVIEW_H + 1200;

  // 卡片入场方向和 index 映射
  const cards: { src: string; w: number; h: number; col: number; idx: number }[] = [
    { ...OVERVIEW_CARDS[0], col: 1, idx: 0 },
    { ...OVERVIEW_CARDS[1], col: 1, idx: 3 },
    { ...OVERVIEW_CARDS[2], col: 2, idx: 1 },
    { ...OVERVIEW_CARDS[3], col: 2, idx: 1 },
    { ...OVERVIEW_CARDS[4], col: 2, idx: 2 },
    { ...OVERVIEW_CARDS[5], col: 2, idx: 4 },
    { ...OVERVIEW_CARDS[6], col: 3, idx: 0 },
    { ...OVERVIEW_CARDS[7], col: 3, idx: 3 },
  ];

  const getCardStyle = (colIdx: number, cardIdx: number): CSSProperties => {
    const p = cardProgress(cardIdx, 8);
    const fromX = colIdx === 1 ? -60 : colIdx === 3 ? 60 : 0;
    const fromY = colIdx === 2 ? 60 : 0;
    return {
      position: "relative" as const,
      opacity: p,
      transform: `translate3d(${fromX * (1 - p)}px, ${fromY * (1 - p)}px, 0)`,
      willChange: "opacity, transform",
    };
  };

  const allCardsIn = progress >= 0.85;

  return (
    <div id="projects" ref={sectionRef} className="relative w-full" style={{ height: SCROLL_H * s }}>
      <div className="sticky top-0 left-0 w-full overflow-hidden" style={{ height: OVERVIEW_H * s }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1440,
            height: OVERVIEW_H,
            transform: `scale(${s})`,
            transformOrigin: "top left",
          }}
        >
          {/* 标题区域 */}
          <div
            className="flex flex-col items-center"
            style={{
              position: "absolute",
              top: 120,
              left: 320,
              width: 800,
              height: 224,
              opacity: titleProgress,
              transform: `translateY(${40 * (1 - titleProgress)}px)`,
              willChange: "opacity, transform",
            }}
          >
            <img
              src="/figma/credmex/overview-logo.svg"
              alt="Credmex"
              draggable={false}
              className="block select-none"
              style={{ width: 511, height: 124 }}
            />
            <p
              style={{
                width: 1000,
                margin: "12px 0 0",
                color: "#949494",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--stage-text-h4)",
                fontWeight: 400,
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              <span>{t("Credmex 是一个", "Credmex is an ")}</span>
              <span style={{ color: "#ECECEC" }}>{t("面向墨西哥市场的线上个人贷款 / 小额信贷平台", "online personal & micro-lending platform for the Mexican market")}</span>
              <span>{t("，主要通过手机 App 提供快速贷款服务。", ", delivering fast loan services primarily through its mobile app.")}</span>
            </p>
          </div>

          {/* 卡片区域 */}
          <div
            className="absolute flex justify-center"
            style={{ top: 120 + 296, left: 0, width: 1440, gap }}
          >
            {/* 列1: 从左侧滑入 */}
            <div className="flex flex-col" style={{ gap, width: 339 }}>
              <div style={getCardStyle(1, 0)}>
                <TiltCard enabled={allCardsIn}>
                  <img src={OVERVIEW_CARDS[0].src} alt="" draggable={false} className="block rounded-[20px] select-none" style={{ width: 339, height: 485 }} />
                </TiltCard>
              </div>
              <div style={getCardStyle(1, 3)}>
                <TiltCard enabled={allCardsIn}>
                  <img src={OVERVIEW_CARDS[1].src} alt="" draggable={false} className="block rounded-[20px] select-none" style={{ width: 339, height: 292 }} />
                </TiltCard>
              </div>
            </div>
            {/* 列2: 从下方滑入 */}
            <div className="flex flex-col" style={{ gap, width: 482 }}>
              <div className="flex" style={{ gap }}>
                <div style={getCardStyle(2, 1)}>
                  <TiltCard enabled={allCardsIn}>
                    <img src={OVERVIEW_CARDS[2].src} alt="" draggable={false} className="block rounded-[20px] select-none" style={{ width: 189, height: 189 }} />
                  </TiltCard>
                </div>
                <div style={getCardStyle(2, 2)}>
                  <TiltCard enabled={allCardsIn}>
                    <img src={OVERVIEW_CARDS[3].src} alt="" draggable={false} className="block rounded-[20px] select-none" style={{ width: 273, height: 189 }} />
                  </TiltCard>
                </div>
              </div>
              <div style={getCardStyle(2, 4)}>
                <TiltCard enabled={allCardsIn}>
                  <img src={OVERVIEW_CARDS[4].src} alt="" draggable={false} className="block rounded-[20px] select-none" style={{ width: 482, height: 343 }} />
                </TiltCard>
              </div>
              <div style={getCardStyle(2, 5)}>
                <TiltCard enabled={allCardsIn}>
                  <img src={OVERVIEW_CARDS[5].src} alt="" draggable={false} className="block rounded-[20px] select-none" style={{ width: 482, height: 225 }} />
                </TiltCard>
              </div>
            </div>
            {/* 列3: 从右侧滑入 */}
            <div className="flex flex-col" style={{ gap, width: 339 }}>
              <div style={getCardStyle(3, 6)}>
                <TiltCard enabled={allCardsIn}>
                  <img src={OVERVIEW_CARDS[6].src} alt="" draggable={false} className="block rounded-[20px] select-none" style={{ width: 339, height: 292 }} />
                </TiltCard>
              </div>
              <div style={getCardStyle(3, 7)}>
                <TiltCard enabled={allCardsIn}>
                  <img src={OVERVIEW_CARDS[7].src} alt="" draggable={false} className="block rounded-[20px] select-none" style={{ width: 339, height: 485 }} />
                </TiltCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * 子段 1: 品牌宣传
 * Figma: 标题 561:15318 (320,133 800x196), Macbook 561:15324
 * (290,369 848x517), 屏幕图 561:15329 (379,451 669x325), 黄色
 * 便签 561:15326 (1093,483 177x167)
 * ============================================================ */
function BrandSection({ scale = 1 }: { scale?: number }) {
  const t = useT();
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [macbookHover, setMacbookHover] = useState(false);

  useEffect(() => {
    const el = parallaxRef.current;
    if (!el) return;
    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      const progress = Math.max(0, Math.min(1, (viewH - rect.top) / (viewH + rect.height)));
      setScrollY(progress);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 视差：电脑比标题多移动 30px，带弹性曲线
  const parallaxOffset = (0.5 - scrollY) * 60;
  // 弹性插值
  const springY = parallaxOffset * 0.6;

  return (
    <RevealGroup triggerTop={620}>
      <div ref={parallaxRef} style={{ position: "absolute", inset: 0 }} />
      {/* 标题 + 副标题 */}
      <SectionHeader
        scale={scale}
        title={t("品牌宣传", "Brand Marketing")}
        top={253}
        descriptionParts={[
          {
            text: t(
              "梳理并整合现有品牌资产，提炼 Credmex 的核心品牌特性，并结合 Framer 组件动画，",
              "Auditing and consolidating existing brand assets, distilling Credmex's core brand traits, and pairing them with Framer component animation to "
            ),
            color: "#949494",
          },
          { text: t("搭建具有品牌识别度与传播力", "build a recognizable, high-impact"), color: "#ECECEC" },
          { text: t("的官网宣传页面。", " marketing website."), color: "#949494" },
        ]}
      />

      {/* Macbook + 视差动画 (外层只做 translateY 视差, 不加 transition 以免滚动卡顿) */}
      <div
        className="absolute select-none"
        style={{
          left: 290,
          top: 489,
          width: 848,
          height: 517,
          transform: `translateY(${springY}px)`,
          willChange: "transform",
        }}
      >
      {/* 内层: hover 整机放大 1.2x (含电脑外框 + 屏幕 iframe 一起缩放) */}
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${macbookHover ? 1.2 : 1})`,
          transformOrigin: "center center",
          transition: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        {/* Macbook 机身外壳: 黑色边框 + 底座, 屏幕区域为纯黑.
            放在最底层 (zIndex 1), 上面盖 iframe (zIndex 2) 充当屏幕内容,
            最后再叠一张机身图 (zIndex 3) 用于盖住 iframe 边缘 — 这里
            因为屏幕区域 = iframe 区域刚好对齐机身的屏幕亮区, 不需要
            再盖一层, 直接放在底下作为"屏幕外框"即可 */}
        <img
          src="/figma/credmex/macbook.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 block max-w-none object-contain"
          style={{ width: 848, height: 517, zIndex: 1 }}
        />
        {/* 屏幕内嵌入 Credmex 品牌站 (https://credmexbranding.framer.wiki/).
            屏幕亮区 = (89,34) 670×422 (Figma 节点 561:15325).
            内层 <iframe> 按桌面分辨率 1440×908 渲染, 再 transform: scale
            缩到屏幕亮区大小, 这样 Framer 站保留 desktop 排版且字号清晰.
            scale = 670 / 1440 ≈ 0.4653
            内层高度 = 422 / scale ≈ 907 → 取 908.
            交互: 鼠标进入 iframe 区域时可以滚动 framer 站; 滚出去时
            iframe 不抢页面滚动 (pointerEvents 在 hover 切换).  */}
        <ScreenIframe onHoverChange={setMacbookHover} />
      </div>
      </div>

      {/* hover slide 黄色便签 */}
      <StickyNote />
      <StickyNote2 />
    </RevealGroup>
  );
}

/* ============================================================
 * 素材库搭建: 屏幕内嵌 credmexhub 素材库站 iframe.
 * 屏幕亮区 638×359 (相对显示器 14,15). iframe 按桌面 1440 宽渲染再
 * scale 缩到屏幕大小, 保留 desktop 排版. 默认 pointer-events:none
 * 滚轮穿透; hover 时 auto, 可滚动站内内容.
 * ============================================================ */
function MaterialScreen() {
  const t = useT();
  const [hover, setHover] = useState(false);
  const SCREEN_W = 638;
  const SCREEN_H = 359;
  const IFRAME_W = 1440;
  // 跟品牌宣传同款: iframe 按 1440 桌面宽渲染再 scale 缩到屏幕宽, 内容贴边满铺.
  // 1440 * iframeScale = 638 正好填满屏幕宽度
  const iframeScale = SCREEN_W / IFRAME_W; // ≈ 0.4431
  // 底部横向滚动条 (纵向滚动条占宽挤出的水平溢出) 不要: iframe 多给一个滚动条
  // 高度 (桌面约 18px), 底部含横向滚动条的部分溢出被 overflow:hidden 裁掉,
  // 右侧纵向滚动条不受影响
  const SCROLLBAR_H = 18;
  const iframeH = Math.ceil(SCREEN_H / iframeScale) + SCROLLBAR_H; // ≈ 828
  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: 14,
        top: 15,
        width: SCREEN_W,
        height: SCREEN_H,
        borderRadius: 2,
        // 深色底: framer 页面深色满铺, 即便有像素级缝隙也不会露白边
        backgroundColor: "#16161f",
        zIndex: 1,
        pointerEvents: "auto",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <iframe
        src="https://ambiguous-reason-487790.framer.app/"
        title={t("Credmex Hub 素材库", "Credmex Hub Asset Library")}
        loading="lazy"
        tabIndex={-1}
        className="block"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: IFRAME_W,
          height: iframeH,
          border: 0,
          transform: `scale(${iframeScale})`,
          transformOrigin: "top left",
          pointerEvents: hover ? "auto" : "none",
          backgroundColor: "#16161f",
        }}
      />
    </div>
  );
}

/* ============================================================
 * 子段: 素材库搭建
 * Figma 节点 1864:42141 (1440×800). 黑底, 标题居中 (top 120) +
 * Studio Display XDR 显示器 (387,350 666×569). 屏幕亮区 (相对显示器
 * 14,15) 638×359 — 顶层覆盖一层内容 (Figma 占位 #252525), 用来放
 * 素材库站内容. 结构与品牌宣传一致: 显示器 PNG 在底, 内容层盖在屏幕上.
 * ============================================================ */
function MaterialLibrarySection({ scale = 1 }: { scale?: number }) {
  const t = useT();
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [displayHover, setDisplayHover] = useState(false);

  useEffect(() => {
    const el = parallaxRef.current;
    if (!el) return;
    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      const progress = Math.max(
        0,
        Math.min(1, (viewH - rect.top) / (viewH + rect.height))
      );
      setScrollY(progress);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 显示器轻微视差 (跟品牌宣传同一节奏)
  const springY = (0.5 - scrollY) * 60 * 0.6;

  return (
    <RevealGroup triggerTop={400}>
      <div ref={parallaxRef} style={{ position: "absolute", inset: 0 }} />

      {/* 标题 + 副标题 */}
      <SectionHeader
        scale={scale}
        title={t("素材库搭建", "Asset Library")}
        top={120}
        descriptionParts={[
          {
            text: t(
              "系统盘点并归类现有品牌资产，沉淀视觉规范与高频素材，形成标准化素材库，",
              "Systematically auditing and categorizing existing brand assets, codifying visual standards and high-frequency materials into a standardized asset library to "
            ),
            color: "#949494",
          },
          { text: t("提升", "improve"), color: "#ECECEC" },
          { text: t("后续", " the efficiency of"), color: "#949494" },
          { text: t("素材使用效率", " future asset usage"), color: "#ECECEC" },
        ]}
      />

      {/* Studio Display XDR 显示器. 外层只做 translateY 视差 (不加 transition 防滚动卡顿),
          hover 监听放在外层覆盖整机区域 */}
      <div
        className="absolute select-none"
        style={{
          left: 387,
          top: 350,
          width: 666,
          height: 569,
          transform: `translateY(${springY}px)`,
          willChange: "transform",
          pointerEvents: "auto",
        }}
        onMouseEnter={() => setDisplayHover(true)}
        onMouseLeave={() => setDisplayHover(false)}
      >
        {/* 内层: hover 整机等比放大 (含显示器 + 屏幕内容一起缩放), 跟品牌宣传 Macbook 同款 */}
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${displayHover ? 1.1 : 1})`,
            transformOrigin: "center center",
            transition: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "transform",
          }}
        >
          {/* 屏幕内容层: 盖住显示器 PNG 自带的样图, 屏幕亮区 = (14,15) 638×359.
              嵌入素材库站 (credmexhub), hover 才可滚动, 平时滚轮穿透到页面 */}
          <MaterialScreen />

          {/* 显示器外框 (含屏幕样图 + 边框 + 底座). 放在内容层之下,
              内容层精准盖住屏幕亮区, 边框/底座露在四周 */}
          <img
            src="/figma/credmex/studio-display.webp"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 block max-w-none object-contain pointer-events-none"
            style={{ width: 666, height: 569, zIndex: 0 }}
          />
        </div>
      </div>
    </RevealGroup>
  );
}


function StickyNote2() {
  const ctx = useContext(RevealCtx);
  const visible = ctx?.visible ?? true;
  // 终态: stage 坐标 (172, 722). 从左上画布外飞入 (-400, -280), rotate +15°
  // 延迟 = 黄色便签 600ms + 5000ms 间隔 = 5600ms
  const dx = visible ? 0 : -400;
  const dy = visible ? 0 : -280;
  const rot = visible ? 0 : 15;
  return (
    <img
      src="/figma/credmex/sticky-note-2.png"
      alt=""
      draggable={false}
      className="absolute block max-w-none select-none"
      style={{
        left: 172,
        top: 722,
        width: 148,
        height: 141,
        zIndex: 10,
        opacity: visible ? 1 : 0,
        transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`,
        transformOrigin: "50% 50%",
        transition:
          "opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) 2400ms, transform 900ms cubic-bezier(0.22, 1, 0.36, 1) 2400ms",
        willChange: "opacity, transform",
      }}
    />
  );
}

function StickyNote() {
  const ctx = useContext(RevealCtx);
  const visible = ctx?.visible ?? true;
  // 终态: stage 坐标 (1093, 483). 起飞点: 进一步往右下平移 (+520, +320)
  // 让它从 stage 画布外侧右下角飞入, 角度从 -18° 旋回 0°
  const dx = visible ? 0 : 520;
  const dy = visible ? 0 : 320;
  const rot = visible ? 0 : -18;
  return (
    <img
      src="/figma/credmex/sticky-note.png"
      alt="hover slide"
      draggable={false}
      className="absolute block max-w-none select-none"
      style={{
        left: 1093,
        top: 603,
        width: 177,
        height: 167,
        zIndex: 10,
        opacity: visible ? 1 : 0,
        transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`,
        transformOrigin: "50% 50%",
        transition:
          "opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) 1200ms, transform 900ms cubic-bezier(0.22, 1, 0.36, 1) 1200ms",
        willChange: "opacity, transform",
      }}
    />
  );
}

/* ============================================================
 * 子段 2: 产品搭建 (独立于 scale stage)
 * 效果: 标题 sticky 在 top:120, 基线图从画布左外滑入.
 * 使用额外滚动行程驱动图片 translateX: -100% → 0.
 * ============================================================ */
const PRODUCT_SCROLL_H = 3600;
const BASELINE_IMG_W = 2721;

function ProductSection() {
  const t = useT();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const img = imgRef.current;
    if (!section || !img) return;

    let active = false;
    let rafId: number | null = null;
    let containerW = 0;
    let imgW = 0;

    const measure = () => {
      const parent = img.parentElement;
      containerW = parent?.offsetWidth ?? window.innerWidth;
      imgW = img.offsetWidth || BASELINE_IMG_W;
    };

    const update = () => {
      rafId = null;
      const rect = section.getBoundingClientRect();
      const vpH = window.innerHeight;
      const stickyRange = rect.height - vpH;
      if (stickyRange <= 0) return;
      const scrolled = Math.max(0, -rect.top);
      const progress = Math.min(1, scrolled / stickyRange);
      // progress 0: 图左端在容器右外 (translateX = containerW)
      // progress 1: 图右端对齐容器右边 (translateX = -(imgW - containerW))
      const startX = containerW;
      const endX = -(imgW - containerW);
      const shift = startX + (endX - startX) * progress;
      img.style.transform = `translate3d(${shift}px, 0, 0)`;
    };

    const onScroll = () => {
      if (!active || rafId !== null) return;
      rafId = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          active = e.isIntersecting;
          if (active) {
            setEntered(true);
            measure();
            update();
          }
        }
      },
      { rootMargin: "200px 0px 200px 0px" }
    );
    io.observe(section);

    const ro = new ResizeObserver(() => { measure(); update(); });
    ro.observe(section);

    window.addEventListener("scroll", onScroll, { passive: true });
    measure();
    update();
    return () => {
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      id="product"
      ref={sectionRef}
      className="relative w-full"
      style={{ height: PRODUCT_SCROLL_H }}
    >
      {/* sticky 容器: 标题 + 图片固定在视区 */}
      <div
        className="sticky top-0 left-0 w-full overflow-hidden"
        style={{ height: "100vh" }}
      >
        {/* 标题固定在 top:120，带出场动画 */}
        <div
          className="flex flex-col items-center select-none"
          style={{ paddingTop: 120, gap: 40 }}
        >
          <p
            style={{
              fontSize: 64,
              color: "#ffffff",
              fontWeight: 600,
              lineHeight: 1,
              margin: 0,
              whiteSpace: "nowrap",
              letterSpacing: "0.02em",
              opacity: entered ? 1 : 0,
              transform: `translateY(${entered ? 0 : 40}px)`,
              transition: "opacity 900ms cubic-bezier(0.22,1,0.36,1), transform 900ms cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {t("产品搭建", "Product Building")}
          </p>
          <p
            style={{
              fontSize: 18,
              fontWeight: 400,
              lineHeight: 1.6,
              margin: 0,
              textAlign: "center",
              maxWidth: 800,
              opacity: entered ? 1 : 0,
              transform: `translateY(${entered ? 0 : 40}px)`,
              transition: "opacity 900ms cubic-bezier(0.22,1,0.36,1) 100ms, transform 900ms cubic-bezier(0.22,1,0.36,1) 100ms",
            }}
          >
            <span style={{ color: "#949494" }}>
              {t("从需求出发，系统梳理产品逻辑与用户路径，", "Starting from real needs, systematically mapping product logic and user journeys to ")}
            </span>
            <span style={{ color: "#ECECEC" }}>{t("构建清晰、高效、美观", "build a clear, efficient and elegant")}</span>
            <span style={{ color: "#949494" }}>{t("的 APP 功能体验。", " in-app feature experience.")}</span>
          </p>
        </div>

        {/* 基线图: 从右外滑入，完整浏览后结束 */}
        <div
          className="absolute left-0 w-full overflow-hidden"
          style={{ top: 320, bottom: 0 }}
        >
          <img
            ref={imgRef}
            src="/figma/credmex/baseline.webp"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="block max-w-none select-none"
            style={{
              height: "100%",
              width: "auto",
              transform: "translate3d(100vw, 0, 0)",
              willChange: "transform",
              filter: "grayscale(1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Paste App Key Features — 4屏子组件
 * ============================================================ */

function PasteScreen({
  label,
  title,
  opacity,
  translateY,
  children,
}: {
  label: string;
  title: React.ReactNode;
  opacity: number;
  translateY: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity,
        transform: `translateY(${translateY}px)`,
        pointerEvents: opacity > 0.5 ? "auto" : "none",
        willChange: "transform, opacity",
      }}
    >
      <div style={{ textAlign: "center", zIndex: 10, marginTop: 40 }}>
        <p style={{ fontSize: "0.83em", color: "#767676", margin: 0, fontWeight: 600 }}>
          {label}
        </p>
        <h2
          style={{
            fontSize: "2.78em",
            fontWeight: 600,
            color: "#595959",
            textAlign: "center",
            margin: "8px 0 0",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ width: "100%", marginTop: 50, position: "relative", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}


/* Screen 3: ORGANIZE — 完全按 Paste App 源码参数实现
 * 数据来自 Paste App HTML 源码的 framer transform 值
 *
 * 时间轴 (按源码中 transform 关键帧位置):
 *   t=0.00~0.30: 3张 Card 滑入 (translateX 1000/1400/1800px → 0)
 *   t=0.30~0.50: 3张 Card 散开消失
 *     - Card 1: translateX 0 → -140px, opacity 1 → 0
 *     - Card 2: translateY 0 → 100px, scale 1 → 3.2, opacity 1 → 0  (向前放大撞屏)
 *     - Card 3: translateX 0 → +140px, opacity 1 → 0
 *   t=0.50~0.70: Card 0 出现 (中央大卡片, translateY 220 rotate -8deg)
 *   t=0.70~1.00: 7张 Collection 标签飞出
 *     - Coll 1: 中央位置 (无 translate)
 *     - Coll 2: translateX 10, translateY -700, rotate -13
 *     - Coll 3: translateX -40, translateY -900, rotate 42
 *     - Coll 4: translateX 20, translateY -1000, rotate -48 (居中)
 *     - Coll 5: translateX 30, translateY -1100, rotate -36
 *     - Coll 6: translateX 46, translateY -1200, rotate -34
 *     - Coll 7: translateX 10, translateY -1000, rotate -46
 */
const BRAND_COLORS = ["#C5FB00", "#5338FF", "#160F2D", "#FF2E78"];

function BrandColorText({ progress }: { progress: number }) {
  const tr = useT();
  const t = Math.max(0, progress);
  const [colorIdx, setColorIdx] = useState(0);
  const cycling = t >= 0.98;

  useEffect(() => {
    if (!cycling) return;
    const interval = setInterval(() => {
      setColorIdx((prev) => (prev + 1) % BRAND_COLORS.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [cycling]);

  const color = cycling ? BRAND_COLORS[colorIdx] : "#595959";
  const prevColor = cycling
    ? BRAND_COLORS[(colorIdx - 1 + BRAND_COLORS.length) % BRAND_COLORS.length]
    : "#595959";

  // 翻牌动画改用 key + CSS animation: colorIdx 每变一次, 内层整体 remount,
  // flip 动画自动从头播放。取代原先 "effect 内同步 setFlip(false) 再 rAF
  // setFlip(true)" 的写法 (会触发级联渲染, React 19 不再推荐)。
  const label = tr("品牌色", "brand colors");
  return (
    <span
      style={{
        marginLeft: 4,
        display: "inline-block",
        position: "relative",
        overflow: "hidden",
        height: "1.2em",
        verticalAlign: "bottom",
      }}
    >
      <span key={cycling ? colorIdx : "static"} style={{ display: "block" }}>
        <span
          style={{
            display: "block",
            color: prevColor,
            animation: cycling
              ? "credmex-brand-flip-out 1s cubic-bezier(0.22,1,0.36,1) both"
              : "none",
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: "block",
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            color,
            transform: cycling ? undefined : "translateY(100%)",
            animation: cycling
              ? "credmex-brand-flip-in 1s cubic-bezier(0.22,1,0.36,1) both"
              : "none",
          }}
        >
          {label}
        </span>
      </span>
    </span>
  );
}

function OrganizeAnimation({ progress }: { progress: number }) {
  const t = Math.max(0, progress);

  // 设计稿 1440×800, 百分比定位
  // 卡片 360×206, 保持原始宽高比
  const cardWPct = 360 / 1440 * 100;  // 25%
  const cardYPct = 0;    // 卡片顶部在 children 容器顶部（标题下方 50px 处）
  const cards = [
    { src: "/figma/credmex/paste-organize/login-card-1.webp", xPct: 160 / 1440 * 100, startX: 450, delay: 0 },
    { src: "/figma/credmex/paste-organize/login-card-3.webp", xPct: 540 / 1440 * 100, startX: 300, delay: 0.12 },
    { src: "/figma/credmex/paste-organize/login-card-2.webp", xPct: 920 / 1440 * 100, startX: 250, delay: 0.24 },
  ];


  // ============ 时间轴 ============
  // t 0.00~0.20: 3 卡片从右侧滑入到 25%/50%/75% 位置, 间距正常
  // t 0.20~0.35: 3 卡片向中央聚拢 (leftPct → 50%), 同时缩小 (1.0 → 0.05)
  // t 0.30~0.40: 中央出现红圆点 halo (淡入)
  // t 0.40~0.55: 红圆点变 Read Later 标签 (右侧文字渐入, 容器从圆形展开为胶囊)
  // t 0.55~0.75: Read Later 向下平移到底部位置, 同时其他 6 标签从中央散开 (带旋转)
  // t 0.75~1.00: 保持终态 (所有标签散落到位)

  const cardEnter = Math.min(1, Math.max(0, t / 0.30));
  const cardShrink = Math.min(1, Math.max(0, (t - 0.45) / 0.20));
  const dotFadeIn = Math.min(1, Math.max(0, (t - 0.55) / 0.12));
  const tagExpand = Math.min(1, Math.max(0, (t - 0.72) / 0.16));
  const scatter = Math.min(1, Math.max(0, (t - 0.84) / 0.08));
  const capsuleDrop = Math.min(1, Math.max(0, (t - 0.88) / 0.12));

  const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

  // 红圆点位置 (卡片消失位置: 聚拢到中心, 居中缩放)
  const cxPct = 50; // 水平居中
  const cardHPct = 206 / 800 * 100;
  const cyPct = 25; // 卡片视觉中心

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        {/* ===== 3张卡片: 滑入 → 向中央聚拢缩小消失 ===== */}
        {cards.map((card, i) => {
          const enterT = easeOut(Math.min(1, Math.max(0, (cardEnter - card.delay) / 0.8)));
          const enterTX = (1 - enterT) * card.startX;

          const shrinkT = easeOut(cardShrink);
          const cardCenterPct = card.xPct + cardWPct / 2;
          const targetXPct = (cxPct - cardCenterPct) * shrinkT;
          const sc = 1 - shrinkT * 0.95;
          // 透明度：缩放到 50% (shrinkT >= ~0.53) 才开始淡出
          const fadeT = Math.max(0, (shrinkT - 0.53) / 0.47);
          const op = enterT > 0.01 ? (1 - fadeT) : 0;

          if (op < 0.01) return null;
          return (
            <img
              key={i}
              src={card.src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                top: `${cardYPct}%`,
                left: `${card.xPct + targetXPct}%`,
                width: `${cardWPct}%`,
                aspectRatio: "360 / 206",
                opacity: op,
                transform: `translateX(${enterTX}%) scale(${sc})`,
                transformOrigin: "center center",
                zIndex: 3 - i,
                willChange: "transform, opacity",
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* ===== 绿圆点 halo: 卡片消失后浮现, 胶囊展开后隐藏 ===== */}
        {dotFadeIn > 0.01 && tagExpand < 0.99 && capsuleDrop < 0.01 && (
          <div
            style={{
              position: "absolute",
              top: "25%",
              left: `${cxPct}%`,
              width: 32,
              height: 32,
              marginLeft: -16,
              marginTop: -16,
              borderRadius: "50%",
              backgroundColor: "#C5FB00",
              opacity: dotFadeIn,
              boxShadow: `0 0 0 ${10 + dotFadeIn * 20}px rgba(197,251,0,${0.5 * (1 - dotFadeIn)}), 0 0 ${30 + dotFadeIn * 40}px rgba(197,251,0,${0.5 * (1 - dotFadeIn)})`,
              transform: `scale(${0.6 + dotFadeIn * 0.4})`,
              willChange: "transform, opacity",
              pointerEvents: "none",
            }}
          />
        )}

        {/* ===== Energy Green 标签: 胶囊底+文字从右侧滑入 ===== */}
        {tagExpand > 0.01 && (() => {
          const expandEased = easeOut(tagExpand);
          const scatterEased = easeOut(scatter);

          // 文字从右侧滑入 + 透明度渐入
          const textSlideX = (1 - expandEased) * 40;
          const textOp = expandEased;

          // 胶囊完全出现后移到X轴中心
          const moveT = easeOut(scatterEased);
          const txStart = -28; // px
          const txCenter = moveT === 0 ? `${txStart}px` : moveT >= 1 ? "-50%" : `calc(${txStart * (1 - moveT)}px + ${-50 * moveT}%)`;

          // capsuleDrop 阶段：主胶囊垂直落到设计稿位置 (66.4%)，滚动步幅加大.
          const dropRaw = Math.min(1, capsuleDrop);
          const n1 = 7.5625, d1 = 2.75;
          const dropT = dropRaw < 1/d1 ? n1*dropRaw*dropRaw : dropRaw < 2/d1 ? n1*(dropRaw-1.5/d1)**2+0.75 : dropRaw < 2.5/d1 ? n1*(dropRaw-2.25/d1)**2+0.9375 : n1*(dropRaw-2.625/d1)**2+0.984375;
          const curTop = 25 + (72.5 - 25) * dropT;
          const curLeft = cxPct;
          const tx = capsuleDrop > 0.01 ? "-50%" : txCenter;

          return (
            <div
              style={{
                position: "absolute",
                top: `${curTop}%`,
                left: `${curLeft}%`,
                transform: `translateX(${tx}) translateY(-50%)`,
                display: "flex",
                alignItems: "center",
                height: 59,
                borderRadius: 67.5,
                backgroundColor: `rgba(240,240,240,${expandEased})`,
                padding: "12px 16px 12px 12px",
                gap: 12,
                willChange: "transform, opacity",
                pointerEvents: "none",
                overflow: "hidden",
              }}
            >
              {/* 绿色圆点 (与独立圆点对齐) */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: "#C5FB00",
                  flexShrink: 0,
                }}
              />
              {/* 文字从右侧滑入 */}
              <span
                style={{
                  fontSize: 24,
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  color: "#3B3B3B",
                  whiteSpace: "nowrap",
                  opacity: textOp,
                  transform: `translateX(${textSlideX}px)`,
                  willChange: "transform, opacity",
                }}
              >
                Energy Green
              </span>
            </div>
          );
        })()}

        {/* ===== 其他胶囊：灵动漂浮进入 ===== */}
        {capsuleDrop > 0.01 && (
          <FloatingTagsHero
            progress={capsuleDrop}
            tags={[
              { label: "Greyscale/75%L", color: "#C0C0CA", cx: 17, cy: 72.5, rot: 0 },
              { label: "Vogue Pink", color: "#FF2E78", cx: 36, cy: 64.5, rot: -25 },
              { label: "Classic Black", color: "#160F2D", cx: 70, cy: 72.5, rot: 0 },
              { label: "Rich Purple", color: "#5338FF", cx: 85, cy: 65.5, rot: 24 },
            ]}
          />
        )}

      </div>
    </div>
  );
}


/* ============================================================
 * 子段: 组件库 (Figma frames 9-0 ~ 9-4, 1440×800)
 * Scroll-driven 3D perspective 动画
 * 卡片通过位置/大小/可见性变化在 4 帧间过渡
 * ============================================================ */
const COMP_LIB_SCROLL_H = 4500;

function ComponentLibrarySection() {
  const t = useT();
  const { lang } = useLang();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let rafId: number | null = null;
    let active = false;

    const update = () => {
      rafId = null;
      const rect = section.getBoundingClientRect();
      const vpH = window.innerHeight;
      const stickyRange = rect.height - vpH;
      if (stickyRange <= 0) return;
      const scrolled = Math.max(0, -rect.top);
      setProgress(Math.min(1, scrolled / stickyRange));
    };

    const onScroll = () => {
      if (!active || rafId !== null) return;
      rafId = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          active = e.isIntersecting;
          if (active) update();
        }
      },
      { rootMargin: "200px 0px 200px 0px" }
    );
    io.observe(section);

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // --- 白色面板入场: progress 0~0.08 (从下方滑入+淡入) ---
  const panelEnter = Math.min(1, Math.max(0, progress / 0.08));
  const panelEnterEased = 1 - Math.pow(1 - panelEnter, 3);

  // --- 上方 ORGANIZE: progress 0.04~0.50，动画结束点贴近切换点，避免提前结束后停留 ---
  const ps1Raw = Math.min(1, Math.max(0, (progress - 0.04) / 0.46));
  const ps1 = easeOutCubic(ps1Raw);

  // --- 切换: progress 0.50~0.60 上方淡出，下方淡入 ---
  const switchT = Math.min(1, Math.max(0, (progress - 0.50) / 0.1));
  const pasteContainerOpacity = 1 - switchT;
  const cardContainerOpacity = switchT;

  // --- 下方卡片动画: progress 0.58~1 ---
  const cardProgress = Math.min(1, Math.max(0, (progress - 0.58) / 0.42));

  const animPortion = 0.15;
  const holdPortion = 0.10;
  const segLen = animPortion + holdPortion;

  function stageProgress(stageIdx: number): number {
    const start = stageIdx * segLen;
    const t = Math.max(0, Math.min(1, (cardProgress - start) / animPortion));
    return easeOutCubic(t);
  }

  const stage1 = stageProgress(0); // 01进入
  const stage2 = stageProgress(1); // 01→02
  const stage3 = stageProgress(2); // 02左移, 03/04进入


  return (
    <div id="materials" ref={sectionRef} className="relative w-full" data-light-section style={{ height: COMP_LIB_SCROLL_H, marginTop: 120 }}>
      <div
        className="sticky top-0 left-0 w-full flex items-center justify-center overflow-hidden"
        style={{ height: "100vh", perspective: 1200 }}
      >
        {/* 主容器: 全屏 */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            backgroundColor: "#ECECEC",
            overflow: "hidden",
          }}
        >
          {/* 黑色顶栏: 0,0 w=100% h=15% bottomRadius=40px */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "15%",
              backgroundColor: "#000000",
              borderRadius: "0 0 40px 40px",
            }}
          />

          {/* ====== ORGANIZE 模块 (Paste App 风格) — 折叠效果 ====== */}
          <div
            style={{
              position: "absolute",
              top: "32.5%",
              left: "8.33%",
              width: "83.33%",
              height: "60%",
              backgroundColor: "#ffffff",
              borderRadius: 20,
              overflow: "hidden",
              perspective: 1200,
              opacity: panelEnterEased * (1 - switchT * 0.2),
              transform: `translateY(${(1 - panelEnterEased) * 80 + switchT * 40}px) scale(${1 - switchT * 0.08}) rotateX(${switchT * 10}deg)`,
              transformOrigin: "center top",
              zIndex: 1,
              willChange: "transform, opacity",
            }}
          >
            <PasteScreen
              label={t("规范", "Standards")}
              title={<>{t("产品", "Product ")}<BrandColorText progress={ps1} /></>}
              opacity={1}
              translateY={0}
            >
              <OrganizeAnimation progress={ps1} />
            </PasteScreen>
          </div>

          {/* 白色内容区: 卡片动画容器 — 从底部覆盖上来 */}
          <div
            style={{
              position: "absolute",
              top: "32.5%",
              left: "8.33%",
              width: "83.33%",
              height: "60%",
              backgroundColor: "#ffffff",
              borderRadius: 20,
              overflow: "hidden",
              perspective: 1200,
              transform: `translateY(${(1 - switchT) * 100}%) rotateX(${(1 - switchT) * -6}deg) scale(${0.92 + switchT * 0.08})`,
              transformOrigin: "center bottom",
              opacity: 1,
              zIndex: 2,
              willChange: "transform, opacity",
            }}
          >
            {/* 标题 */}
            <div
              style={{
                position: "absolute",
                top: "8.33%",
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
                zIndex: 10,
              }}
            >
              <p style={{ fontSize: "0.83em", color: "#767676", margin: 0, fontWeight: 600 }}>
                {t("组件库", "Component Library")}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: lang === "en" ? "0.6em" : "0.12em", margin: "4px 0 0", whiteSpace: "nowrap" }}>
                <span style={{ fontSize: "2.78em", color: "#595959", fontWeight: 600, lineHeight: 1.2, flexShrink: 0 }}>
                  {t("首页", "Home")}
                </span>
                <span
                  style={{
                    fontSize: "2.78em",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    display: "inline-block",
                    overflow: "hidden",
                    height: "1.2em",
                    verticalAlign: "bottom",
                    position: "relative",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {[t("基础卡片", "Basic Cards"), t("优惠卡片", "Promo Cards")].map((text, i) => {
                    let offset = 0;
                    if (i === 0) offset = -stage2 * 100;
                    else offset = (1 - stage2) * 100;
                    return (
                      <span
                        key={i}
                        style={{
                          display: "block",
                          color: "#000000",
                          transform: `translateY(${offset}%)`,
                          position: i === 0 ? "relative" : "absolute",
                          top: i === 0 ? undefined : 0,
                          left: i === 0 ? undefined : 0,
                          width: "100%",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {text}
                      </span>
                    );
                  })}
                </span>
              </div>
            </div>

            {/* 第一组卡片 — 被第二组顶走 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: "translateY(0%) rotateX(0deg) scale(1)",
                opacity: 1,
                transformOrigin: "center top",
                willChange: "transform, opacity",
              }}
            >
              {/* card-01 (中): 阶段1入场，阶段2快速上移出去 */}
              <div
                style={{
                  position: "absolute",
                  left: `${((556 - 120) / 1200) * 100}%`,
                  top: "31.25%",
                  width: `${(328 / 1200) * 100}%`,
                  opacity: stage1 * (1 - Math.min(1, stage2 * 2)),
                  transform: `translateY(${(1 - stage1) * 80 + (-Math.min(1, stage2 * 2) * 120)}%) rotateX(${(1 - stage1) * 20}deg) rotateZ(${(1 - stage1) * -2}deg) scale(${0.85 + stage1 * 0.15})`,
                  transformOrigin: "center bottom",
                  willChange: "transform, opacity",
                }}
              >
                <img
                  src="/figma/credmex/card-01.webp"
                  alt=""
                  draggable={false}
                  className="w-full h-auto select-none rounded-[20px]"
                />
              </div>

              {/* card-02 (中): 阶段2从底部入场 */}
              <div
                style={{
                  position: "absolute",
                  left: `${((556 - 120) / 1200) * 100}%`,
                  top: "31.25%",
                  width: `${(328 / 1200) * 100}%`,
                  opacity: stage2,
                  transform: `translateY(${(1 - stage2) * 80}%) rotateX(${(1 - stage2) * 20}deg) rotateZ(${(1 - stage2) * 2}deg) scale(${0.85 + stage2 * 0.15})`,
                  transformOrigin: "center bottom",
                  willChange: "transform, opacity",
                }}
              >
                <img
                  src="/figma/credmex/card-02.webp"
                  alt=""
                  draggable={false}
                  className="w-full h-auto select-none rounded-[20px]"
                />
              </div>

              {/* card-03 (左): 阶段3从底部进入 */}
              <div
                style={{
                  position: "absolute",
                  left: `${((174 - 120) / 1200) * 100}%`,
                  top: "31.25%",
                  width: `${(328 / 1200) * 100}%`,
                  opacity: stage3,
                  transform: `translateY(${(1 - stage3) * 80}%) rotateX(${(1 - stage3) * 20}deg) rotateZ(${(1 - stage3) * -3}deg) scale(${0.85 + stage3 * 0.15})`,
                  transformOrigin: "center bottom",
                  willChange: "transform, opacity",
                }}
              >
                <img
                  src="/figma/credmex/card-04.webp"
                  alt=""
                  draggable={false}
                  className="w-full h-auto select-none rounded-[20px]"
                />
              </div>

              {/* card-04 (右): 阶段3从底部进入，稍滞后 */}
              <div
                style={{
                  position: "absolute",
                  left: `${((938 - 120) / 1200) * 100}%`,
                  top: "31.25%",
                  width: `${(328 / 1200) * 100}%`,
                  opacity: Math.max(0, Math.min(1, stage3 * 1.2 - 0.2)),
                  transform: `translateY(${Math.max(0, 1 - stage3 * 1.2) * 80}%) rotateX(${Math.max(0, 1 - stage3 * 1.2) * 20}deg) rotateZ(${Math.max(0, 1 - stage3 * 1.2) * 3}deg) scale(${0.85 + Math.min(1, stage3 * 1.2) * 0.15})`,
                  transformOrigin: "center bottom",
                  willChange: "transform, opacity",
                }}
              >
                <img
                  src="/figma/credmex/card-05.webp"
                  alt=""
                  draggable={false}
                  className="w-full h-auto select-none rounded-[20px]"
                />
              </div>
            </div>

          </div>

          {/* 装饰图形: 居中于黑白交界线 (15%) */}
          <img
            src="/figma/credmex/comp-lib-icon.png"
            alt=""
            draggable={false}
            className="absolute select-none"
            style={{
              top: "15%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "9.2%",
              maxWidth: 140,
              height: "auto",
              zIndex: 10,
            }}
          />
        </div>
      </div>
    </div>
  );
}


/* ============================================================
 * Stacking Cards: 1:1 复刻 Joby Aviation Experience Highlights
 *
 * 源码结构（从 joby 883ff301d8634539.css + d63aca713262ba88.js 提取）：
 *   - 外层 stickyWrapper: height = 575vh, position: relative
 *   - 内层 stickyElement: position: sticky; top: 0
 *   - slidesContainer: position: relative; height: 100vh
 *   - 每张 .slide: position: absolute; inset: 0
 *   - GSAP ScrollTrigger scrub 驱动 CSS 变量:
 *       --slide-progress-before  (前一张被推走)
 *       --slide-progress-in      (当前张滑入)
 *       --slide-progress-out     (当前张被下一张推出)
 *   - slideImage 通过 CSS calc:
 *       translateX((1 - progressIn) * 20%)   → 从右侧 20% 滑入
 *       translateX(progressOut * -20%)        → 向左 20% 滑出
 *       scale(progressIn*0.81 + 0.19*progressBefore - progressOut*0.81)
 *       borderRadius: 16px * (1 + 4*progressOut) * (1 + 4*(1-progressIn))
 *   - slideContent opacity: fadeIn * fadeOut
 *
 * 这里用 JS scroll + rAF 模拟 GSAP ScrollTrigger scrub
 * ============================================================ */
const STACKING_CARDS = [
  {
    id: 1,
    video: "/xiangmu/1.mp4",
    background: "/figma/credmex/stacking-phone/fixed-background-green.png",
    title: { zh: "降息优惠弹窗", en: "Rate-Cut Offer Popup" },
    desc: {
      zh: "围绕降息券领取场景，设计动态弹窗反馈。通过券包弹出动效，强化优惠到账的惊喜感，并以清晰的权益信息和按钮引导完成后续转化。",
      en: "A dynamic popup designed around the rate-cut coupon claim flow. An animated coupon-pack reveal heightens the delight of receiving the offer, while clear benefit info and a guiding button drive follow-up conversion.",
    },
  },
  {
    id: 2,
    video: "/xiangmu/2.mp4",
    background: "/figma/credmex/stacking-phone/fixed-background-raster.png",
    title: { zh: "优惠挽留弹窗", en: "Retention Offer Popup" },
    desc: {
      zh: "围绕用户流失节点设计动态挽留反馈，通过优惠额度对比与倒计时强化限时感，突出权益升级感知，提升用户留存与即时转化。",
      en: "A dynamic retention popup built around churn moments. Offer comparisons and a countdown reinforce urgency and the sense of upgraded benefits, boosting retention and instant conversion.",
    },
  },
  {
    id: 3,
    video: "/xiangmu/3.mp4",
    background: "/figma/credmex/stacking-phone/fixed-background-green.png",
    title: { zh: "成长体系等级切换", en: "Loyalty Tier Switching" },
    desc: {
      zh: "成长体系中的等级切换体验，让用户可以清晰查看不同等级对应的权益和升级路径。通过视觉层级、标签状态和权益对比，帮助用户快速理解当前等级与下一等级之间的差异，增强成长激励感。",
      en: "A tier-switching experience within the loyalty system that lets users clearly view the benefits and upgrade path of each level. Visual hierarchy, tag states and benefit comparisons help users quickly grasp the gap between their current and next tier, strengthening progression motivation.",
    },
  },
  {
    id: 4,
    video: "/xiangmu/4.mp4",
    background: "/figma/credmex/stacking-phone/fixed-background-raster.png",
    title: { zh: "5周年大促活动", en: "5th Anniversary Campaign" },
    desc: {
      zh: "通过“5周年”标识、0%利息标题与3D金币、礼盒、优惠券等资产入场，快速建立庆典氛围与促销感；以面板下拉展开承接权益信息，清晰呈现分期优惠与额度提升福利，最终通过按钮点击动效强化转化引导。",
      en: "A “5th Anniversary” mark, a 0%-interest headline and entering 3D coins, gift boxes and coupons quickly build a celebratory, promotional mood. A drop-down panel carries the benefit details, clearly presenting installment offers and credit-limit perks, with a button tap animation reinforcing conversion.",
    },
  },
  {
    id: 5,
    video: "/xiangmu/5.mp4",
    background: "/figma/credmex/stacking-phone/fixed-background-green.png",
    title: { zh: "妇女节大促活动", en: "Women's Day Campaign" },
    desc: {
      zh: "以节日氛围建立活动情绪，通过信封展开、卡券领取、礼花反馈等动效串联权益领取流程，突出“25%降息”利益点，增强节日专属感与转化引导。",
      en: "Festive atmosphere sets the emotional tone; envelope-opening, coupon-claim and confetti animations string together the benefit-claim flow, highlighting the “25% rate cut” and enhancing the sense of a holiday-exclusive offer and conversion guidance.",
    },
  },
];
const STACKING_N = STACKING_CARDS.length;
const STACKING_WRAPPER_VH = 960;
const STACKING_PHONE_OVERLAY = "/xiangmu/phone.png";

function StackingPhoneComposite({
  background,
  video,
  title,
}: {
  background: string;
  video: string;
  title: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#7e6aff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={background}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "min(100%, calc((100dvh - 5rem) * 904 / 1400))",
            maxHeight: "100%",
            aspectRatio: "904 / 1400",
            position: "relative",
            flexShrink: 0,
            transform: "scale(0.78)",
            transformOrigin: "center center",
          }}
        >
          <img
            src={STACKING_PHONE_OVERLAY}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `${(202.29443359375 / 904) * 100}%`,
              top: `${(32.267578125 / 1400) * 100}%`,
              width: `${(477.6402893066406 / 904) * 100}%`,
              height: `${(1061.4228515625 / 1400) * 100}%`,
              borderRadius: "calc((100dvh - 5rem) * 40 / 822)",
              overflow: "hidden",
              zIndex: 2,
            }}
          >
            <video
              src={video}
              aria-label={title}
              muted
              loop
              playsInline
              preload="metadata"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StackingCardsSection() {
  const t = useT();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgInnerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const firstSlide = slideRefs.current[0];
    let raf = 0;

    const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

    let cachedRem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    let slideW = firstSlide ? firstSlide.offsetWidth : wrapper.offsetWidth;
    let cachedOffsetR = slideW * 0.19 + 2.8 * cachedRem;
    let cachedOffsetL = -cachedOffsetR;

    // 让文字块右缘对齐到"右下角小图"的右缘.
    // 小图 = 下一张卡片在 progressBefore 阶段, 以右下角(100% 100%)为原点缩到 ~0.19,
    // 并向右平移 gridOffsetRightPx. 缩放不动右缘, 故其右缘 = 图块几何右缘 + gridOffsetRightPx.
    const alignContentToThumb = () => {
      for (let i = 0; i < STACKING_N; i++) {
        const imgWrap = imgWrapRefs.current[i];
        const contentEl = contentRefs.current[i];
        if (!imgWrap || !contentEl) continue;
        const targetRight = imgWrap.offsetLeft + imgWrap.offsetWidth + cachedOffsetR;
        const contentRight = contentEl.offsetLeft + contentEl.offsetWidth;
        const delta = targetRight - contentRight;
        contentEl.style.setProperty("--align-x", `${delta}px`);
      }
    };

    const recalcLayout = () => {
      cachedRem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      slideW = firstSlide ? firstSlide.offsetWidth : wrapper.offsetWidth;
      cachedOffsetR = slideW * 0.19 + 2.8 * cachedRem;
      cachedOffsetL = -cachedOffsetR;
      alignContentToThumb();
    };

    const compute = () => {
      raf = 0;
      const rect = wrapper.getBoundingClientRect();
      const vh = window.innerHeight;
      const totalScroll = rect.height - vh;
      if (totalScroll <= 0) return;

      const scrolled = clamp(-rect.top, 0, totalScroll);
      const p = scrolled / totalScroll;

      const n = 0.9 / STACKING_N;

      const rem = cachedRem;
      const gridOffsetRightPx = cachedOffsetR;
      const gridOffsetLeftPx = cachedOffsetL;

      for (let i = 0; i < STACKING_N; i++) {
        const slideEl = slideRefs.current[i];
        const imgWrap = imgWrapRefs.current[i];
        const imgInner = imgInnerRefs.current[i];
        const contentEl = contentRefs.current[i];
        if (!imgWrap) continue;

        const m = i * n;
        const segEnd = m + n;

        const progressIn = clamp((p - m) / n);

        const pbStart = Math.max(m - 0.75 * n, 0);
        const pbDur = 0.4 * n;
        const progressBefore = clamp((p - pbStart) / pbDur);

        const poStart = segEnd + 0.05 * n;
        const poDur = 0.9 * n;
        const progressOut = i < STACKING_N - 1
          ? clamp((p - poStart) / poDur)
          : 0;

        const peStart = segEnd + n;
        const peDur = n;
        const progressEnd = i < STACKING_N - 2
          ? clamp((p - peStart) / peDur)
          : 0;

        const FAST_IN = 1.5;
        const FAST_OUT = 1.75;
        const FAST_END = 1.75;
        const shortIn = Math.min(progressIn * FAST_IN, 1);
        const shortOut = Math.min(progressOut * FAST_OUT, 1);
        const shortEnd = Math.min(progressEnd * FAST_END, 1);

        let scaleIn: number;
        let txPx: number;

        if (i === 0) {
          scaleIn = shortIn;
          txPx = shortOut * gridOffsetLeftPx + shortEnd * -2.8 * rem;
        } else {
          scaleIn = shortIn * 0.81 + 0.19 * progressBefore;
          txPx = (1 - shortIn) * gridOffsetRightPx
               + shortOut * gridOffsetLeftPx
               + shortEnd * -2.8 * rem;
        }

        const scaleOut = shortOut * 0.81;
        const scaleEnd = 1 - shortEnd;
        const scaleVal = Math.max(0.01, scaleIn - scaleOut);

        const radius = 16 * (1 + 4 * shortOut) * (1 + 4 * (1 - shortIn));

        if (progressIn >= 1) {
          imgWrap.style.transformOrigin = "left top";
        } else {
          imgWrap.style.transformOrigin = i === 0 ? "center bottom" : "100% 100%";
        }

        const imageAlpha = clamp((Math.max(shortIn, progressBefore) - 0.02) / 0.08) * scaleEnd;
        imgWrap.style.transform = `translateX(${txPx}px) scale(${scaleVal}) scale(${scaleEnd})`;
        imgWrap.style.borderRadius = `${radius}px`;
        imgWrap.style.opacity = `${imageAlpha}`;
        imgWrap.style.visibility = imageAlpha > 0.01 ? "visible" : "hidden";

        const videoEl = imgWrap.querySelector("video");
        if (videoEl) {
          const shouldPlay = imageAlpha > 0.98 && scaleVal * scaleEnd > 0.98 && shortOut < 0.01;
          if (shouldPlay) {
            void videoEl.play().catch(() => {
              // Ignore browser interruptions while scroll state is changing.
            });
          } else {
            videoEl.pause();
            videoEl.currentTime = 0;
          }
        }

        if (imgInner) {
          const denom = scaleIn - scaleOut * 0.5;
          const counterScale = denom > 0.01
            ? 1 / denom + 0.1 * (1 - progressIn)
            : 1;
          imgInner.style.transform = `scale(${clamp(counterScale, 0.5, 2.5)})`;
        }

        if (contentEl) {
          const fadeIn = clamp((progressIn - 0.6) / 0.1);
          const fadeOut = 1 - clamp(progressOut / 0.1);
          const alpha = fadeIn * fadeOut;
          contentEl.style.opacity = `${alpha}`;
          contentEl.style.visibility = alpha > 0.01 ? "visible" : "hidden";
        }
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(compute);
    };

    const onResize = () => { recalcLayout(); onScroll(); };

    recalcLayout();
    compute();
    // 字体就绪后重算一次, 避免首次测量时文字宽度不准导致对齐偏移.
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => { recalcLayout(); }).catch(() => {});
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        height: `${STACKING_WRAPPER_VH}vh`,
        position: "relative",
        background: "#000",
        padding: "0 4rem",
      }}
    >
      {/* Sticky element */}
      <div
        style={{
          position: "sticky",
          top: "2.5rem",
          width: "100%",
          height: "calc(100dvh - 5rem)",
        }}
      >
        {/* Slides container */}
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {STACKING_CARDS.map((card, i) => (
            <div
              key={card.id}
              ref={(el) => { slideRefs.current[i] = el; }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "grid",
                gridTemplateColumns: "repeat(16, 1fr)",
                gap: "0 1.6rem",
                padding: 0,
                alignItems: "center",
              }}
            >
              {/* 固定背景区域 — grid column 5~12 (Joby 原始) */}
              <div
                ref={(el) => { imgWrapRefs.current[i] = el; }}
                style={{
                  gridColumn: "5 / span 8",
                  placeSelf: "center",
                  width: "calc(100% - 2rem)",
                  height: "100%",
                  overflow: "hidden",
                  transformOrigin: "100% 100%",
                  opacity: 0,
                  visibility: "hidden",
                  willChange: "transform, border-radius, opacity",
                }}
              >
                <div
                  ref={(el) => { imgInnerRefs.current[i] = el; }}
                  style={{
                    width: "100%",
                    height: "100%",
                    transformOrigin: "50% 20%",
                    willChange: "transform",
                  }}
                >
                  <StackingPhoneComposite background={card.background} video={card.video} title={t(card.title.zh, card.title.en)} />
                </div>
              </div>

              {/* 文字区域 — grid column 13~15 */}
              <div
                ref={(el) => { contentRefs.current[i] = el; }}
                style={{
                  gridColumn: "13 / span 3",
                  alignSelf: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  textAlign: "left",
                  transform: "translateX(var(--align-x, 0px))",
                  gap: 20,
                  color: "#0e1620",
                  visibility: "hidden",
                  opacity: 0,
                  zIndex: 3,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    opacity: 0.4,
                  }}
                >
                  {String(card.id).padStart(2, "0")}
                </span>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 16,
                    fontWeight: 500,
                    lineHeight: 1.4,
                    margin: 0,
                    color: "#fff",
                  }}
                >
                  {t(card.desc.zh, card.desc.en)}
                </p>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {t(card.title.zh, card.title.en)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * 子段: 额度选择 (Figma frame "10", 1440×892)
 * sticky 滚动: 标题固定, 当前问题/设计策略 上移渐隐, 实验结果 渐入
 * 右侧: 手持手机透明视频
 * ============================================================ */
const CREDIT_SCROLL_H = 2400;

function CreditSection({ scale }: { scale?: number }) {
  const t = useT();
  const rawScale = scale ?? 1;
  const s = Math.min(rawScale, 1);
  const FRAME_W = 1440;
  const FRAME_H = 892;
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let active = false;
    let raf = 0;

    const io = new IntersectionObserver(
      ([e]) => {
        active = e.isIntersecting;
        if (active && !raf) raf = requestAnimationFrame(update);
      },
      { threshold: 0 }
    );
    io.observe(section);

    function update() {
      raf = 0;
      if (!active) return;
      const rect = section!.getBoundingClientRect();
      const vpH = window.innerHeight;
      const stickyRange = section!.offsetHeight - vpH;
      if (stickyRange <= 0) return;
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / stickyRange));
      setProgress(p);
      if (!entered && rect.top <= vpH * 0.6) setEntered(true);
      raf = requestAnimationFrame(update);
    }

    const onScroll = () => {
      if (active && !raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [entered]);

  // progress 0→0.4: 当前问题/设计策略 可见; 0.4→0.6: 渐隐上移; 0.6→1: 实验结果 渐入
  const phase1Opacity = progress < 0.4 ? 1 : progress > 0.6 ? 0 : 1 - (progress - 0.4) / 0.2;
  const phase1TranslateY = progress < 0.4 ? 0 : -(progress - 0.4) / 0.2 * 60;
  const phase2Opacity = progress < 0.55 ? 0 : progress > 0.75 ? 1 : (progress - 0.55) / 0.2;

  return (
    <div ref={sectionRef} className="relative w-full" style={{ height: CREDIT_SCROLL_H, marginTop: 120 * s }}>
      <div className="sticky top-0 left-0 w-full overflow-hidden" style={{ height: "100vh" }}>
        {/* 左侧文字: 脱离 scale stage, 用真实 viewport px 对齐 header */}
        <div
          className="absolute"
          style={{
            left: 40 * s,
            top: 240 * s,
            width: 697 * s,
            zIndex: 1,
            opacity: entered ? 1 : 0,
            transform: `translateY(${entered ? 0 : 30}px)`,
            transition: "opacity 800ms cubic-bezier(0.22,1,0.36,1), transform 800ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <p
            style={{
              fontSize: 40 * s,
              color: "#ECECEC",
              fontWeight: 600,
              lineHeight: "normal",
              margin: 0,
            }}
          >
            {t("额度选择", "Credit Limit Selection")}
          </p>
        </div>

        <div
          className="absolute"
          style={{
            left: 40 * s,
            top: 348 * s,
            width: 697 * s,
            zIndex: 1,
            opacity: entered ? phase1Opacity : 0,
            transform: `translateY(${entered ? phase1TranslateY : 30}px)`,
            transition: entered ? "none" : "opacity 800ms cubic-bezier(0.22,1,0.36,1) 100ms, transform 800ms cubic-bezier(0.22,1,0.36,1) 100ms",
            willChange: "opacity, transform",
          }}
        >
          <div className="flex flex-col" style={{ gap: 40 * s }}>
            <div className="flex flex-col" style={{ gap: 8 }}>
              <p style={{ fontSize: 14, color: "#ECECEC", fontWeight: 500, margin: 0 }}>
                {t("当前问题", "The Problem")}
              </p>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                <span style={{ color: "#949494" }}>{t("在信贷额度选择场景中，用户通常需要判断", "When choosing a credit limit, users typically have to weigh ")}</span>
                <span style={{ color: "#ECECEC" }}>{t("“可借多少、选择多少更合适、当前是否有优惠”", "“how much they can borrow, what amount is most suitable, and whether any offer applies”")}</span>
                <span style={{ color: "#949494" }}>{t("等问题，决策成本较高。结合业务数据发现，首贷与复贷用户的额度使用率存在明显差异：首贷用户平均使用额度约为", " — a high-cost decision. Business data shows a clear gap in credit utilization between first-time and repeat borrowers: first-time users use about")}</span>
                <span style={{ color: "#ECECEC" }}> 80%</span>
                <span style={{ color: "#949494" }}>{t("，复贷用户约为", " of their limit on average, while repeat users use around")}</span>
                <span style={{ color: "#ECECEC" }}> 40%</span>
                <span style={{ color: "#949494" }}>{t("，复贷场景仍有提升件均金额的空间。", " — leaving room to raise the average ticket size in repeat scenarios.")}</span>
              </p>
            </div>
            <div className="flex flex-col" style={{ gap: 8 }}>
              <p style={{ fontSize: 14, color: "#ECECEC", fontWeight: 500, margin: 0 }}>
                {t("设计策略", "Design Strategy")}
              </p>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                <span style={{ color: "#949494" }}>{t("界面从原有的单一金额编辑方式，优化为“手动输入 + 推荐额度快捷选择”的组合模式。用户既可以自由调整借款金额，也可以直接选择系统推荐的额度卡片。", "The interface evolved from a single amount-editing field into a combined “manual input + quick recommended-limit selection” model. Users can freely adjust the loan amount or simply tap a system-recommended limit card.")}</span>
                <span style={{ color: "#ECECEC" }}>{t("通过突出推荐标签、选中态反馈与金额层级对比，让用户在高信息密度的金融场景中快速识别更优选项。", "Highlighted recommendation tags, selected-state feedback and amount-hierarchy contrast help users quickly spot the better option in an information-dense financial context.")}</span>
              </p>
            </div>
          </div>
        </div>

        <div
          className="absolute"
          style={{
            left: 40 * s,
            top: 348 * s,
            width: 697 * s,
            zIndex: 1,
            opacity: phase2Opacity,
            transform: `translateY(${phase2Opacity < 1 ? 20 * (1 - phase2Opacity) : 0}px)`,
            willChange: "opacity, transform",
          }}
        >
            <div className="flex flex-col" style={{ gap: 8 }}>
              <p style={{ fontSize: 14, color: "#ECECEC", fontWeight: 500, margin: 0 }}>
                {t("实验结果", "Results")}
              </p>
              <p style={{ fontSize: 14, color: "#949494", fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                {t("实验观察时间：墨西哥时间 9.22 - 10.12，9.22 - 10%分流、9.29 - 30%分流、10.12 - 50%分流", "Observation window: Mexico time 9.22 - 10.12 (9.22 - 10% traffic, 9.29 - 30% traffic, 10.12 - 50% traffic).")}
              </p>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                <span style={{ color: "#949494" }}>{t("阶段性结论（数据为相对 %）：", "Interim findings (figures are relative %):")}</span>{"\n"}
                <span style={{ color: "#ECECEC" }}>{t("实验组表现略好，当日下单率+1.39%，当日额度使用率+0.79%，当日放款效率+1.58%", "the test group performed slightly better — same-day order rate +1.39%, same-day credit utilization +0.79%, same-day disbursement efficiency +1.58%.")}</span>
              </p>
              <p style={{ fontSize: 14, color: "#ECECEC", fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                {t("拆场景来看，首贷优势更明显，当日下单率+3.89%，当日额度使用率+2.77%，当日放款效率+4.57%", "By scenario, the advantage is clearer for first-time borrowers — same-day order rate +3.89%, same-day credit utilization +2.77%, same-day disbursement efficiency +4.57%.")}
              </p>
              <p style={{ fontSize: 14, color: "#ECECEC", fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                {t("实验结果显示，额度选择机制有效提升了用户额度选择效率，验证了推荐策略对关键转化路径的正向作用。", "Results show the limit-selection mechanism meaningfully improved how efficiently users pick a limit, validating the positive impact of the recommendation strategy on key conversion paths.")}
              </p>
              <p style={{ fontSize: 12, color: "#595959", fontWeight: 500, margin: 0, marginTop: 16 * s, lineHeight: 1.5 }}>
                {t("*数据已做脱敏处理，仅保留核心趋势与设计验证结论", "*Data has been anonymized; only core trends and design-validation conclusions are retained.")}
              </p>
            </div>
          </div>

        {/* 右侧手持手机: 在 scale stage 中, 使用原始 scale 保持贴右 */}
        <div
          className="absolute left-0 top-0"
          style={{
            width: FRAME_W,
            height: FRAME_H,
            transform: `scale(${rawScale})`,
            transformOrigin: "top left",
          }}
        >
          <PhoneHandReveal entered={entered} progress={progress} />
        </div>
      </div>
    </div>
  );
}

function PhoneHandReveal({ entered, progress = 0, videoSrc = "credit" }: { entered?: boolean; progress?: number; videoSrc?: string }) {
  const visible = entered ?? true;
  // 入场动画
  const enterDx = visible ? 0 : 300;
  const enterDy = visible ? 0 : 200;
  const enterRot = visible ? 0 : 15;
  // 退场: progress 0.8→1 时移出到右侧
  const exitT = progress < 0.8 ? 0 : (progress - 0.8) / 0.2;
  const exitDx = exitT * 400;
  const exitRot = exitT * -10;
  const exitOpacity = 1 - exitT;

  const dx = enterDx + exitDx;
  const dy = enterDy;
  const rot = enterRot + exitRot;

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: 962,
        top: 93,
        width: 478,
        height: 782,
        opacity: visible ? exitOpacity : 0,
        transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`,
        transformOrigin: "center bottom",
        transition: exitT > 0 ? "none" : "opacity 800ms cubic-bezier(0.22, 1, 0.36, 1) 300ms, transform 1000ms cubic-bezier(0.22, 1, 0.36, 1) 300ms",
        willChange: "opacity, transform",
      }}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 block w-full h-full select-none"
        style={{ objectFit: "contain" }}
      >
        <source src={`/figma/credmex/${videoSrc}-phone.webm`} type="video/webm" />
        <source src={`/figma/credmex/${videoSrc}-phone.mov`} type='video/mp4; codecs="hvc1"' />
      </video>
    </div>
  );
}

/* ============================================================
 * 子段: 额度推荐 (Figma frame "11", 1440×892)
 * 结构同额度选择: sticky 标题 + 当前问题/设计策略 渐隐 + 实验结果 渐入
 * 右侧: 手持手机透明视频 (待用户提供)
 * ============================================================ */
const RECOMMEND_SCROLL_H = 2400;

function RecommendSection({ scale }: { scale?: number }) {
  const t = useT();
  const rawScale = scale ?? 1;
  const s = Math.min(rawScale, 1);
  const FRAME_W = 1440;
  const FRAME_H = 892;
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let active = false;
    let raf = 0;

    const io = new IntersectionObserver(
      ([e]) => {
        active = e.isIntersecting;
        if (active && !raf) raf = requestAnimationFrame(update);
      },
      { threshold: 0 }
    );
    io.observe(section);

    function update() {
      raf = 0;
      if (!active) return;
      const rect = section!.getBoundingClientRect();
      const vpH = window.innerHeight;
      const stickyRange = section!.offsetHeight - vpH;
      if (stickyRange <= 0) return;
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / stickyRange));
      setProgress(p);
      if (!entered && rect.top <= vpH * 0.6) setEntered(true);
      raf = requestAnimationFrame(update);
    }

    const onScroll = () => {
      if (active && !raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [entered]);

  const phase1Opacity = progress < 0.4 ? 1 : progress > 0.6 ? 0 : 1 - (progress - 0.4) / 0.2;
  const phase1TranslateY = progress < 0.4 ? 0 : -(progress - 0.4) / 0.2 * 60;
  const phase2Opacity = progress < 0.55 ? 0 : progress > 0.75 ? 1 : (progress - 0.55) / 0.2;

  return (
    <div ref={sectionRef} className="relative w-full" style={{ height: RECOMMEND_SCROLL_H, marginTop: 120 * s }}>
      <div className="sticky top-0 left-0 w-full overflow-hidden" style={{ height: "100vh" }}>
        {/* 左侧文字: 脱离 scale stage, 用真实 viewport px 对齐 header */}
        <div
          className="absolute"
          style={{
            left: 40 * s,
            top: 240 * s,
            width: 697 * s,
            zIndex: 1,
            opacity: entered ? 1 : 0,
            transform: `translateY(${entered ? 0 : 30}px)`,
            transition: "opacity 800ms cubic-bezier(0.22,1,0.36,1), transform 800ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <p
            style={{
              fontSize: 40 * s,
              color: "#ECECEC",
              fontWeight: 600,
              lineHeight: "normal",
              margin: 0,
            }}
          >
            {t("额度推荐", "Credit Limit Recommendation")}
          </p>
        </div>

        <div
          className="absolute"
          style={{
            left: 40 * s,
            top: 348 * s,
            width: 697 * s,
            zIndex: 1,
            opacity: entered ? phase1Opacity : 0,
            transform: `translateY(${entered ? phase1TranslateY : 30}px)`,
            transition: entered ? "none" : "opacity 800ms cubic-bezier(0.22,1,0.36,1) 100ms, transform 800ms cubic-bezier(0.22,1,0.36,1) 100ms",
            willChange: "opacity, transform",
          }}
        >
          <div className="flex flex-col" style={{ gap: 40 * s }}>
            <div className="flex flex-col" style={{ gap: 8 }}>
              <p style={{ fontSize: 14, color: "#ECECEC", fontWeight: 500, margin: 0 }}>
                {t("当前问题", "The Problem")}
              </p>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                <span style={{ color: "#949494" }}>{t("在信贷额度选择场景中，用户需要判断", "When choosing a credit limit, users have to judge ")}</span>
                <span style={{ color: "#ECECEC" }}>{t("“借多少更合适、是否满足优惠门槛、如何使用降息券”", "“how much to borrow, whether they meet the offer threshold, and how to use a rate-cut coupon”")}</span>
                <span style={{ color: "#949494" }}>{t("等问题，决策成本较高。尤其是有降息券用户，当输入额度低于券的起用金额时，用户容易忽略优惠条件，导致降息券未被使用，也影响额度使用率与件均金额提升。", " — a high-cost decision. Coupon holders in particular tend to overlook the offer terms when their entered amount is below the coupon's minimum, leaving the rate-cut coupon unused and limiting gains in credit utilization and average ticket size.")}</span>
              </p>
            </div>
            <div className="flex flex-col" style={{ gap: 8 }}>
              <p style={{ fontSize: 14, color: "#ECECEC", fontWeight: 500, margin: 0 }}>
                {t("设计策略", "Design Strategy")}
              </p>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                <span style={{ color: "#949494" }}>{t("针对持有降息券的用户，在下单页点击修改额度后，若当前额度低于降息券起用金额，则在页面下方展示凑满减提示条，引导用户提升至满足优惠条件的推荐额度。", "For coupon holders, after tapping to edit the amount on the order page, if the current limit is below the coupon's minimum, a top-up hint bar appears at the bottom, guiding users to raise it to a recommended limit that qualifies for the offer.")}</span>
                {"\n\n"}
                <span style={{ color: "#949494" }}>{t("用户点击提示条后，可一键应用推荐金额，减少手动计算与反复输入成本。", "Tapping the hint bar applies the recommended amount in one tap, cutting manual calculation and repeated input.")}</span>
                {"\n"}
                <span style={{ color: "#ECECEC" }}>{t("同时保留手动输入能力，避免强制推荐，让用户在理解优惠价值的基础上自主决策。", "Manual input is preserved to avoid forced recommendations, letting users decide for themselves once they understand the value of the offer.")}</span>
              </p>
            </div>
          </div>
        </div>

        <div
          className="absolute"
          style={{
            left: 40 * s,
            top: 348 * s,
            width: 697 * s,
            zIndex: 1,
            opacity: phase2Opacity,
            transform: `translateY(${phase2Opacity < 1 ? 20 * (1 - phase2Opacity) : 0}px)`,
            willChange: "opacity, transform",
          }}
        >
          <div className="flex flex-col" style={{ gap: 8 }}>
            <p style={{ fontSize: 14, color: "#ECECEC", fontWeight: 500, margin: 0 }}>
              {t("实验结果", "Results")}
            </p>
            <p style={{ fontSize: 14, color: "#949494", fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
              {t("实验观察时间：墨西哥时间 9.22 - 10.14（9.22 - 10% 分流；9.29 - 30% 分流；10.10 - 50% 分流）", "Observation window: Mexico time 9.22 - 10.14 (9.22 - 10% traffic; 9.29 - 30% traffic; 10.10 - 50% traffic).")}
            </p>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
              <span style={{ color: "#949494" }}>{t("阶段性结论（数据为相对 %）：", "Interim findings (figures are relative %):")}</span>{"\n"}
              <span style={{ color: "#ECECEC" }}>{t("实验组用户略有优势，当日额度使用率 + 2.15%，当日放款效率 + 1.30%", "the test group showed a slight edge — same-day credit utilization +2.15%, same-day disbursement efficiency +1.30%.")}</span>
            </p>
            <p style={{ fontSize: 14, color: "#ECECEC", fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
              {t("实验结果显示，额度推荐机制对核心指标产生正向影响。 整体组当日下单率、额度使用率与当日放款效率均有小幅提升；其中，有修改金额行为的用户提升更明显，说明该策略能有效降低额度选择成本，并提升用户对优惠额度的感知与使用效率。", "Results show the recommendation mechanism positively affected core metrics. The overall group saw small gains in same-day order rate, credit utilization and disbursement efficiency; the lift was clearer among users who edited their amount, indicating the strategy effectively lowers the cost of choosing a limit and improves users' perception and use of preferential limits.")}
            </p>
            <p style={{ fontSize: 12, color: "#595959", fontWeight: 500, margin: 0, marginTop: 16 * s, lineHeight: 1.5 }}>
              {t("*数据已做脱敏处理，仅保留核心趋势与设计验证结论", "*Data has been anonymized; only core trends and design-validation conclusions are retained.")}
            </p>
          </div>
        </div>

        {/* 右侧手持手机: 在 scale stage 中 */}
        <div
          className="absolute left-0 top-0"
          style={{
            width: FRAME_W,
            height: FRAME_H,
            transform: `scale(${rawScale})`,
            transformOrigin: "top left",
          }}
        >
          <PhoneHandReveal entered={entered} progress={progress} videoSrc="recommend" />
        </div>
      </div>
    </div>
  );
}

const JOBY_SAFETY_SLIDES = [
  {
    title: {
      zh: "新用户 / 没有邀请 / 被邀请阶段\n突出：未绑定基础奖励 + 排行榜玩法",
      en: "New user / no invites / invited stage\nFocus: unclaimed base reward + leaderboard mechanic",
    },
    body: {
      zh: "用户还没有投入行为，对活动价值感知弱。先用确定可获得的基础奖励降低参与门槛，再用排行榜额外奖励建立预期，让用户愿意开始邀请。",
      en: "The user hasn't invested any effort yet and barely perceives the campaign's value. Start by lowering the entry barrier with a guaranteed base reward, then build anticipation with extra leaderboard rewards so the user is willing to begin inviting.",
    },
    image: yaoxinD1Image.src,
    imageTag: "",
    tagColor: "var(--color-white)",
  },
  {
    title: {
      zh: "被邀请人已绑定但未放款\n突出：基础奖励 + 排行榜玩法",
      en: "Invitee bound but not yet disbursed\nFocus: base reward + leaderboard mechanic",
    },
    body: {
      zh: "用户已经付出成本但还没拿到奖励，最需要的是看到“马上就能兑现”。强调完成放款后即可获得基础奖励，同时计入排行榜，让用户推动好友完成最后一步。",
      en: "The user has already put in effort but hasn't received a reward, so they most need to feel it's “about to pay off.” Emphasize that completing disbursement earns the base reward and counts toward the leaderboard, motivating the user to push their friend through the final step.",
    },
    image: yaoxinD2Image.src,
    imageTag: "",
    tagColor: "var(--color-white)",
  },
  {
    title: {
      zh: "有放款但未进榜\n突出：距离进榜名次 + 额外奖励 + 已获得基础奖励",
      en: "Has disbursement but not on the leaderboard\nFocus: rank gap to enter + extra reward + base reward earned",
    },
    body: {
      zh: "用户已经验证活动能赚钱，基础奖励不再是主要驱动力。此时要告诉他“离上榜还有多远”和“上榜后能多拿什么”，把目标从拿奖励升级为冲榜。",
      en: "The user has confirmed the campaign can pay, so the base reward is no longer the main driver. Now tell them “how far they are from ranking” and “how much more they'd get once ranked,” upgrading the goal from earning a reward to climbing the leaderboard.",
    },
    image: yaoxinD3Image.src,
    imageTag: "",
    tagColor: "var(--color-white)",
  },
  {
    title: {
      zh: "有放款且进榜，但不在最高梯度\n突出：距离下个档位 + 奖励升级为XX + 已获得全部奖励",
      en: "Disbursed and ranked, but not in the top tier\nFocus: gap to next tier + reward upgrades to XX + all rewards earned",
    },
    body: {
      zh: "用户已经进入竞争阶段，关注点从“有没有奖励”变成“如何拿更多奖励”。突出下一档位的收益差距，让用户觉得再努力一点就能获得更高回报。",
      en: "The user has entered the competitive stage; their focus shifts from “is there a reward” to “how to get more.” Highlight the payoff gap to the next tier so the user feels a little more effort yields a bigger return.",
    },
    image: yaoxinD4Image.src,
    imageTag: "",
    tagColor: "var(--color-black)",
  },
  {
    title: {
      zh: "有放款且进入第一档\n突出：当前名次 + 维持排名 + 已获得奖励",
      en: "Disbursed and in the top tier\nFocus: current rank + maintain position + rewards earned",
    },
    body: {
      zh: "用户已经达到最高梯度，继续强调升级已没有吸引力。此时要利用排名心理，突出当前领先优势和已获得奖励，引导用户持续邀请、防止被后来者超越。",
      en: "The user has reached the top tier, so pushing further upgrades no longer appeals. Tap into ranking psychology: highlight their current lead and earned rewards to keep them inviting and prevent being overtaken.",
    },
    image: yaoxinD5Image.src,
    imageTag: "",
    tagColor: "var(--color-black)",
  },
];

function JobySafetySliderExact() {
  const t = useT();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const stickyWrapperRef = useRef<HTMLDivElement | null>(null);
  const slidesContainerRef = useRef<HTMLDivElement | null>(null);
  const imageSliderRef = useRef<HTMLDivElement | null>(null);
  const paginationRef = useRef<HTMLDivElement | null>(null);
  const imageInnerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const contentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const titleTextRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const bodyTextRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const paginationRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const stickyWrapper = stickyWrapperRef.current;
    const slidesContainer = slidesContainerRef.current;
    const imageSlider = imageSliderRef.current;
    const pagination = paginationRef.current;
    if (!section || !stickyWrapper || !slidesContainer || !imageSlider || !pagination) return;

    gsap.registerPlugin(ScrollTrigger);

    const removeResizeListener = () => {};
    let exitTicker: ((time: number) => void) | null = null;

    const ctx = gsap.context(() => {
      const slideCount = JOBY_SAFETY_SLIDES.length;
      const introDuration = 50 / (50 + 200 * slideCount);
      const slideDuration = (1 - introDuration) / slideCount;
      // 按层级拆分每张 slide 的入场目标: 主标题行 → 高亮副标题行 → 正文
      const getStaggerTargets = (index: number): HTMLElement[] => {
        const titleSpan = titleTextRefs.current[index];
        const bodySpan = bodyTextRefs.current[index];
        const titleLines = titleSpan ? (Array.from(titleSpan.children) as HTMLElement[]) : [];
        const titleParts = titleLines.length ? titleLines : titleSpan ? [titleSpan] : [];
        return [...titleParts, bodySpan].filter(Boolean) as HTMLElement[];
      };
      const textTargets = JOBY_SAFETY_SLIDES.flatMap((_, i) => getStaggerTargets(i));
      const firstTextTargets = getStaggerTargets(0);
      // 主标题行原为 inline, 块级化后纵向位移更干净 (其后高亮为 block 本就独占一行, 布局不变)
      const titleMainLines = titleTextRefs.current
        .map((span) => span?.children[0] as HTMLElement | undefined)
        .filter((el): el is HTMLElement => Boolean(el));
      gsap.set(titleMainLines, { display: "block" });

      gsap.set(slidesContainer, { "--animate-in": 0 });
      gsap.set(imageSlider, { "--animate-to-position": 0 });
      gsap.set(pagination, { scale: 0.5, opacity: 0 });
      gsap.set(contentRefs.current, { opacity: 0, visibility: "hidden" });
      gsap.set(contentRefs.current[0], { opacity: 1, visibility: "visible" });
      gsap.set(textTargets, { opacity: 0, y: "1.4rem" });
      gsap.set(firstTextTargets, { opacity: 1, y: "0rem" });
      gsap.set(imageInnerRefs.current, {
        "--progress": 0,
        "--zoom-progress": 0,
        "--scale-progress-safe": 1,
        "--reverse-zoom": 0.1,
        "--end": 0,
      });
      gsap.set(paginationRefs.current, {
        "--progress": 0,
        "--animate-in": 0,
        "--animate-out": 0,
      });

      const introTimeline = gsap.timeline()
        .to(slidesContainer, { "--animate-in": 1, duration: 0.4, ease: "power1.in" }, 0.5)
        .fromTo(pagination, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: "power4.inOut" }, 0.75)
        .to(paginationRefs.current[0], { "--animate-in": 1, "--progress": 0.2, duration: 0.2, ease: "power2.inOut" }, 0.8)
        .to({}, { duration: 0 }, 1);

      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: () => `+=${window.innerHeight}`,
        scrub: true,
        invalidateOnRefresh: true,
        animation: introTimeline,
      });

      const stickyTimeline = gsap.timeline()
        .to(imageSlider, { "--animate-to-position": 1, duration: introDuration, ease: "power1.out" }, 0)
        .set(contentRefs.current[0], { visibility: "visible" }, 0.15 * introDuration)
        .fromTo(contentRefs.current[0], { opacity: 0 }, { opacity: 1, visibility: "visible", duration: 0.1 }, 0)
        .fromTo(
          firstTextTargets,
          { opacity: 0, y: "1.4rem" },
          { opacity: 1, y: "0rem", duration: 0.18 * introDuration, ease: "power1.out", stagger: 0.12 * introDuration },
          0.15 * introDuration
        );

      JOBY_SAFETY_SLIDES.forEach((_, index) => {
        const start = introDuration + index * slideDuration;
        stickyTimeline.to(paginationRefs.current[index], { "--progress": 1, duration: slideDuration, ease: "none" }, start);

        if (index !== 0) {
          const currentTextTargets = getStaggerTargets(index);
          const previousTextTargets = getStaggerTargets(index - 1);
          const isLastSlide = index === slideCount - 1;
          const zoomDuration = isLastSlide ? 1 - start : 1.5 * slideDuration;

          stickyTimeline
            .to(paginationRefs.current[index], { "--animate-in": 1, duration: 0.4 * slideDuration, ease: "power2.inOut" }, start)
            .to(paginationRefs.current[index - 1], { "--animate-out": 1, duration: 0.4 * slideDuration, ease: "power2.inOut" }, start)
            .fromTo(contentRefs.current[index - 1], { opacity: 1 }, { opacity: 0, duration: 0.25 * slideDuration }, start)
            .to(previousTextTargets, { opacity: 0, y: "-1.4rem", duration: 0.25 * slideDuration, ease: "power1.inOut" }, start)
            .set(contentRefs.current[index - 1], { visibility: "hidden", duration: 0 }, start + 0.25 * slideDuration)
            .set(contentRefs.current[index], { visibility: "visible" }, start + 0.25 * slideDuration)
            .fromTo(contentRefs.current[index], { opacity: 0 }, { opacity: 1, duration: 0.25 * slideDuration }, start + 0.25 * slideDuration)
            .fromTo(currentTextTargets, { opacity: 0, y: "1.4rem" }, { opacity: 1, y: "0rem", duration: 0.125 * slideDuration, ease: "power1.out", stagger: 0.12 * slideDuration }, start + 0.25 * slideDuration)
            .fromTo(
              imageInnerRefs.current[index - 1],
              { "--progress": 0, "--scale-progress-safe": 1 },
              { "--progress": 1, "--scale-progress-safe": 0.001, ease: "power1.out", duration: 0.5 * slideDuration },
              start
            )
            .fromTo(
              imageInnerRefs.current[index],
              { "--zoom-progress": 0, "--reverse-zoom": 0.1 },
              { "--zoom-progress": 1, "--reverse-zoom": 0, ease: "none", duration: zoomDuration },
              start
            );
        } else {
          stickyTimeline.fromTo(
            imageInnerRefs.current[index],
            { "--zoom-progress": 0, "--reverse-zoom": 0.1 },
            { "--zoom-progress": 1, "--reverse-zoom": 0, ease: "power1.out", duration: 1.3 * slideDuration },
            introDuration
          );
        }
      });

      stickyTimeline.to({}, { duration: 0 }, 1);

      // 注意: stickyTimeline 不再用 ScrollTrigger scrub 驱动. 因为本页上方组件
      // 让 ScrollTrigger 的内部滚动坐标系比真实 layout 偏移约一个视口, 使得
      // stickyTimeline(进度条/zoom) 比 CSS sticky 的物理钉住/滑出整体提前 ——
      // 进度条/zoom 早早跑满, 但 sticky 还没开始滑出, 中间留下一整段静止空步幅,
      // 且改 start/end 表达式无法绕过(ScrollTrigger 对返回值仍按偏移坐标换算).
      // 改为下面的 gsap.ticker 用 wrapper 的实时 getBoundingClientRect 驱动进度:
      // 这与 CSS sticky 物理行为、以及图下沉用的是同一坐标系, 因此"进度条满"
      // 严格等于"sticky 开始滑出(容器上退 + 图下沉)"那一刻, 空步幅彻底消失.
      stickyTimeline.progress(0);

      // 出场: 图下沉与整组容器上退完全同步、不分前后.
      // 机制: stickyTimeline 跑完(进度条满)的那一刻, sticky 元素恰好开始随
      // wrapper 自然向上滑出 —— 这天然就是"整组容器(绿框+文字+进度条)上退",
      // 且它带着 sticky 占位一起走, 下一段无缝顶入, 不会留空白.
      // 我们用 sticky 元素的实时 top 直接驱动"最后一张图 --end(在框内向下沉,
      // 被框底裁切)": 钉住时 top≈0 → 图不沉; 一开始滑出 top 变负 → 图同步下沉.
      //
      // 关键: 不能用 ScrollTrigger.onUpdate 读取 sticky 位置 —— 在 Lenis 平滑
      // 滚动下, onUpdate(由 ScrollTrigger.update 触发) 跑在浏览器把滚动渲染到
      // DOM 之前, 此刻读到的 sticky top 仍是上一帧的钉住值(0), 导致图沉与容器
      // 退场错位. 改用 gsap.ticker: 它在 SmoothScrollProvider 里 lenis.raf 之后
      // 同帧执行, 此时 sticky 的真实位置已确定, 读到的 top 与用户看到的容器位置
      // 完全一致 —— 图下沉与容器上退由同一帧、同一物理量驱动, 逐帧严格重叠.
      // (不用 translateY 单独移动容器: 那样会留下空的 sticky 占位挡住下一段.)
      const lastInner = imageInnerRefs.current[slideCount - 1];
      const stickyEl = stickyWrapper.querySelector<HTMLElement>(".jobySafetyStickyElement");
      // 单个 ticker 同时驱动两段, 全部基于 getBoundingClientRect(同一真实坐标系):
      //   1) 钉住阶段: 用 wrapper 在视口内的滚动比例驱动 stickyTimeline.progress
      //      (slide 切换 / 进度条 / zoom), progress 1.0 恰好 = sticky 滑出始.
      //   2) 滑出阶段: sticky 元素 top 转负, 同步驱动最后一张图 --end 下沉,
      //      与容器上退(sticky 滑出)逐帧重叠.
      exitTicker = () => {
        const wr = stickyWrapper.getBoundingClientRect();
        const span = stickyWrapper.offsetHeight - window.innerHeight;
        const pinProgress = span > 0 ? Math.min(1, Math.max(0, -wr.top / span)) : 0;
        stickyTimeline.progress(pinProgress);
        if (lastInner && stickyEl) {
          const top = stickyEl.getBoundingClientRect().top;
          const sink = Math.min(1, Math.max(0, -top / (window.innerHeight * 0.85)));
          lastInner.style.setProperty("--end", String(sink));
        }
      };
      gsap.ticker.add(exitTicker);

    }, section);

    return () => {
      removeResizeListener();
      if (exitTicker) gsap.ticker.remove(exitTicker);
      ctx.revert();
    };
  }, []);

  return (
    <section id="invite-stages" className="jobySafetySectionWrapper" data-light-section>
      <div ref={sectionRef} className="jobySafetySection">
        <div ref={stickyWrapperRef} className="jobySafetyStickyWrapper">
          <div className="jobySafetyStickyElement jobySafetyStickyTop">
            <div ref={slidesContainerRef} className="jobySafetySlidesContainer">
              <div ref={imageSliderRef} className="jobySafetyImageSlider">
                <div className="jobySafetyImageSliderMask">
                  {JOBY_SAFETY_SLIDES.map((slide, index) => (
                    <div
                      key={index}
                      ref={(node) => {
                        imageInnerRefs.current[index] = node;
                      }}
                      className="jobySafetyImageSliderInner"
                    >
                      <div className="jobySafetyImageSliderScale">
                        <div className="jobySafetyImageSliderInnerZoom">
                          <div className="jobySafetyImageWrapper">
                            <img src={slide.image} alt={t(slide.title.zh, slide.title.en)} className="jobySafetyImage" draggable={false} />
                          </div>
                        </div>
                        <span className="jobySafetyImageSliderInnerTag" style={{ color: slide.tagColor }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {JOBY_SAFETY_SLIDES.map((slide, index) => (
                <div key={`${index}-mobile-tag`} className="jobySafetyImageTagWrapperMobile">
                  <span className="jobySafetyCaption">{slide.imageTag ?? ""}</span>
                </div>
              ))}

              {JOBY_SAFETY_SLIDES.map((slide, index) => (
                <div
                  key={index}
                  ref={(node) => {
                    contentRefs.current[index] = node;
                  }}
                  className="jobySafetyContentWrapper"
                  style={{
                    opacity: index === 0 ? 1 : 0,
                    visibility: index === 0 ? "visible" : "hidden",
                  }}
                >
                  <div className="jobySafetyTextContainer">
                    <h4 className="jobySafetyHeading4">
                      <span
                        ref={(node) => {
                          titleTextRefs.current[index] = node;
                        }}
                        className="jobySafetyAnimatedText"
                        data-style-inline="false"
                        role="text"
                      >
                        {t(slide.title.zh, slide.title.en).split("\n").map((line, lineIndex) => (
                          <span
                            key={lineIndex}
                            className={lineIndex === 0 ? undefined : "jobySafetyHeadingHighlight"}
                          >
                            {line}
                          </span>
                        ))}
                      </span>
                    </h4>
                  </div>
                  <div className="jobySafetySubtitleWrapper">
                    <p className="jobySafetyBody1">
                      <span
                        ref={(node) => {
                          bodyTextRefs.current[index] = node;
                        }}
                        className="jobySafetyAnimatedText"
                        data-style-inline="false"
                        role="text"
                      >
                        {t(slide.body.zh, slide.body.en)}
                      </span>
                    </p>
                  </div>
                </div>
              ))}

              <div ref={paginationRef} className="jobySafetyPagination" aria-hidden="true">
                {JOBY_SAFETY_SLIDES.map((_slide, index) => (
                  <div
                    key={index}
                    ref={(node) => {
                      paginationRefs.current[index] = node;
                    }}
                    className="jobySafetyPaginationItem"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 * 子段: 邀新活动 / 排行榜玩法 (Figma node 1802:26334, 1440×800)
 * 浅绿底, 左侧标题 + 需求背景, 右侧两张手机错落展示
 * ============================================================ */
function InviteRankingSection({ scale }: { scale?: number }) {
  const t = useT();
  const rawScale = scale ?? 1;
  const FRAME_W = 1440;
  const FRAME_H = 800;
  const LONG_CANVAS_CONTINUE_Y = 1323;
  const LONG_CANVAS_DIVIDER_H = 20;
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const colorLayerRef = useRef<HTMLDivElement | null>(null);
  const [heightFitScale, setHeightFitScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const vh = window.innerHeight || FRAME_H;
      setHeightFitScale(vh / FRAME_H);
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  // 邀新设计稿是 1440x800。缩放同时受宽度和高度约束，并且最高不超过 1x，
  // 避免 333px 宽的 Figma 手机截图在大屏继续放大变糊，也避免矮屏裁穿。
  const layoutScale = Math.min(rawScale, heightFitScale, 1);
  const s = layoutScale;
  // 大屏下图片不放大, 但整组位置跟随可用宽度居中偏移; 组内间距保持设计稿数值。
  const phoneGroupOffsetX = Math.max(0, (FRAME_W * rawScale - FRAME_W * layoutScale) / 2);
  const shareCardH = 324 * (1045 / 999);
  // 分享弹窗底部与左侧长手机底部对齐。
  const grayShareCardTop = 124 + 324 * (3114 / 999) - shareCardH;
  const colorShareCardTop = 124 + 324 * (3173 / 999) - shareCardH;
  const imageContinueStartY = Math.min(
    LONG_CANVAS_CONTINUE_Y,
    Math.max(FRAME_H, (heightFitScale * FRAME_H) / Math.max(layoutScale, 0.001))
  );
  const imageContinueHeight = Math.max(0, (LONG_CANVAS_CONTINUE_Y - imageContinueStartY) * layoutScale);

  useEffect(() => {
    const section = sectionRef.current;
    const colorLayer = colorLayerRef.current;
    if (!section || !colorLayer) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.set(section, {
        borderTopLeftRadius: 120,
        borderTopRightRadius: 120,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      });
      gsap.set(colorLayer, {
        clipPath: "inset(0% 0% 0% 0% round 0px 0px 0px 0px)",
        WebkitClipPath: "inset(0% 0% 0% 0% round 0px 0px 0px 0px)",
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        force3D: true,
        backfaceVisibility: "hidden",
      });

      gsap.to(section, {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "top center",
          scrub: 1.2,
          invalidateOnRefresh: true,
        },
      });

      gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=120%",
          pin: true,
          scrub: 1.2,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
        .to(colorLayer, {
          clipPath: "inset(0% 0% 100% 0% round 0px 0px 120px 120px)",
          WebkitClipPath: "inset(0% 0% 100% 0% round 0px 0px 120px 120px)",
          borderBottomLeftRadius: 120,
          borderBottomRightRadius: 120,
          force3D: true,
          ease: "none",
          duration: 1,
        }, 0)
    }, section);

    return () => ctx.revert();
  }, []);

  const renderInviteLayer = (isColor: boolean) => {
    if (!isColor) {
      return (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            backgroundColor: "#F5F4DF",
            borderRadius: 0,
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            contain: "layout paint style",
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: FRAME_W,
              height: FRAME_H,
              transform: `translateX(${phoneGroupOffsetX}px) scale(${layoutScale})`,
              transformOrigin: "top left",
            }}
          >
            <div
              className="absolute overflow-hidden"
              style={{
                left: 698,
                top: 124,
                width: 324,
                height: 324 * (1038 / 333),
              }}
            >
              <img
                src="/figma/credmex/invite-ranking/invite-phone-gray@3x.webp?v=20260529-2338"
                alt={t("邀新活动邀请页", "Referral campaign invite page")}
                draggable={false}
                className="block select-none"
                style={{ width: 324, height: "auto" }}
              />
            </div>

            <div
              className="absolute overflow-hidden"
              style={{
                left: 1066,
                top: 50,
                width: 324,
                height: 324 * (729 / 333),
              }}
            >
              <img
                src="/figma/credmex/invite-ranking/ranking-phone-gray@3x.webp?v=20260529-2338"
                alt={t("邀新活动排行榜页", "Referral campaign leaderboard page")}
                draggable={false}
                className="block select-none"
                style={{ width: 324, height: "auto" }}
              />
            </div>

            <div
              className="absolute overflow-hidden"
              style={{
                left: 1066,
                top: grayShareCardTop,
                width: 324,
                height: shareCardH,
              }}
            >
              <img
                src="/figma/credmex/invite-ranking/share-card-gray@3x.webp?v=20260529-2338"
                alt={t("邀新活动分享弹窗", "Referral campaign share popup")}
                draggable={false}
                className="block select-none"
                style={{ width: 324, height: "auto" }}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          backgroundColor: "#E2FF7C",
          borderRadius: 0,
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          contain: "layout paint style",
          willChange: "transform",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute select-none"
          style={{
            left: "-67.5%",
            top: "-53.25%",
            right: "-37.91%",
            bottom: "-75.92%",
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
          <img
            src="/figma/credmex/invite-ranking/bg-union.svg?v=20260529-figma-1804-26789"
            alt=""
            draggable={false}
            className="absolute inset-0 block size-full max-w-none"
          />
        </div>

        <div
          className="absolute left-0 top-0"
          style={{
            width: FRAME_W,
            height: FRAME_H,
            transform: `translateX(${phoneGroupOffsetX}px) scale(${layoutScale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            className="absolute overflow-hidden"
            style={{
              left: 698,
              top: 124,
              width: 324,
              height: 324 * (3173 / 999),
            }}
          >
            <img
              src="/figma/credmex/invite-ranking/invite-phone@3x.webp?v=20260529-2338"
              alt={t("邀新活动邀请页", "Referral campaign invite page")}
              draggable={false}
              className="block select-none"
              style={{ width: 324, height: "auto" }}
            />
          </div>

          <div
            className="absolute overflow-hidden"
            style={{
              left: 1066,
              top: 50,
              width: 324,
              height: 324 * (729 / 333),
            }}
          >
            <img
              src="/figma/credmex/invite-ranking/ranking-phone@3x.webp?v=20260529-2338"
              alt={t("邀新活动排行榜页", "Referral campaign leaderboard page")}
              draggable={false}
              className="block select-none"
              style={{ width: 324, height: "auto" }}
            />
          </div>

          <div
            className="absolute overflow-hidden"
            style={{
              left: 1066,
              top: colorShareCardTop,
              width: 324,
              height: shareCardH,
            }}
          >
            <img
              src="/figma/credmex/invite-ranking/share-card@3x.webp?v=20260530-0035"
              alt={t("邀新活动分享弹窗", "Referral campaign share popup")}
              draggable={false}
              className="block select-none"
              style={{ width: 324, height: "auto" }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <section
      id="events"
      ref={sectionRef}
      className="relative h-screen w-full overflow-hidden"
      data-light-section
      style={{
        isolation: "isolate",
        contain: "layout paint style",
        backgroundColor: "#E2FF7C",
        borderTopLeftRadius: 120,
        borderTopRightRadius: 120,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        willChange: "border-radius",
      }}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ isolation: "isolate", contain: "layout paint style" }}
      >
        {/* 底层: 第二张画布 (Figma 1804:27191) */}
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          {renderInviteLayer(false)}
        </div>

        {/* 顶层: 彩色版, ScrollTrigger 只裁 clip-path */}
        <div
          ref={colorLayerRef}
          className="absolute inset-0 overflow-hidden"
          style={{
            zIndex: 2,
            clipPath: "inset(0% 0% 0% 0% round 0px 0px 0px 0px)",
            WebkitClipPath: "inset(0% 0% 0% 0% round 0px 0px 0px 0px)",
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            contain: "layout paint style",
            willChange: "transform, border-radius",
          }}
        >
          {renderInviteLayer(true)}
        </div>

        {/* 静态文字层: 不参与两张画布的滑动切换 */}
        <div
          className="absolute flex flex-col items-start"
          style={{
            left: 40 * s,
            top: 240 * s,
            width: 697 * s,
            gap: 60 * s,
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 40 * s,
              fontWeight: 600,
              lineHeight: "normal",
              color: "#000000",
              margin: 0,
              whiteSpace: "pre-line",
            }}
          >
            {t("邀新活动\n排行榜玩法", "Referral Campaign\nLeaderboard Mechanic")}
          </p>
          <div className="flex flex-col items-start" style={{ gap: 8 * s }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 14 * s, fontWeight: 500, color: "#000000", margin: 0, lineHeight: "normal" }}>
              {t("需求背景", "Background")}
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 14 * s, fontWeight: 500, color: "#3B3B3B", margin: 0, lineHeight: "normal", maxWidth: 470 * s }}>
              {t("新增排行榜玩法，实现邀新活动的用户参与度和邀请数量的双向提升。", "Adding a leaderboard mechanic to lift both user engagement and invite volume in the referral campaign.")}
            </p>
          </div>
        </div>
      </div>
    </section>
    <div
      className="relative w-full overflow-hidden"
      data-light-section
      style={{
        height: imageContinueHeight,
        backgroundColor: "#F5F4DF",
      }}
    >
      {[
        {
          src: "/figma/credmex/invite-ranking/invite-phone-gray-lossless.webp?v=20260530-0133",
          alt: t("邀新活动邀请页", "Referral campaign invite page"),
          left: 698,
          top: 124,
          height: 324 * (1038 / 333),
        },
        {
          src: "/figma/credmex/invite-ranking/ranking-phone-gray-lossless.webp?v=20260530-0133",
          alt: t("邀新活动排行榜页", "Referral campaign leaderboard page"),
          left: 1066,
          top: 50,
          height: 324 * (729 / 333),
        },
        {
          src: "/figma/credmex/invite-ranking/share-card-gray-lossless.webp?v=20260530-0133",
          alt: t("邀新活动分享弹窗", "Referral campaign share popup"),
          left: 1066,
          top: grayShareCardTop,
          height: shareCardH,
        },
      ].map((img) => (
        <div
          key={img.src}
          className="absolute overflow-hidden"
          style={{
            left: phoneGroupOffsetX + img.left * layoutScale,
            top: (img.top - imageContinueStartY) * layoutScale,
            width: 324 * layoutScale,
            height: img.height * layoutScale,
          }}
        >
          <img
            src={img.src}
            alt={img.alt}
            draggable={false}
            className="block select-none"
            style={{ width: 324 * layoutScale, height: "auto" }}
          />
        </div>
      ))}
    </div>
    <div
      className="relative w-full overflow-hidden"
      data-light-section
      style={{
        height: LONG_CANVAS_DIVIDER_H,
        backgroundColor: "#F5F4DF",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 w-full"
        style={{
          height: LONG_CANVAS_DIVIDER_H,
          backgroundColor: "#F5F4DF",
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            top: 10,
            height: 1,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
          }}
        />
      </div>
    </div>
    <JobySafetySliderExact />
    <InviteRankingShowcaseSection scale={rawScale} />
    </>
  );
}

const INVITE_SHOWCASE_BLACK_IMAGES = [
  inviteT1Image.src,
  inviteT2Image.src,
  inviteT3Image.src,
  inviteT4Image.src,
  inviteT5Image.src,
];
const INVITE_SHOWCASE_BLUE_IMAGES = [
  inviteY1Image.src,
  inviteY2Image.src,
  inviteY3Image.src,
  inviteY4Image.src,
];
const INVITE_SHOWCASE_CONTAINER_IMAGES = [
  inviteK01Image.src,
  inviteK02Image.src,
  inviteK03Image.src,
  inviteK04Image.src,
  inviteK05Image.src,
];

function InviteRankingShowcaseSection({ scale }: { scale?: number }) {
  const s = Math.min(scale ?? 1, 1);
  const FRAME_W = 1440;
  const FRAME_H = 800;
  const sectionRef = useRef<HTMLElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [blackIndex, setBlackIndex] = useState(0);
  const [blueIndex, setBlueIndex] = useState(0);
  const [blueTransitionEnabled, setBlueTransitionEnabled] = useState(true);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || FRAME_H;
      const progress = Math.max(0, Math.min(1, (vh * 0.5 - rect.top) / (vh * 0.5)));
      setScrollProgress(progress);
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // 往上滑时底部两个圆角逐渐加大 (参考 InviteRankingSection 顶部圆角的滚动驱动写法).
  // section 是 overflow-hidden, 圆角会把内容一起裁出圆角, 露出下方黑色背景.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.set(section, {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      });
      gsap.to(section, {
        borderBottomLeftRadius: 120,
        borderBottomRightRadius: 120,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "bottom bottom",
          end: "bottom top",
          scrub: 1.2,
          invalidateOnRefresh: true,
        },
      });
    }, section);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (INVITE_SHOWCASE_BLACK_IMAGES.length <= 1) return;
    const timer = window.setInterval(() => {
      setBlackIndex((index) => (index + 1) % INVITE_SHOWCASE_BLACK_IMAGES.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (INVITE_SHOWCASE_BLUE_IMAGES.length <= 1) return;
    const timer = window.setInterval(() => {
      setBlueIndex((index) => {
        if (index < INVITE_SHOWCASE_BLUE_IMAGES.length - 1) {
          setBlueTransitionEnabled(true);
          return index + 1;
        }

        setBlueTransitionEnabled(false);
        window.setTimeout(() => setBlueTransitionEnabled(true), 50);
        return 0;
      });
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  const getCardMotionStyle = (
    index: number,
    from: "left" | "right" | "bottom" = "bottom"
  ): CSSProperties => {
    const localProgress = Math.max(0, Math.min(1, (scrollProgress - index * 0.065) / 0.28));
    const eased = 1 - Math.pow(1 - localProgress, 3);
    const tx = from === "left" ? -56 : from === "right" ? 56 : 0;
    const ty = from === "bottom" ? 56 : 24;

    return {
      opacity: eased,
      transform: `translate3d(${tx * (1 - eased)}px, ${ty * (1 - eased)}px, 0) scale(${0.96 + eased * 0.04})`,
      willChange: "opacity, transform",
    };
  };

  const imageCard = (
    x: number,
    y: number,
    w: number,
    h: number,
    src: string,
    radius = 20,
    motionStyle?: CSSProperties
  ) => (
    <div
      className="absolute overflow-hidden"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius,
        ...motionStyle,
      }}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="block size-full select-none"
        style={{
          objectFit: "cover",
        }}
      />
    </div>
  );

  const carousel = (
    x: number,
    y: number,
    w: number,
    h: number,
    images: string[],
    activeIndex: number,
    backgroundColor: string,
    from: "left" | "right",
    index: number,
    imageLayout: "popup" | "phone",
    switchMode: "vertical" | "horizontal" | "fade" = "fade",
    transitionEnabled = true
  ) => (
    <div
      className="absolute overflow-hidden"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 20,
        backgroundColor,
        ...getCardMotionStyle(index, from),
      }}
    >
      {images.length > 0 ? (
        images.map((src, i) => {
          let itemOffset = i - activeIndex;
          const isVertical = switchMode === "vertical";
          const isHorizontal = switchMode === "horizontal";
          if (isVertical) {
            if (itemOffset > 1) itemOffset -= images.length;
            if (itemOffset < -1) itemOffset += images.length;
          }
          const translateBase = imageLayout === "phone"
            ? "translateX(-50%)"
            : "translate(-50%, -50%)";
          const motionTransform = isVertical
            ? `translate(-50%, calc(-50% + ${itemOffset * 112}%))`
            : isHorizontal
              ? `${translateBase} translateX(${itemOffset * 112}%)`
              : translateBase;

          return (
            <img
              key={src}
              src={src}
              alt=""
              draggable={false}
              className="absolute select-none"
              style={{
                left: "50%",
                top: imageLayout === "phone" ? 32 : "50%",
                width: imageLayout === "popup" ? "79.35%" : `calc(100% - ${32 * 2}px)`,
                height: imageLayout === "phone" ? `calc(100% - ${32}px)` : "auto",
                maxWidth: imageLayout === "phone" ? `calc(100% - ${32 * 2}px)` : "79.35%",
                maxHeight: imageLayout === "popup" ? "82.1%" : `calc(100% - ${32}px)`,
                objectFit: imageLayout === "phone" ? "cover" : "contain",
                objectPosition: "top center",
                opacity: isHorizontal ? 1 : i === activeIndex ? 1 : 0,
                transform: motionTransform,
                transformOrigin: "50% 50%",
                transition: isVertical || isHorizontal
                  ? transitionEnabled
                    ? "transform 820ms cubic-bezier(0.22,1,0.36,1), opacity 420ms cubic-bezier(0.22,1,0.36,1)"
                    : "none"
                  : "opacity 640ms cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          );
        })
      ) : null}
    </div>
  );

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      data-light-section
      style={{
        height: FRAME_H * s,
        backgroundColor: "#F5F4DF",
      }}
    >
      <div
        className="absolute left-1/2 top-0"
        style={{
          width: FRAME_W,
          height: FRAME_H,
          transform: `translateX(-50%) scale(${s})`,
          transformOrigin: "top center",
        }}
      >
        {carousel(120, 120, 339, 371, INVITE_SHOWCASE_BLACK_IMAGES, blackIndex, "#2A2A2A", "left", 0, "popup", "vertical")}
        {imageCard(120, 511, 339, 161, INVITE_SHOWCASE_CONTAINER_IMAGES[0], 20, getCardMotionStyle(1, "left"))}
        {imageCard(479, 120, 273, 168, INVITE_SHOWCASE_CONTAINER_IMAGES[2], 20, getCardMotionStyle(2, "bottom"))}
        {imageCard(772, 120, 189, 168, INVITE_SHOWCASE_CONTAINER_IMAGES[3], 20, getCardMotionStyle(3, "bottom"))}
        {imageCard(479, 308, 482, 221, INVITE_SHOWCASE_CONTAINER_IMAGES[1], 20, getCardMotionStyle(4, "bottom"))}
        {imageCard(479, 549, 482, 123, INVITE_SHOWCASE_CONTAINER_IMAGES[4], 20, getCardMotionStyle(5, "bottom"))}
        {carousel(981, 120, 339, 552, INVITE_SHOWCASE_BLUE_IMAGES, blueIndex, "#696CFF", "right", 6, "phone", "horizontal", blueTransitionEnabled)}
      </div>
    </section>
  );
}

/* ============================================================
 * 子段 3: footer (黄绿矩形 + 头像 + 6 社交图标)
 * Figma: 561:15354 (-12,2783 1132x122)
 * - 黄绿矩形 448x122 at frame(0,0) → stage(-12,2783)
 * - 头像 90x90 at frame(342,16) → stage(330,2799)
 * - 社交图标 frame 660x90 at frame(472,16) → stage(460,2799)
 *   内部 6 个 90x90 圆形, gap 24
 * ============================================================ */
function SocialFooter({ scale }: { scale?: number }) {
  const s = scale ?? 1;
  const FOOTER_H = 154; // stage 坐标: 122 + 16*2 padding
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: FOOTER_H * s }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: STAGE_W,
          height: FOOTER_H,
          transform: `scale(${s})`,
          transformOrigin: "top left",
        }}
      >
        <RevealGroup triggerTop={0}>
          <RevealItem index={0}>
            <div
              className="absolute"
              style={{
                left: -12,
                top: 0,
                width: 448,
                height: 122,
                backgroundColor: "#C7FC07",
              }}
            />
          </RevealItem>

          <RevealItem index={1}>
            <div
              className="absolute overflow-hidden"
              style={{
                left: 330,
                top: 16,
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: "#000000",
                backgroundImage:
                  "radial-gradient(120% 120% at 30% 25%, #2a2a2e 0%, #000000 70%)",
                border: "2px solid rgba(255,255,255,0.05)",
              }}
            />
          </RevealItem>

          <RevealItem
            index={2}
            className="absolute flex"
            style={{ left: 460, top: 16, width: 660, height: 90, gap: 24 }}
          >
            <SocialBubble bg="#1B7FFF">
              <FacebookGlyph />
            </SocialBubble>
            <SocialBubble bg="#FF2828">
              <YoutubeGlyph />
            </SocialBubble>
            <SocialBubble
              bg="linear-gradient(135deg,#fbe18a 0%,#fcbb45 22%,#f75274 38%,#d53692 53%,#8f39ce 75%,#5b4fe9 100%)"
            >
              <InstagramGlyph />
            </SocialBubble>
            <SocialBubble bg="#232323">
              <TiktokGlyph />
            </SocialBubble>
            <SocialBubble bg="#232323">
              <XGlyph />
            </SocialBubble>
            <SocialBubble bg="#000000">
              <ThreadsGlyph />
            </SocialBubble>
          </RevealItem>
        </RevealGroup>
      </div>
    </div>
  );
}

/* ============================================================
 * 公共: 章节标题 (跟 timeline "职业生涯" header 一致结构)
 * 标题 64px white SemiBold, 副标题 20px (灰), 居中 800 宽, gap 40
 * 设计稿 frame: 320,top 800x196
 * ============================================================ */
function SectionHeader({
  title,
  top,
  descriptionParts,
  scale = 1,
}: {
  title: string;
  top: number;
  descriptionParts: { text: string; color: string }[];
  scale?: number;
}) {
  // SectionHeader 内部自己拆 标题 / 副标题 错峰入场, 跟 timeline "职业生涯"
  // header 完全一致的节奏: 标题 0ms, 副标题 100ms 后跟上.
  // RevealItem 内部 hasOwnPosition=false 走默认全覆盖, 所以这里手动再叠
  // 一层位置. 标题/副标题各自是一个 RevealItem 子项, 复用 RevealCtx 拿
  // 父级 RevealGroup 的 visible 状态
  return (
    <div
      className="absolute flex flex-col items-center select-none"
      style={{ left: 320, top, width: 800, gap: 40 }}
    >
      <RevealItem index={0} style={{ position: "relative", inset: "auto" }}>
        <p
          style={{
            fontSize: 64,
            color: "#ffffff",
            fontWeight: 600,
            lineHeight: 1,
            margin: 0,
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </p>
      </RevealItem>
      <RevealItem index={1} style={{ position: "relative", inset: "auto", width: 800 }}>
        <p
          style={{
            // 对齐"产品搭建"副标题的视觉字号 18px: 该段在 scale stage 内会被 ×scale,
            // 故除以 scale 抵消, 最终渲染恒为 18px (与不缩放的 ProductSection 一致)
            fontSize: 18 / scale,
            fontWeight: 400,
            textAlign: "center",
            width: 800,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {descriptionParts.map((part, i) => (
            <span key={i} style={{ color: part.color }}>
              {part.text}
            </span>
          ))}
        </p>
      </RevealItem>
    </div>
  );
}

/* ============================================================
 * 公共: 额度推荐文案块 (697x332, 标题 40 + 当前问题 / 设计策略 14px)
 * Figma: 575:3760 / 575:3761
 * ============================================================ */

/* ============================================================
 * footer 圆形社交图标气泡 + 内部 SVG 图形
 * ============================================================ */
function SocialBubble({
  bg,
  children,
}: {
  bg: string;
  children: React.ReactNode;
}) {
  const isGradient = bg.startsWith("linear-gradient");
  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{
        width: 90,
        height: 90,
        borderRadius: 45,
        background: isGradient ? bg : undefined,
        backgroundColor: isGradient ? undefined : bg,
      }}
    >
      {children}
    </div>
  );
}

function FacebookGlyph() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="white">
      <path d="M13.5 21.95v-7.95H16l.5-3.5h-3v-2.27c0-1 .29-1.69 1.74-1.69H17V3.18C16.65 3.13 15.55 3 14.27 3 11.6 3 9.78 4.66 9.78 7.69V10.5H7v3.5h2.78v7.95C10.7 22.07 11.34 22 12 22c.51 0 1.01-.02 1.5-.05Z" />
    </svg>
  );
}

function YoutubeGlyph() {
  return (
    <svg width="44" height="32" viewBox="0 0 24 17" fill="white">
      <path d="M23.5 2.65a3 3 0 0 0-2.11-2.12C19.51 0 12 0 12 0S4.49 0 2.61.53A3 3 0 0 0 .5 2.65 31.4 31.4 0 0 0 0 8.5a31.4 31.4 0 0 0 .5 5.85 3 3 0 0 0 2.11 2.12C4.49 17 12 17 12 17s7.51 0 9.39-.53a3 3 0 0 0 2.11-2.12A31.4 31.4 0 0 0 24 8.5a31.4 31.4 0 0 0-.5-5.85ZM9.6 12.13V4.87L15.82 8.5l-6.22 3.63Z" />
    </svg>
  );
}

function InstagramGlyph() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
    </svg>
  );
}

function TiktokGlyph() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
      <path d="M16.6 5.82a4.27 4.27 0 0 1-2.7-1.04 4.3 4.3 0 0 1-1.43-2.4h-2.94v12.31a2.4 2.4 0 1 1-1.7-2.3v-3a5.4 5.4 0 1 0 4.65 5.34V8.94a7.27 7.27 0 0 0 4.12 1.27V7.27a4.3 4.3 0 0 1 0-1.45Z" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

/* ============================================================
 * 合作品牌展示 (复刻 fromanother.love "They trust us")
 * 弧形排列 + scroll-driven + logo切换 + 说明文字
 * CSS公式: radius=58rem, theta=relIndex*11deg
 * x = radius*(1-cos(theta)), y = radius*sin(theta)
 * ============================================================ */
const COLLAB_BRANDS = [
  { name: "Search", icon: "/figma/credmex/icons/search.svg" },
  { name: "Add", icon: "/figma/credmex/icons/add-yes.svg" },
  { name: "Refresh", icon: "/figma/credmex/icons/refresh.svg" },
  { name: "Close", icon: "/figma/credmex/icons/close.svg" },
  { name: "Reduce", icon: "/figma/credmex/icons/reduce-yes.svg" },
  { name: "Back", icon: "/figma/credmex/icons/back.svg" },
  { name: "Question", icon: "/figma/credmex/icons/question.svg" },
  { name: "Customer Service", icon: "/figma/credmex/icons/customerservice.svg" },
  { name: "Message", icon: "/figma/credmex/icons/message.svg" },
  { name: "Illustrate", icon: "/figma/credmex/icons/illustrate.svg" },
  { name: "Feedback", icon: "/figma/credmex/icons/feedback.svg" },
  { name: "Edit", icon: "/figma/credmex/icons/edit-green.svg" },
  { name: "Unfold", icon: "/figma/credmex/icons/unfold-purple.svg" },
  { name: "Fold", icon: "/figma/credmex/icons/fold-purple.svg" },
  { name: "Add Purple", icon: "/figma/credmex/icons/add-purple.svg" },
  { name: "Add Green", icon: "/figma/credmex/icons/add-green.svg" },
  { name: "Confirmar", icon: "/figma/credmex/icons/confirmar-green.svg" },
  { name: "Confirmar Purple", icon: "/figma/credmex/icons/confirmar-purple.svg" },
  { name: "Find", icon: "/figma/credmex/icons/find-purple.svg" },
  { name: "Guide", icon: "/figma/credmex/icons/guide-01.svg" },
  { name: "Phone", icon: "/figma/credmex/icons/guide-02.svg" },
  { name: "Bank", icon: "/figma/credmex/icons/bank.svg" },
  { name: "Bankcard", icon: "/figma/credmex/icons/bankcard.svg" },
];

function CollaborationsSection({ scale }: { scale?: number }) {
  const s = scale ?? 1;
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let raf = 0;
    let active = false;

    const update = () => {
      raf = 0;
      if (!active) return;
      const rect = section.getBoundingClientRect();
      const vpH = window.innerHeight;
      const stickyRange = rect.height - vpH;
      if (stickyRange <= 0) return;
      const scrolled = Math.max(0, -rect.top);
      const p = Math.min(1, scrolled / stickyRange);
      setProgress(p);
      if (contentRef.current) {
        contentRef.current.style.setProperty("--progress", p.toString());
      }
      raf = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        active = e.isIntersecting;
        if (active && !raf) raf = requestAnimationFrame(update);
      },
      { threshold: 0 }
    );
    io.observe(section);

    const onScroll = () => { if (active && !raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const SCROLL_H = 3000;
  const total = COLLAB_BRANDS.length;
  const RADIUS = 920;
  const THETA_DEG = 7.5;

  const activeIdx = Math.round(progress * (total - 1));

  return (
    <div
      ref={sectionRef}
      className="relative w-full"
      data-light-section
      style={{ height: SCROLL_H * s, marginTop: 0 }}
    >
      <div
        className="sticky top-0 left-0 w-full overflow-hidden"
        style={{ height: "100vh", backgroundColor: "#ECECEC" }}
      >
        <div
          ref={contentRef}
          style={{ position: "absolute", inset: 0, ["--total-items" as string]: total }}
        >

          {/* 右侧：当前 active icon
              全部图标常驻 DOM、用 opacity 切换显隐 —— 避免随 activeIdx 切 src 时
              销毁/重建 <img> 导致"切到才临时加载、空白一下"。图标都是小 SVG (共 ~92KB),
              首次渲染即全部加载进缓存, 滚动切换零延迟。 */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "75%",
              transform: "translate(-50%, -50%)",
              zIndex: 2,
              width: 40 * s,
              height: 40 * s,
            }}
          >
            {COLLAB_BRANDS.map((brand, i) => (
              <img
                key={brand.name}
                src={brand.icon}
                alt={brand.name}
                loading="eager"
                decoding="async"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: 40 * s,
                  height: 40 * s,
                  opacity: i === activeIdx ? 1 : 0,
                  transition: "opacity 0.4s",
                }}
              />
            ))}
          </div>

          {/* 弧形品牌名 */}
          {COLLAB_BRANDS.map((brand, i) => {
            const relIndex = i - progress * (total - 1);
            const thetaRad = relIndex * THETA_DEG * (Math.PI / 180);
            const x = RADIUS * (1 - Math.cos(thetaRad));
            const y = RADIUS * Math.sin(thetaRad);
            const rot = relIndex * THETA_DEG;
            const isActive = Math.abs(relIndex) < 0.5;

            return (
              <span
                key={brand.name}
                style={{
                  position: "absolute",
                  left: "23vw",
                  top: "50%",
                  transform: `translate(${-x}px, calc(-50% + ${y}px)) rotate(${rot}deg)`,
                  transformOrigin: "center left",
                  fontSize: 48 * s,
                  fontWeight: 600,
                  color: isActive ? "#1a1a1a" : "rgba(0,0,0,0.12)",
                  letterSpacing: "-0.03em",
                  whiteSpace: "nowrap",
                  transition: "color 0.4s cubic-bezier(0.25,1,0.5,1)",
                  willChange: "transform",
                  pointerEvents: "none",
                }}
              >
                {brand.name}
              </span>
            );
          })}

        </div>
      </div>
    </div>
  );
}

function ThreadsGlyph() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="white">
      <path d="M12.18 22h-.05C9.16 21.98 6.86 21 5.3 19.13c-1.4-1.65-2.13-3.97-2.18-6.88v-.5c.05-2.91.78-5.23 2.18-6.88C6.86 3 9.16 2.02 12.13 2h.05c2.27.02 4.16.7 5.62 2.04 1.37 1.26 2.13 3.04 2.27 5.3l-1.96.06c-.21-1.66-.78-2.92-1.7-3.78-1.06-.97-2.55-1.47-4.24-1.49h-.04c-2.32.02-4.07.79-5.21 2.34-1.07 1.45-1.62 3.43-1.66 5.95v.5c.04 2.52.59 4.5 1.66 5.95 1.14 1.55 2.89 2.32 5.21 2.34h.04c2.07-.01 3.46-.5 4.6-1.59.92-.88 1.43-2.07 1.62-3.6.01-.13.05-.46-.21-.86-.6-.91-2.32-1.46-4.41-1.46-2.27 0-3.43.58-3.43 1.45 0 .67.94 1.39 2.93 1.39h.34v1.96h-.34c-3.28 0-4.92-1.34-4.92-3.36 0-2.05 1.93-3.4 4.42-3.4 1.81 0 3.4.39 4.45 1.05.59-1.45.59-3.18-.21-4.43-.79-1.24-2.21-1.97-4.04-1.97h-.07c-1.45.02-2.66.5-3.49 1.4-.79.85-1.21 2.05-1.25 3.55l-1.96-.05c.05-1.97.62-3.66 1.7-4.85 1.21-1.32 2.93-2.02 5-2.06h.07c2.51 0 4.49 1.05 5.6 2.96 1.05 1.81 1.16 4.16.31 6.03 1 .57 1.71 1.32 2.07 2.21.36.91.36 1.87.21 2.78-.27 1.95-.97 3.55-2.21 4.71-1.5 1.43-3.34 2.13-5.91 2.16Z" />
    </svg>
  );
}
