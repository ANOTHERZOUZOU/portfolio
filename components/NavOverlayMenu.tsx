"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLang, useT } from "@/lib/i18n";
import ContactCard from "./ContactCard";

export type NavMenuItem = {
  label: string;
  index: string;
  href: string;
};

export type NavConnectLink = {
  label: string;
  href: string;
};

type NavSectionEntry = {
  index: number;
  name: string;
  href: string;
  top: number;
  height: number;
};

const MENU_GREEN = "#C7FC07";
// 底部基底色: 与首页首屏奶黄色 (#f5f4df) 保持一致
const MENU_BASE = "#f5f4df";

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_CONNECT_LINKS: NavConnectLink[] = [
  { label: "E-mail: anotherzouzou@gmail.com", href: "mailto:anotherzouzou@gmail.com" },
];

const refreshScrollTriggersAfterNavigation = () => {
  [0, 120, 450, 900].forEach((delay) => {
    window.setTimeout(() => ScrollTrigger.refresh(), delay);
  });
};

const getHashTarget = (href: string) => {
  if (!href.startsWith("#")) return null;
  return document.getElementById(decodeURIComponent(href.slice(1)));
};

const getSectionName = (href: string) =>
  href.startsWith("#") ? decodeURIComponent(href.slice(1)) : href;

const measureSections = (items: NavMenuItem[]) =>
  items
    .map((item, index): NavSectionEntry | null => {
      const el = getHashTarget(item.href);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        index,
        name: getSectionName(item.href),
        href: item.href,
        top: rect.top + window.scrollY,
        height: rect.height,
      };
    })
    .filter((entry): entry is NavSectionEntry => entry !== null)
    .sort((a, b) => a.top - b.top);

const getCurrentSectionIndex = (sections: NavSectionEntry[]) => {
  const y = window.scrollY + window.innerHeight * 0.35;
  let currentIndex = sections[0]?.index ?? null;

  for (const section of sections) {
    if (section.top <= y) currentIndex = section.index;
  }

  return currentIndex;
};

const scrollToSection = (
  index: number,
  sections: NavSectionEntry[],
  immediate = false
) => {
  const section = sections.find((entry) => entry.index === index);
  if (!section) return;

  let top = section.top + 10;

  // 被 ScrollTrigger pin 固定的模块 (如 #events): rect.top 落在 pin 占位
  // 区间内, 直接用会跳过模块开头。改用该模块 pinned trigger 的 start 作为
  // 真正的滚动目标 (即模块顶部贴齐视口顶部的那个滚动位置)。
  const targetEl = document.getElementById(section.name);
  if (targetEl) {
    const pinned = ScrollTrigger.getAll().find(
      (st) => st.pin === targetEl && st.vars.pin === true
    );
    if (pinned) top = pinned.start;
  }

  const lenis = window.__portfolioLenis;
  const finish = () => refreshScrollTriggersAfterNavigation();

  window.history.replaceState(null, "", section.href);

  if (lenis) {
    lenis.scrollTo(top, {
      duration: immediate ? 0 : 0.9,
      immediate,
      force: true,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      onComplete: finish,
    });
  } else {
    window.scrollTo({
      top,
      behavior: immediate ? "instant" : "smooth",
    });
    finish();
  }

  const target = document.getElementById(section.name);
  if (target) {
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }
};

// 全屏下拉导航 overlay. 绿色面板来自 Figma node 1806:27777:
// 顶部绿色区域下拉展开, 下方保留黑底, 内容按 1440 设计稿坐标放置.
export function NavOverlayMenu({
  open,
  onClose,
  items,
  connectLinks = [],
}: {
  open: boolean;
  onClose: () => void;
  items: NavMenuItem[];
  connectLinks?: NavConnectLink[];
}) {
  const t = useT();
  const { lang, setLang } = useLang();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [shouldRender, setShouldRender] = useState(open);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const sectionsRef = useRef<NavSectionEntry[]>([]);

  const updateSections = useCallback(() => {
    sectionsRef.current = measureSections(items);
  }, [items]);

  const finishClose = useCallback(() => {
    setShouldRender(false);
  }, []);

  // 用 ref 持有最新回调, 让 GSAP 时间轴 / 键盘监听只依赖 shouldRender,
  // 避免父组件每次重渲染 (items/onClose 引用变化) 时重建时间轴, 否则
  // 关闭时播放头被拨回 0, reverse 无法触发 onReverseComplete -> 遮罩卡死白屏.
  const finishCloseRef = useRef(finishClose);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    finishCloseRef.current = finishClose;
    onCloseRef.current = onClose;
  }, [finishClose, onClose]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setShouldRender(true), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    let resizeTimer: number | null = null;
    let raf = 0;

    const updateActiveFromScroll = () => {
      raf = 0;
      updateSections();
      const nextIndex = getCurrentSectionIndex(sectionsRef.current);
      setActiveIndex(nextIndex);
    };

    const scheduleActiveUpdate = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(updateActiveFromScroll);
    };

    const scheduleMeasure = () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(scheduleActiveUpdate, 100);
    };

    updateActiveFromScroll();

    const observer = new ResizeObserver(scheduleMeasure);
    const main = document.querySelector("main");
    if (main) observer.observe(main);
    window.addEventListener("scroll", scheduleActiveUpdate, { passive: true });
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleActiveUpdate);
      window.removeEventListener("resize", scheduleMeasure);
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [updateSections]);

  useEffect(() => {
    if (!shouldRender) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    const prevOverflow = document.body.style.overflow;
    const lenis = window.__portfolioLenis;
    lenis?.stop();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender || !rootRef.current) return;

    const ctx = gsap.context(() => {
      const root = rootRef.current;
      if (!root) return;

      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.out" },
        onReverseComplete: () => finishCloseRef.current(),
      });

      gsap.set(root, { autoAlpha: 1 });
      gsap.set(".nav-panel-base", {
        clipPath: "inset(0% 0% 100% 0%)",
      });
      gsap.set(".nav-panel-strip", {
        y: (_index, target) => {
          const el = target as HTMLElement;
          return -(el.offsetTop + el.offsetHeight);
        },
      });
      gsap.set(".nav-reveal", { autoAlpha: 0, y: 18 });
      gsap.set(".nav-item", { autoAlpha: 0, y: 16 });

      tl.to(".nav-panel-strip", {
        y: 0,
        duration: 0.72,
        stagger: 0.045,
      })
        .to(
          ".nav-panel-base",
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.28,
          },
          0.48
        )
        .to(
          ".nav-reveal",
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.52,
            stagger: 0.06,
          },
          0.42
        )
        .to(
          ".nav-item",
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.48,
            stagger: 0.045,
          },
          0.48
        );

      timelineRef.current = tl;
      tl.play(0);
    }, rootRef);

    return () => {
      ctx.revert();
      timelineRef.current = null;
    };
  }, [shouldRender]);

  useEffect(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    if (open) {
      tl.play();
    } else if (shouldRender) {
      tl.reverse();
    }
  }, [open, shouldRender]);

  useEffect(() => {
    if (!open) return;
    updateSections();
    const nextIndex = getCurrentSectionIndex(sectionsRef.current);
    const timer = window.setTimeout(() => {
      setActiveIndex(nextIndex);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [items, open, updateSections]);


  const displayConnectLinks =
    connectLinks.length > 0 ? connectLinks : DEFAULT_CONNECT_LINKS;

  const handleNavigate = (index: number) => {
    setActiveIndex(index);

    // 立即解锁滚动并启动滚动, 与菜单收起动画并行进行,
    // 这样下拉动画结束时页面已经滚动到目标模块。
    const lenis = window.__portfolioLenis;
    document.body.style.overflow = "";
    lenis?.start();

    // 先刷新 ScrollTrigger, 让被 pin 的模块 (如 #events) 的 pin-spacer
    // 布局结算后再测量, 否则测到的 top 会被 pin 占位推偏, 定位不准。
    ScrollTrigger.refresh();
    updateSections();
    scrollToSection(index, sectionsRef.current);

    onClose();
  };

  return (
    <>
      {shouldRender ? (
        <div
          ref={rootRef}
          id="navigation-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t("导航菜单", "Navigation menu")}
          className="nav-overlay-root invisible fixed inset-0 z-[100] overflow-hidden"
          style={{ backgroundColor: MENU_BASE, color: "#000" }}
          onClick={onClose}
        >
          {/* 绿色面板: 横向色块一条条从上往下落, 仿 Joby opening panels */}
          <div className="absolute left-0 right-0 top-0 h-[456px] overflow-hidden">
            {[
              { top: 0, height: 82, color: MENU_GREEN },
              { top: 82, height: 114, color: MENU_GREEN },
              { top: 196, height: 118, color: MENU_GREEN },
              { top: 314, height: 114, color: MENU_GREEN },
              { top: 428, height: 28, color: MENU_GREEN },
            ].map((panel) => (
              <div
                key={`${panel.top}-${panel.height}`}
                className="nav-panel-strip absolute left-0 w-full"
                style={{
                  top: panel.top,
                  height: panel.height,
                  backgroundColor: panel.color,
                  transformOrigin: "top",
                }}
              />
            ))}
            <div
              className="nav-panel-base absolute inset-0"
              style={{ backgroundColor: MENU_GREEN }}
            />
          </div>

          <div className="pointer-events-none relative z-10 h-full">
            {/* 顶部栏: 与站内 TopNavigation 保持一致 */}
            <div
              className="nav-reveal pointer-events-auto absolute left-0 right-0 top-0 flex items-center justify-between px-10 pt-10"
            >
              <button
                type="button"
                onClick={onClose}
                className="flex w-fit cursor-pointer items-center bg-transparent p-0 text-black transition-opacity hover:opacity-60"
                style={{
                  fontFamily: "var(--font-sans)",
                  border: 0,
                  gap: 4,
                }}
              >
                <img
                  src="/figma/nav-overlay/nav-logo.svg"
                  alt="ANOTHERZOUZOU"
                  className="block h-5 w-10 shrink-0"
                  draggable={false}
                />
                <span
                  aria-hidden="true"
                  style={{
                    width: 1,
                    height: 5,
                    backgroundColor: "rgba(0,0,0,0.4)",
                    display: "block",
                  }}
                />
                <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.8 }}>
                  Design Portfolio
                </span>
              </button>
              <div
                className="flex items-center"
                style={{
                  gap: 8,
                  fontFamily: "var(--font-sans)",
                  color: "#000",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLang("zh"); }}
                  aria-pressed={lang === "zh"}
                  className="cursor-pointer bg-transparent p-0"
                  style={{ border: 0, fontSize: 14, fontWeight: lang === "zh" ? 700 : 400, opacity: lang === "zh" ? 1 : 0.6, color: "#000" }}
                >
                  中
                </button>
                <span
                  aria-hidden="true"
                  style={{
                    width: 1,
                    height: 8,
                    backgroundColor: "#949494",
                    display: "block",
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLang("en"); }}
                  aria-pressed={lang === "en"}
                  className="cursor-pointer bg-transparent p-0"
                  style={{ border: 0, fontSize: 14, fontWeight: lang === "en" ? 700 : 400, opacity: lang === "en" ? 1 : 0.6, color: "#000" }}
                >
                  EN
                </button>
              </div>
            </div>

            {/* 左侧目录 */}
            <nav className="pointer-events-auto absolute left-10 top-[120px] w-[130px]">
              <ul
                className={[
                  "flex flex-col s4-nav-light",
                  activeIndex !== null ? "s4-nav-has-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  gap: 4,
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  fontSize: 14,
                  lineHeight: "normal",
                }}
              >
                {items.map((item, i) => (
                  <li
                    key={item.href}
                    className="nav-item w-full"
                  >
                    <a
                      href={item.href}
                      className={`s4-link${activeIndex === i ? " is-active" : ""}`}
                      style={{
                        paddingBlock: 0,
                        fontFamily: "var(--font-sans)",
                        fontWeight: 400,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigate(i);
                      }}
                    >
                      <span className="s4-label">{item.label}</span>
                      <span className="s4-leader" aria-hidden="true" />
                      <span className="s4-index">{item.index}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* 左下联系方式 */}
            <div
              className="nav-reveal pointer-events-auto absolute left-10 top-[370px] flex flex-col text-black"
              style={{ gap: 4, fontFamily: "var(--font-sans)" }}
            >
              <div className="flex items-center" style={{ gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>TEL:</span>
                <a
                  href="tel:+8618842701237"
                  className="text-black transition-opacity hover:opacity-60"
                  style={{ fontSize: 14, fontWeight: 500 }}
                >
                  188&nbsp;&nbsp;4270&nbsp;&nbsp;1237
                </a>
              </div>
              {displayConnectLinks.map((link) => (
                <div key={link.href} className="flex items-center" style={{ gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>E-mail:</span>
                  <a
                    href={link.href}
                    className="text-black transition-opacity hover:opacity-60"
                    style={{ fontSize: 14, fontWeight: 500 }}
                  >
                    anotherzouzou@gmail.com
                  </a>
                </div>
              ))}
            </div>

            {/* 右下联系卡片 (与 footer 共用同款黑卡: 头像 + 二维码 + 漂浮石头) */}
            <ContactCard
              className="nav-reveal pointer-events-auto"
              style={{ position: "absolute", right: 40, top: 322 }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
