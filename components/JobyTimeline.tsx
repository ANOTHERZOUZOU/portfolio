"use client";

/**
 * JobyTimeline —— 严格按 Joby 原版 (jobyaviation.com/company) 的 outerWrapper
 * 结构合并 Intro + Content 两个模块。
 *
 * DOM 结构（对应 Joby 原版 SectionTimeline）：
 *   div.joby-tl-outer
 *   ├── div.joby-tl-background          ← sticky, z-index:2，覆盖整段滚动
 *   │   ├── div.joby-tl-imageSlider     ← 19 张图片，Intro 阶段切换
 *   │   └── div.joby-tl-videoLayer      ← 4 段视频，Intro 末尾接上 + Breakthroughs 切换
 *   ├── div.joby-tl-introContent        ← z-index:1，左右标题 + 短语切换
 *   │   └── div.joby-tl-stickyWrapper
 *   └── div.jtc-timelineContent          ← z-index:1，4 个 timelineHeader + 3 段 narrative + Breakthroughs sticky
 *       └── section.jtc-sectionWrapper > div.jtc-timelineWrapper
 *
 * 关键：background / introContent / timelineContent 是 grid-area:1/1 的兄弟，
 * outerWrapper 的高度 = introContent 高度 + timelineContent 高度，
 * 整段 sticky 共用一个上下文，背景视频/图片不会"消失"。
 */

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useT } from "@/lib/i18n";
import {
  FIRST_SCREEN_IMAGES as DEFAULT_IMAGES,
  FIRST_SCREEN_VIDEOS as DEFAULT_VIDEOS,
} from "@/lib/firstScreenAssets";

/* ===================== Intro 部分常量 ===================== */

// Joby 源码: t.add(() => { S[0].opacity="1"; T[0].play() }, 0.89)
// reveal 后视频层淡入; 之后 3 个视频顺序自动循环 (无滚动断点), 由 'ended' 事件驱动切换。
const VIDEO_REVEAL_AT = 0.89;
// 年份索引推进区间。原站从 15% 才开始切年，这里提前到 sticky 到位即开始。
const BREAKTHROUGHS_INDEX_START = 0;
const BREAKTHROUGHS_INDEX_END = 0.65;
const EAGER_FRAME_COUNT = 6;

function power2Out(t: number) { return 1 - (1 - t) * (1 - t); }
function power2InOut(t: number) { return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) * (-2 * t + 2) / 2; }
// Joby 自定义 ease: "M0,0 C0,0.751 0.707,0.397 1,1"
function customScaleYEase(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    const cx = 3 * 0.707 * mid * mid * (1 - mid) + mid * mid * mid;
    if (cx < t) lo = mid; else hi = mid;
  }
  const mid = (lo + hi) / 2;
  return 3 * 0.751 * mid * (1 - mid) * (1 - mid) + 3 * 0.397 * mid * mid * (1 - mid) + mid * mid * mid;
}
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

const FIRST_TIMELINE_TITLE_DELAY = 0.12;

/* ===================== Timeline Content 数据 ===================== */

type BilingualText = { zh: string; en: string };

interface TimelineYearItem {
  year: string;
  months?: string[];
  titles: BilingualText[];
  descriptions: BilingualText[];
}

// 个人经历时间轴: 年份 + 阶段标题 (titles) + 经历正文 (descriptions, 含公司·岗位·日期)
const TIMELINE_ITEMS: TimelineYearItem[] = [
  {
    year: "2017",
    months: ["Sep"],
    titles: [{ zh: "The Foundation", en: "The Foundation" }],
    descriptions: [
      {
        zh: "吉林动画学院 · 视觉传达设计 ｜ 2017.09 – 2021.07\n在视觉传达设计的系统训练中，建立了对版式、品牌、图形与信息表达的基础理解。四年的设计学习让我开始关注：设计不仅是视觉呈现，更是信息如何被组织、被理解，并最终被感知",
        en: "Jilin Animation Institute · Visual Communication Design ｜ 2017.09 – 2021.07\nThrough systematic training in visual communication design, I built a foundational understanding of layout, branding, graphics, and information expression. Four years of study taught me that design is not only visual presentation, but how information is organized, understood, and ultimately perceived",
      },
    ],
  },
  {
    year: "2021",
    months: ["Jan", "Jul"],
    titles: [
      { zh: "The Beginning", en: "The Beginning" },
      { zh: "The Growth", en: "The Growth" },
    ],
    descriptions: [
      {
        zh: "北京世纪好未来科技有限公司 · 设计实习生 ｜ 2021.01 – 2021.07\n从脑科学实验室相关产品开始进入真实业务场景，参与 Mental-Bridge 教育知网、云梯计划小程序、阅读表达内容推荐系统等项目设计执行。同时对接小猴 AI 课、学而思培优、学而思网校等业务线，支持产品与运营设计工作，逐步理解设计在教育科技产品中的落地方式",
        en: "Beijing Century TAL Education Technology Co., Ltd. · Design Intern ｜ 2021.01 – 2021.07\nStarting with brain-science lab products, I stepped into real business scenarios, contributing design execution to projects like the Mental-Bridge education knowledge base, the Cloud Ladder mini program, and the reading & expression content recommendation system. Working across lines such as Xiaohou AI Class, XES Peiyou, and XES Online School, I gradually understood how design takes shape in edtech products",
      },
      {
        zh: "小糖互联（北京）网络科技有限公司 · 产品 UI 设计师 ｜ 2021.07 – 2024.05\n围绕糖豆 App 与会员业务展开长期设计实践，从 0 搭建会员权益功能，主导整体视觉风格与运营设计支持。参与主站功能迭代、页面改版、用户调研、趋势分析与设计规范制定，也负责天猫、拼多多会员店铺、官网及课程业务相关设计。这个阶段让我从执行走向系统化思考，开始关注产品体验、运营转化与设计一致性之间的关系",
        en: "Xiaotang Internet (Beijing) Network Technology Co., Ltd. · Product UI Designer ｜ 2021.07 – 2024.05\nI carried out long-term design practice around the Tangdou App and its membership business, building the membership benefits system from scratch and leading the overall visual style and operations design support. Across main-site iteration, redesigns, user research, trend analysis, and design-standards work—plus Tmall/Pinduoduo stores, the official site, and course business—I moved from execution toward systematic thinking about experience, conversion, and design consistency",
      },
    ],
  },
  {
    year: "2024",
    months: ["May"],
    titles: [{ zh: "The Exploration", en: "The Exploration" }],
    descriptions: [
      {
        zh: "半糖去冰科技（北京）有限公司 · 产品 UI 设计师 ｜ 2024.05 – 2025.02\n作为葫芦时刻 App 业务制作人，负责基础业务搭建、商业变现跟进与新领域探索。结合智能体完成文案、业务流程与交互文档输出，并参与移动应用 ASO、UI 标准与规范维护。在付费业务、免费业务与轻应用业务的设计中，持续推动用户转化与会员增长",
        en: "Bantang Qubing Technology (Beijing) Co., Ltd. · Product UI Designer ｜ 2024.05 – 2025.02\nAs the business producer for the Hulu Moment App, I built core business features, followed through on monetization, and explored new domains. I leveraged AI agents to produce copy, workflows, and interaction docs, took part in mobile-app ASO and UI standards maintenance, and continually drove user conversion and membership growth across paid, free, and lightweight services",
      },
    ],
  },
  {
    year: "2025",
    months: ["Feb"],
    titles: [{ zh: "The Expansion", en: "The Expansion" }],
    descriptions: [
      {
        zh: "领岳科技 · 高级 UI 设计师 ｜ 2025.02 – 至今\n负责墨西哥业务端内 UI、运营活动交互与视觉设计，参与官网品牌宣传及组内资源站建设；同时支持波兰业务 Web 与 App 从 0 到 1 的搭建设计，并完成组件库搭建与维护；日本理财业务上线前设计支持，围绕页面结构、模块补充与视觉一致性进行优化调整，配合业务完成开业发布",
        en: "Lingyue Technology · Senior UI Designer ｜ 2025.02 – Present\nI own in-app UI, campaign interaction, and visual design for the Mexico business, and contribute to brand marketing and the team's asset library; I also support the Poland business in building its Web and App from zero to one and maintain the component library, and provided pre-launch design support for the Japan wealth-management business—refining page structure, supplementing modules, and ensuring visual consistency—to help it reach its public launch",
      },
    ],
  },
  {
    year: "2026",
    months: ["Today"],
    titles: [{ zh: "The Frontier", en: "The Frontier" }],
    descriptions: [
      {
        zh: "领岳科技 · 高级 UI 设计师 ｜ 当前进行中\n当前也在将 AI 引入设计流程，通过 vibe coding、智能化辅助与设计自动化探索，提升从概念到落地的效率",
        en: "Lingyue Technology · Senior UI Designer ｜ Now\nCurrently I'm bringing AI into the design workflow—through vibe coding, intelligent assistance, and design automation—to improve efficiency from concept to delivery",
      },
    ],
  },
];

const NARRATIVES: BilingualText[][] = [
  [
    { zh: "屏幕之上，不只是界面", en: "On the screen, there's more than an interface" },
    { zh: "是被反复拆解的问题，是用户停顿的瞬间，也是路径中那些不易察觉的阻力", en: "It's the problems pulled apart again and again, the moments where users pause, and the friction along the path that's easy to overlook" },
  ],
  [
    { zh: "在界面出现之前，设计已经开始", en: "Design begins long before the interface appears" },
    { zh: "它发生在结构、节奏、情绪与判断之间，一遍又一遍被推翻、重组和确认", en: "It happens between structure, rhythm, emotion, and judgment — overturned, reassembled, and confirmed, again and again" },
  ],
  [
    { zh: "这份作品集，记录了一些被解决的问题，也记录了我理解设计的方式", en: "This portfolio records some of the problems I've solved, and the way I understand design" },
    { zh: "从视觉系统到动态交互，从弹窗到页面，我尝试让复杂的业务目标被更清楚地表达，让用户更快理解、更愿意继续，也更容易感受到设计背后的意图", en: "From visual systems to motion and interaction, from modals to full pages, I try to express complex business goals more clearly — so users understand faster, feel more willing to continue, and can more easily sense the intent behind the design" },
    { zh: "设计始于一个值得被解决的问题。随后，它成为结构，成为视觉，成为动作，最终成为体验中被记住的那一瞬间", en: "Design starts with a problem worth solving. Then it becomes structure, becomes visuals, becomes motion — and finally, the one moment in an experience that gets remembered" },
  ],
];

const BODY_TEXTS: BilingualText[][] = [
  [
    { zh: "设计不是在画面上不断增加什么，而是在复杂信息中建立秩序，在模糊需求中找到清晰的表达方式", en: "Design isn't about endlessly adding things to the screen; it's about bringing order to complex information and finding a clear way to express ambiguous needs" },
    { zh: "我并不急于寻找答案。先观察、提问、推翻，再重新组织。一个按钮为什么被点击，一个流程为什么被放弃，一个动效为什么让人感到安心——这些细微的反应，往往比画面本身更接近设计的核心", en: "I'm in no rush to find answers. First observe, question, overturn, then reorganize. Why a button gets clicked, why a flow gets abandoned, why a motion feels reassuring — these subtle reactions are often closer to the core of design than the visuals themselves" },
  ],
  [
    { zh: "信息被梳理，行动被引导，品牌被感知，信任也在短短几秒内被建立。每一个像素、每一次转场、每一个反馈，都应有它存在的理由", en: "Information gets organized, action gets guided, the brand gets perceived, and trust is built within a few short seconds. Every pixel, every transition, every piece of feedback should have a reason to exist" },
  ],
];

function cmap(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const v = outMin + ((outMax - outMin) * (value - inMin)) / (inMax - inMin);
  return Math.min(Math.max(outMin, outMax), Math.max(Math.min(outMin, outMax), v));
}

function buildFlatIndex() {
  const K: { yearIndex: number; monthIndex: number }[] = [];
  TIMELINE_ITEMS.forEach((item, yearIdx) => {
    if (item.months && item.months.length > 0) {
      item.months.forEach((_, monthIdx) => K.push({ yearIndex: yearIdx, monthIndex: monthIdx }));
    } else {
      K.push({ yearIndex: yearIdx, monthIndex: -1 });
    }
  });
  return K;
}

function flattenItems() {
  const flat: { title: BilingualText; description: BilingualText }[] = [];
  TIMELINE_ITEMS.forEach((item) => {
    if (item.months && item.months.length > 0) {
      item.months.forEach((_, i) => flat.push({ title: item.titles[i], description: item.descriptions[i] }));
    } else {
      flat.push({ title: item.titles[0], description: item.descriptions[0] });
    }
  });
  return flat;
}

// 描述拆两段: 首行(公司·岗位｜日期) 与正文之间留 12px 间距
function renderTimelineDesc(text: string, animated: boolean) {
  const nl = text.indexOf("\n");
  const head = nl >= 0 ? text.slice(0, nl) : text;
  const body = nl >= 0 ? text.slice(nl + 1) : "";
  const inner = (
    <>
      <span style={{ display: "block", marginBottom: body ? 12 : 0 }}>{head}</span>
      {body ? <span style={{ display: "block" }}>{body}</span> : null}
    </>
  );
  return animated
    ? <span className="jtc-animatedText" data-style-inline="false">{inner}</span>
    : inner;
}

/* ===================== Props ===================== */

interface JobyTimelineProps {
  images?: string[];
  videos?: string[];
  titleLeft?: string;
  titleRight?: string;
  rightPhrases?: string[];
  introReady?: boolean;
}

/* ===================== Component ===================== */

export function JobyTimeline({
  images = DEFAULT_IMAGES,
  videos = DEFAULT_VIDEOS,
  titleLeft = "Design starts",
  titleRight = "with a question",
  introReady = true,
  rightPhrases = [
    "with a question",
    "with intention",
    "before screens",
    "with rhythm",
    "with motion",
  ],
}: JobyTimelineProps) {
  const t = useT();

  /* ----- Intro refs ----- */
  const outerRef = useRef<HTMLDivElement>(null);
  const introContentRef = useRef<HTMLDivElement>(null);
  const stickyWrapRef = useRef<HTMLDivElement>(null);
  const labelLeftRef = useRef<HTMLSpanElement>(null);
  const labelRightRef = useRef<HTMLSpanElement>(null);
  const titleLeftRef = useRef<HTMLDivElement>(null);
  const titleRightRef = useRef<HTMLDivElement>(null);
  const titleRightTextRef = useRef<HTMLHeadingElement>(null);
  const prevPhraseIdxRef = useRef(0);
  const imageSliderRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoElRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const videoCycleRef = useRef(0); // 当前正在播放的视频下标 (0..videos.length-1)
  const videoRevealedRef = useRef(false); // 视频层是否已淡入 (intro p >= VIDEO_REVEAL_AT)
  const prevImgIdxRef = useRef(0);

  /* ----- Timeline Content refs ----- */
  const I = useRef<HTMLDivElement>(null);
  const firstHeaderSpacerRef = useRef<HTMLDivElement>(null);
  const firstTitleRef = useRef<HTMLDivElement>(null);
  const O = useRef<HTMLDivElement>(null);
  const H = useRef<HTMLDivElement>(null);
  const G = useRef<HTMLDivElement>(null);
  const W = useRef<HTMLDivElement>(null);
  const L = useRef<(HTMLHeadingElement | null)[]>([]);
  const J = useRef<(HTMLDivElement | null)[]>([]);
  const Q = useRef<(HTMLSpanElement | null)[][]>([]);
  const A = useRef<(HTMLParagraphElement | null)[]>([]);
  const C = useRef<(HTMLParagraphElement | null)[]>([]);
  const Y = useRef(-1);
  const X = useRef(-1);

  const rafRef = useRef(0);

  const K = useMemo(() => buildFlatIndex(), []);
  const flatItems = useMemo(() => flattenItems(), []);

  if (Q.current.length === 0) {
    Q.current = TIMELINE_ITEMS.map((item) => new Array(item.months?.length || 0).fill(null));
  }

  /* ----- 标题动态 --offset ----- */
  useEffect(() => {
    const calc = () => {
      const u = titleLeftRef.current;
      const p = titleRightRef.current;
      if (!u || !p) return;
      const wL = u.offsetWidth;
      const wR = p.offsetWidth;
      const halfVw = window.innerWidth / 2;
      u.style.setProperty("--offset", `${-(halfVw - wL)}px`);
      p.style.setProperty("--offset", `${halfVw - wR}px`);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  /* Preloader 不再阻塞加载序列帧; 首段关键帧提前加载, 其余帧 reveal 后后台预热。 */
  useEffect(() => {
    if (!introReady) {
      return;
    }

    let cancelled = false;
    const warmed: HTMLImageElement[] = [];
    const timers: number[] = [];

    const warmImage = (src: string) => {
      if (cancelled) {
        return;
      }
      const img = new Image();
      img.decoding = "async";
      img.onerror = () => {
        img.onerror = null;
        img.src = src;
      };
      img.src = src.replace(".webp", ".avif");
      warmed.push(img);
    };

    images.slice(EAGER_FRAME_COUNT).forEach((src, index) => {
      const id = window.setTimeout(() => warmImage(src), 80 + index * 35);
      timers.push(id);
    });

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      warmed.length = 0;
    };
  }, [images, introReady]);

  /* ----- timelineHeader 1-4 线条：scroll-scrub 平滑驱动 --progress ----- */
  /* Joby 原版用 GSAP scrollTrigger 的 scrub:true 把每个 header 在视口内的
     位置平滑映射到 --progress (0→1)，::before 的 scaleX 跟着连续刷出 */
  const updateHeaderLines = useCallback(() => {
    const vh = window.innerHeight;

    const headers = [O.current].filter(Boolean) as HTMLElement[];
    headers.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const start = vh;
      const end = vh * 0.3;
      const range = start - end;
      if (range <= 0) return;
      const p = clamp01((start - rect.top) / range);
      el.style.setProperty("--progress", p.toString());
    });

    const autoHeaders = [H.current, G.current].filter(Boolean) as HTMLElement[];
    autoHeaders.forEach((el) => {
      if (el.dataset.lineTriggered === "true") return;
      const rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.75) {
        el.dataset.lineTriggered = "true";
        el.style.setProperty("--progress", "1");
      }
    });
  }, []);

  /* ----- animatedText：Joby 原版 AnimatedText 组件挂载后立即设 opacity:1 ----- */
  useEffect(() => {
    const els = document.querySelectorAll(".jtc-animatedText");
    els.forEach((el) => {
      (el as HTMLElement).style.opacity = "1";
    });
  }, []);

  /* ----- scroll-driven narrative chars ----- */
  const updateScrollTitles = useCallback(() => {
    const groups = document.querySelectorAll(".jtc-timelineTitle");
    const vh = window.innerHeight;
    groups.forEach((group) => {
      const groupEl = group as HTMLElement;
      const rect = groupEl.getBoundingClientRect();
      const startTrigger = vh * 0.9;
      const endTrigger = vh * 0.3;
      const totalRange = startTrigger - endTrigger;
      if (totalRange <= 0) return;

      const rawGroupProgress = cmap(startTrigger - rect.top, 0, totalRange, 0, 1);
      const groupProgress = groupEl.classList.contains("jtc-timelineTitle1")
        ? cmap(rawGroupProgress, FIRST_TIMELINE_TITLE_DELAY, 1, 0, 1)
        : rawGroupProgress;
      const titleEls = groupEl.querySelectorAll(".jtc-scrollAnimatedTitle");
      titleEls.forEach((el) => {
        (el as HTMLElement).style.opacity = groupProgress > 0 ? "1" : "0";
      });

      const chars = groupEl.querySelectorAll(".jtc-char");
      const charCount = chars.length;
      if (charCount === 0) return;
      chars.forEach((c, i) => {
        const charStart = i / charCount;
        const charEnd = (i + 1) / charCount;
        const p = cmap(groupProgress, charStart, charEnd, 0, 1);
        (c as HTMLElement).style.setProperty("--progress", p.toString());
      });
    });
  }, []);

  /* 显示第 idx 个视频并从头播放, 其余隐藏并暂停 (用于循环切换) */
  const showCycleVideo = useCallback((idx: number) => {
    videoItemRefs.current.forEach((item, i) => {
      const isActive = i === idx;
      if (item) item.style.opacity = isActive ? "1" : "0";
      const vid = videoElRefs.current[i];
      if (!vid) return;
      if (isActive) {
        try { vid.currentTime = 0; } catch { /* noop */ }
        if (vid.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          vid.load();
        }
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, []);

  /* ----- 主滚动 handler ----- */
  const update = useCallback(() => {
    const outer = outerRef.current;
    const introContent = introContentRef.current;
    const stickyWrap = stickyWrapRef.current;
    if (!outer || !introContent || !stickyWrap) return;

    const vh = window.innerHeight;
    const isMobile = window.innerWidth <= 768;

    const outerRect = outer.getBoundingClientRect();
    const exitProgress = clamp01((vh - outerRect.bottom) / vh);
    const exitRadius = power2Out(exitProgress) * (isMobile ? 80 : 180);
    outer.style.setProperty("--exit-radius", `${exitRadius}px`);

    /* === Intro ScrollTrigger 1: introContent "top bottom" → "top top" === */
    const introRect = introContent.getBoundingClientRect();
    const st1Progress = clamp01(1 - introRect.top / vh);

    const labelFadeIn = clamp01((st1Progress - 0.4) / 0.1);
    if (labelLeftRef.current) labelLeftRef.current.style.opacity = `${labelFadeIn}`;
    if (labelRightRef.current) labelRightRef.current.style.opacity = `${labelFadeIn}`;

    /* === Intro ScrollTrigger 2: stickyWrap "top top" → "bottom -=50%" === */
    const swRect = stickyWrap.getBoundingClientRect();
    const st2Range = Math.max(1, swRect.height - vh * 0.5);
    const st2Raw = -swRect.top / st2Range;
    const p = clamp01(st2Raw);
    const firstHeader = I.current;
    const firstOverlay = firstHeader?.closest(".jtc-fixedIntroHeader") as HTMLElement | null;
    if (firstHeader && firstOverlay) {
      const titleTop = firstTitleRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const followStart = vh * 0.5 + 96;
      const followY = Math.min(0, titleTop - followStart);
      const headerProgress = cmap(p, 0.85, 1, 0, 1);
      firstHeader.style.setProperty("--progress", headerProgress.toString());
      firstHeader.querySelectorAll(".jtc-animatedText").forEach((el) => {
        (el as HTMLElement).style.opacity = cmap(headerProgress, 0.5, 1, 0, 1).toString();
      });
      firstOverlay.style.opacity = p >= 0.85 ? "1" : "0";
      firstOverlay.style.transform = `translateY(calc(-50% + ${followY}px))`;
    }

    if (p <= 0) {
      if (titleLeftRef.current) { titleLeftRef.current.style.setProperty("--progress", "0"); titleLeftRef.current.style.opacity = "1"; }
      if (titleRightRef.current) { titleRightRef.current.style.setProperty("--progress", "0"); titleRightRef.current.style.opacity = "1"; }
      if (titleRightTextRef.current) titleRightTextRef.current.textContent = rightPhrases[0];
      prevPhraseIdxRef.current = 0;
      const slider = imageSliderRef.current;
      if (slider) {
        slider.style.opacity = "0";
        slider.style.setProperty("--scaleX", "0.0001");
        slider.style.setProperty("--scaleY", isMobile ? "0" : "0.2");
        slider.style.setProperty("--border-end", "1");
      }
      if (prevImgIdxRef.current !== 0) {
        itemRefs.current.forEach((item, i) => {
          if (!item) return;
          if (i === 0) { item.style.display = "block"; item.style.opacity = "1"; item.dataset.visible = "true"; }
          else { item.style.display = "none"; item.style.opacity = "0"; item.dataset.visible = "false"; }
        });
        prevImgIdxRef.current = 0;
      }
    } else {
      const labelFadeOutStart = isMobile ? 0 : 0.3;
      const labelFadeOut = 1 - clamp01((p - labelFadeOutStart) / 0.1);
      if (labelLeftRef.current) labelLeftRef.current.style.opacity = `${Math.min(labelFadeIn, labelFadeOut)}`;
      if (labelRightRef.current) labelRightRef.current.style.opacity = `${Math.min(labelFadeIn, labelFadeOut)}`;

      const titleProg = clamp01(p / 0.28);
      if (titleLeftRef.current) titleLeftRef.current.style.setProperty("--progress", `${titleProg}`);
      if (titleRightRef.current) titleRightRef.current.style.setProperty("--progress", `${titleProg}`);

      const titleFadeStart = isMobile ? 0.3 : 0.35;
      const titleFade = 1 - clamp01((p - titleFadeStart) / 0.1);
      if (titleLeftRef.current) titleLeftRef.current.style.opacity = `${titleFade}`;
      if (titleRightRef.current) titleRightRef.current.style.opacity = `${titleFade}`;

      if (titleRightTextRef.current && rightPhrases.length > 1) {
        const phraseEnd = isMobile ? 0.25 : 0.3;
        const phraseT = clamp01(p / phraseEnd);
        const phraseIdx = Math.min(rightPhrases.length - 1, Math.round(phraseT * (rightPhrases.length - 1)));
        if (phraseIdx !== prevPhraseIdxRef.current) {
          titleRightTextRef.current.textContent = rightPhrases[phraseIdx];
          prevPhraseIdxRef.current = phraseIdx;
        }
      }

      const slider = imageSliderRef.current;
      if (slider) {
        slider.style.opacity = p > 0.0001 ? "1" : "0";
        const sxT = clamp01(p / 0.925);
        const scaleX = 0.0001 + power2Out(sxT) * 0.9999;
        slider.style.setProperty("--scaleX", `${scaleX}`);
        const syT = clamp01(p / 0.925);
        const scaleY = isMobile ? syT : (0.2 + customScaleYEase(syT) * 0.8);
        slider.style.setProperty("--scaleY", `${scaleY}`);
        const beT = clamp01((p - 0.85) / 0.1);
        slider.style.setProperty("--border-end", `${1 - power2InOut(beT)}`);
      }

      const imgT = clamp01(p / 0.9);
      const imgIdx = Math.min(images.length - 1, Math.round(imgT * (images.length - 1)));
      if (imgIdx !== prevImgIdxRef.current) {
        itemRefs.current.forEach((item, i) => {
          if (!item) return;
          if (i === imgIdx) {
            item.style.display = "block";
            item.style.opacity = "1";
            item.dataset.visible = "true";
          } else if (item.dataset.visible !== "false") {
            item.style.display = "none";
            item.style.opacity = "0";
            item.dataset.visible = "false";
          }
        });
        prevImgIdxRef.current = imgIdx;
      }
    }

    /* === Breakthroughs scroll (W ref) === */
    let bp = 0;
    if (W.current) {
      const wRect = W.current.getBoundingClientRect();
      const totalScroll = wRect.height - vh;
      if (totalScroll > 0) {
        bp = clamp01(-wRect.top / totalScroll);
        const t = Math.round(cmap(bp, BREAKTHROUGHS_INDEX_START, BREAKTHROUGHS_INDEX_END, 0, K.length - 1));
        const { yearIndex: l, monthIndex: r } = K[t] || { yearIndex: 0, monthIndex: -1 };
        const s = Y.current;
        const n = X.current;

        if (l !== s) {
          Y.current = l;
          L.current.forEach((el, i) => {
            if (!el) return;
            el.style.setProperty("--translateItem", l.toString());
            el.style.setProperty("--topTranslate", i < l ? "1" : "0");
            if (i === l) el.classList.add("jtc-yearItemActive");
            else el.classList.remove("jtc-yearItemActive");
          });
          J.current.forEach((el, i) => {
            if (!el) return;
            if (i === l) el.classList.add("jtc-monthsGroupActive");
            else el.classList.remove("jtc-monthsGroupActive");
          });
        }

        if (r !== n || l !== s) {
          X.current = r;
          Q.current.forEach((yearGroup, yearIdx) => {
            yearGroup?.forEach((el, monthIdx) => {
              if (!el) return;
              if (yearIdx === l && monthIdx === r) el.classList.add("jtc-monthItemActive");
              else el.classList.remove("jtc-monthItemActive");
            });
          });

          TIMELINE_ITEMS.forEach((item, yearIdx) => {
            const hasMonths = item.months && item.months.length > 0;
            const isActiveYear = yearIdx === l;
            if (hasMonths) {
              const monthCount = item.months!.length;
              for (let mi = 0; mi < monthCount; mi++) {
                let flatIdx = 0;
                for (let yi = 0; yi < yearIdx; yi++) {
                  const prev = TIMELINE_ITEMS[yi];
                  flatIdx += prev.months && prev.months.length > 0 ? prev.months.length : 1;
                }
                flatIdx += mi;
                const isActive = isActiveYear && mi === r;
                A.current[flatIdx]?.classList.toggle("jtc-sticktTimelineTitleActive", isActive);
                C.current[flatIdx]?.classList.toggle("jtc-sticktTimelineDescriptionActive", isActive);
              }
            } else {
              let flatIdx = 0;
              for (let yi = 0; yi < yearIdx; yi++) {
                const prev = TIMELINE_ITEMS[yi];
                flatIdx += prev.months && prev.months.length > 0 ? prev.months.length : 1;
              }
              A.current[flatIdx]?.classList.toggle("jtc-sticktTimelineTitleActive", isActiveYear);
              C.current[flatIdx]?.classList.toggle("jtc-sticktTimelineDescriptionActive", isActiveYear);
            }
          });
        }
      }
    }

    /* === Video layer: 同一个 background sticky 区域 ===
       - Intro p >= 0.89: 视频层淡入, 从当前下标开始播放
       - 之后 3 个视频顺序自动循环 (无滚动断点), 切换由 'ended' 事件驱动 */
    const revealed = p >= VIDEO_REVEAL_AT;
    if (revealed !== videoRevealedRef.current) {
      videoRevealedRef.current = revealed;
      if (revealed) {
        showCycleVideo(videoCycleRef.current);
      } else {
        videoItemRefs.current.forEach((item, i) => {
          if (item) item.style.opacity = "0";
          videoElRefs.current[i]?.pause();
        });
      }
    }
  }, [images.length, rightPhrases, K, showCycleVideo]);

  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      update();
      updateScrollTitles();
      updateHeaderLines();
    });
  }, [update, updateScrollTitles, updateHeaderLines]);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onScroll]);

  /* 视频顺序循环: 每个视频播完 → 切到下一个 (最后一个回到第一个)。
     仅在视频层已 reveal 时推进, 避免未露出时空转。 */
  useEffect(() => {
    const els = videoElRefs.current;
    const handlers = els.map((vid) => {
      if (!vid) return null;
      const onEnded = () => {
        if (!videoRevealedRef.current) return;
        const total = videoElRefs.current.length;
        const next = (videoCycleRef.current + 1) % total;
        videoCycleRef.current = next;
        showCycleVideo(next);
      };
      vid.addEventListener("ended", onEnded);
      return onEnded;
    });
    return () => {
      els.forEach((vid, i) => {
        const h = handlers[i];
        if (vid && h) vid.removeEventListener("ended", h);
      });
    };
  }, [showCycleVideo]);

  /* 首屏图片出来后, 分批预热时间轴视频, 避免滚到视频 reveal 点才开始下载。 */
  useEffect(() => {
    if (!introReady) {
      return;
    }

    const timers = videoElRefs.current.map((vid, index) =>
      window.setTimeout(() => {
        if (!vid) {
          return;
        }
        vid.preload = index === 0 ? "auto" : "metadata";
        vid.load();
      }, 900 + index * 600),
    );

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [introReady]);

  /* ----- helpers ----- */
  function renderScrollTitle(text: string) {
    return text.split("").map((ch, i) => (
      <span key={i} className="jtc-char" style={{ "--progress": 0 } as React.CSSProperties}>{ch}</span>
    ));
  }

  /* ===================== JSX ===================== */
  return (
    <div id="experience" ref={outerRef} className="joby-tl-outer" data-light-section data-intro-ready={introReady ? "true" : "false"}>
      {/* background: sticky, 跨整段（introContent + timelineContent） */}
      <div className="joby-tl-background">
        <div ref={imageSliderRef} className="joby-tl-imageSlider">
          <div className="joby-tl-imageSliderScale">
            {images.map((src, i) => (
              <div
                key={i}
                ref={(el) => { itemRefs.current[i] = el; }}
                className="joby-tl-imageSliderItem"
                data-visible={i === 0 ? "true" : "false"}
                style={i === 0 ? { display: "block", opacity: 1 } : { display: "none", opacity: 0 }}
              >
                <picture>
                  <source
                    type="image/avif"
                    srcSet={src.replace(".webp", ".avif")}
                  />
                  <img
                    src={src}
                    alt=""
                    loading={i < EAGER_FRAME_COUNT ? "eager" : "lazy"}
                    fetchPriority={
                      i === 0 ? "high" : i < EAGER_FRAME_COUNT ? "auto" : "low"
                    }
                    decoding="async"
                  />
                </picture>
              </div>
            ))}
          </div>
        </div>

        <div className="joby-tl-videoLayer">
          {videos.map((src, i) => (
            <div
              key={i}
              ref={(el) => { videoItemRefs.current[i] = el; }}
              className="joby-tl-videoItem"
              style={{ opacity: 0 }}
            >
              <video
                ref={(el) => { videoElRefs.current[i] = el; }}
                src={src}
                muted
                playsInline
                preload={introReady && i === 0 ? "auto" : "metadata"}
              />
            </div>
          ))}
        </div>
      </div>

      {/* introContent */}
      <div ref={introContentRef} className="joby-tl-introContent">
        <div ref={stickyWrapRef} className="joby-tl-stickyWrapper">
          <div className="joby-tl-stickyElement">
            <div className="joby-tl-wrapperIntro">
              <span ref={labelLeftRef} className="joby-tl-introLabelLeft" style={{ opacity: 0, display: "none" }} />
              <span ref={labelRightRef} className="joby-tl-introLabelRight" style={{ opacity: 0, display: "none" }} />
              <div
                ref={titleLeftRef}
                className="joby-tl-titleLeft"
                style={{ "--progress": 0, "--offset": "0px" } as React.CSSProperties}
              >
                <div className="joby-tl-innerTitle">
                  <h2>{titleLeft}</h2>
                </div>
              </div>
              <div
                ref={titleRightRef}
                className="joby-tl-titleRight"
                style={{ "--progress": 0, "--offset": "0px" } as React.CSSProperties}
              >
                <div className="joby-tl-innerTitle">
                  <h2 ref={titleRightTextRef}>{titleRight}</h2>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* timelineContent */}
      <div className="jtc-timelineContent">
        <div className="jtc-fixedIntroHeader" aria-hidden={false}>
          <div className="jtc-introTimelineWrapper">
            <div className="jtc-timelineHeader" ref={I} style={{ "--progress": "0" } as React.CSSProperties}>
              <div className="jtc-headerColumn1">
                <div className="jtc-captionSmall"><span className="jtc-animatedText" data-style-inline="false">{t("问题浮现", "Problem Emerges")}</span></div>
              </div>
              <div className="jtc-headerColumn2 jtc-headerMobileLast">
                <div className="jtc-captionSmall"><span className="jtc-animatedText" data-style-inline="false">{t("洞察成形", "Insight Takes Shape")}</span></div>
              </div>
              <div className="jtc-headerColumn3Intro">
                <div className="jtc-captionSmall" style={{ textAlign: "center" }}><span className="jtc-animatedText" data-style-inline="false">{t("结构生长", "Structure Grows")}</span></div>
              </div>
              <div className="jtc-headerColumnLast jtc-hideMobile">
                <div className="jtc-captionSmall"><span className="jtc-animatedText" data-style-inline="false">{t("体验发生", "Experience Happens")}</span></div>
              </div>
            </div>
          </div>
        </div>
        <section className="jtc-sectionWrapper">
          <div className="jtc-timelineWrapper">

            {/* Intro header spacer: keeps the original handoff scroll distance. */}
            <div
              ref={firstHeaderSpacerRef}
              className="jtc-stickyWrapperJS jtc-stickyWrapper"
              style={{
                "--sticky-height-desktop": "0px",
                "--sticky-height-mobile": "0px",
                "--sticky-offset": "37.5vh",
                "--sticky-offset-mobile": "37.5lvh",
              } as React.CSSProperties}
            />

            {/* timelinePastIntro */}
            <div className="jtc-timelinePastIntro">
              <div className="jtc-timelineTitle jtc-timelineTitle1" ref={firstTitleRef}>
                {NARRATIVES[0].map((item, i) => (
                  <div key={i} className="jtc-titleTimeline">
                    <div className="jtc-scrollAnimatedTitle" data-theme="light" data-use-chars="true" data-use-words="false" style={{ opacity: 0 }}>
                      {renderScrollTitle(t(item.zh, item.en))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="jtc-headerColumnDown jtc-hideDesktop">
                {BODY_TEXTS[0].map((item, i) => (
                  <div key={i} className="jtc-timelineText"><span className="jtc-animatedText" data-style-inline="false">{t(item.zh, item.en)}</span></div>
                ))}
              </div>

              <div className="jtc-timelineHeader" ref={O} style={{ "--progress": "0" } as React.CSSProperties}>
                <div className="jtc-headerColumn1">
                  <span className="jtc-captionSmall"><span className="jtc-animatedText" data-style-inline="false">{t("观察", "Observe")}</span></span>
                </div>
                <div className="jtc-headerColumn2 jtc-headerMobileLast">
                  <span className="jtc-captionSmall"><span className="jtc-animatedText" data-style-inline="false">{t("提问", "Question")}</span></span>
                </div>
                <div className="jtc-headerColumn4_11 jtc-headerMobileBodies jtc-hideMobile">
                  {BODY_TEXTS[0].map((item, i) => (
                    <div key={i} className="jtc-timelineText"><span className="jtc-animatedText" data-style-inline="false">{t(item.zh, item.en)}</span></div>
                  ))}
                </div>
              </div>

              <div className="jtc-timelineTitle jtc-timelineTitle2">
                {NARRATIVES[1].map((item, i) => (
                  <div key={i} className="jtc-titleTimeline">
                    <div className="jtc-scrollAnimatedTitle" data-theme="light" data-use-chars="true" data-use-words="false" style={{ opacity: 0 }}>
                      {renderScrollTitle(t(item.zh, item.en))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="jtc-headerColumnDown jtc-hideDesktop">
                {BODY_TEXTS[1].map((item, i) => (
                  <div key={i} className="jtc-timelineText"><span className="jtc-animatedText" data-style-inline="false">{t(item.zh, item.en)}</span></div>
                ))}
              </div>

              <div className="jtc-timelineHeader jtc-timelineHeaderAuto" ref={H} style={{ "--progress": "0" } as React.CSSProperties}>
                <div className="jtc-headerColumn1">
                  <span className="jtc-captionSmall"><span className="jtc-animatedText" data-style-inline="false">{t("梳理", "Organize")}</span></span>
                </div>
                <div className="jtc-headerColumn2Bodies jtc-headerMobileBodies jtc-hideMobile">
                  {BODY_TEXTS[1].map((item, i) => (
                    <div key={i} className="jtc-timelineText"><span className="jtc-animatedText" data-style-inline="false">{t(item.zh, item.en)}</span></div>
                  ))}
                </div>
                <div className="jtc-headerColumn4_11 jtc-headerMobileLast">
                  <span className="jtc-captionSmall"><span className="jtc-animatedText" data-style-inline="false">{t("结构", "Structure")}</span></span>
                </div>
              </div>

              <div className="jtc-timelineTitle jtc-timelineTitle3">
                {NARRATIVES[2].map((item, i) => (
                  <div key={i} className="jtc-titleTimeline">
                    <div className="jtc-scrollAnimatedTitle" data-theme="light" data-use-chars="true" data-use-words="false" style={{ opacity: 0 }}>
                      {renderScrollTitle(t(item.zh, item.en))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="jtc-timelineHeader jtc-timelineHeader4 jtc-timelineHeaderAuto" ref={G} style={{ "--progress": "0" } as React.CSSProperties}>
                <div className="jtc-headerColumn1">
                  <span className="jtc-captionSmall"><span className="jtc-animatedText" data-style-inline="false">{t("语言", "Language")}</span></span>
                </div>
                <div className="jtc-headerColumn2">
                  <span className="jtc-captionSmall"><span className="jtc-animatedText" data-style-inline="false">{t("节奏", "Rhythm")}</span></span>
                </div>
                <div className="jtc-headerColumn3">
                  <span className="jtc-captionSmall"><span className="jtc-animatedText" data-style-inline="false">{t("反馈", "Feedback")}</span></span>
                </div>
                <div className="jtc-headerColumnLast">
                  <span className="jtc-captionSmall"><span className="jtc-animatedText" data-style-inline="false">{t("结果", "Outcome")}</span></span>
                </div>
              </div>

              {/* Breakthroughs sticky */}
              <div
                className="jtc-stickyWrapperCSS jtc-timelineSticky"
                ref={W}
                style={{
                  "--sticky-height-desktop": "300lvh",
                  "--sticky-height-mobile": "280lvh",
                  "--sticky-height-tablet": "300lvh",
                  "--sticky-offset": "50vh",
                  "--sticky-offset-mobile": "50lvh",
                } as React.CSSProperties}
              >
                <div className="jtc-stickyElementCSS jtc-stickyTopCSS">
                  <div className="jtc-timelineHeader jtc-timelineHeader5">
                    <div className="jtc-headerColumn1">
                      <span className="jtc-captionSmall"><span className="jtc-animatedText" data-style-inline="false">{t("个人经历", "Experience")}</span></span>
                    </div>

                    <div className="jtc-headerColumnYears">
                      {TIMELINE_ITEMS.map((item, i) => (
                        <h6
                          key={item.year}
                          ref={(el) => { L.current[i] = el; }}
                          className={`jtc-subheading2 jtc-yearItem${i === 0 ? " jtc-yearItemActive" : ""}`}
                          style={{ "--translateItem": 0, "--topTranslate": 0 } as React.CSSProperties}
                        >
                          <span className="jtc-animatedText" data-style-inline="false">{item.year}</span>
                        </h6>
                      ))}
                    </div>

                    <div className="jtc-headerColumnMonths">
                      {TIMELINE_ITEMS.map((item, yi) => (
                        <div
                          key={yi}
                          ref={(el) => { J.current[yi] = el; }}
                          className={`jtc-monthsGroup${yi === 0 ? " jtc-monthsGroupActive" : ""}`}
                        >
                          {(item.months || []).map((m, mi) => (
                            <span
                              key={`${yi}-${mi}`}
                              ref={(el) => {
                                if (!Q.current[yi]) Q.current[yi] = [];
                                Q.current[yi][mi] = el;
                              }}
                              className="jtc-captionSmall jtc-monthItem"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="jtc-headerColumn3 jtc-row1">
                      {flatItems.map((item, i) => (
                        <p
                          key={i}
                          ref={(el) => { A.current[i] = el; }}
                          className={`jtc-body2 jtc-sticktTimelineTitle${i === 0 ? " jtc-sticktTimelineTitleActive" : ""}`}
                        >
                          {i === 0
                            ? <span className="jtc-animatedText" data-style-inline="false">{t(item.title.zh, item.title.en)}</span>
                            : t(item.title.zh, item.title.en)}
                        </p>
                      ))}
                    </div>

                    <div className="jtc-headerColumn4 jtc-row1 jtc-headerTimelineDesc">
                      {flatItems.map((item, i) => (
                        <p
                          key={i}
                          ref={(el) => { C.current[i] = el; }}
                          className={`jtc-body2 jtc-sticktTimelineDescription${i === 0 ? " jtc-sticktTimelineDescriptionActive" : ""}`}
                        >
                          {renderTimelineDesc(t(item.description.zh, item.description.en), i === 0)}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
