"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useT } from "@/lib/i18n";

/* ============================================================
 * AI 作品画廊: 1:1 复刻 sohub.digital/work/1up-nova
 *
 * 原站结构 / CSS / 动画 (均扒自其线上代码):
 *   .gallery-wrap{display:flex;justify-content:center;align-items:center;
 *                 width:100%;height:100vh;position:relative;overflow:hidden}
 *   .gallery{flex:none;width:100%;height:100%;position:relative}
 *   .gallery--breakout{width:min-content}
 *   .gallery--grid{display:grid;grid-template-rows:repeat(3,auto);
 *                  grid-template-columns:repeat(3,auto);gap:1vw;height:auto}
 *   .gallery--grid .gallery__item{width:31vw;height:31vh}
 *   .gallery__item{border-radius:16px;flex:none;background-size:cover;
 *                  background-position:50%;position:relative}
 *
 *   GSAP: tl({scrollTrigger:{trigger,start:"center center",end:"+=100%",
 *              scrub:1,pin:true,pinSpacing:false}})
 *        .to(grid,{gap:"8vw"},0)
 *        .to(items,{width:"100vw",height:"100vh",borderRadius:0},0)
 *
 * 占位图位于 public/ai-gallery/g1..g9.svg, 替换正式图改 GALLERY_IMAGES 即可。
 * ============================================================ */

const GALLERY_IMAGES = [
  "/ai-gallery/g1.webp",
  "/ai-gallery/g2.webp",
  "/ai-gallery/g3.webp",
  "/ai-gallery/g4.webp",
  "/ai-gallery/g5.webp",
  "/ai-gallery/g6.webp",
  "/ai-gallery/g7.webp",
  "/ai-gallery/g8.webp",
  "/ai-gallery/g9.webp",
];

// 画廊放大段之后, 纵向一张接一张的全宽长图 (各自原比例, 不裁切)。
// 跳过 w14。
const WORK_IMAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15].map(
  (n) => `/ai-gallery/work/w${n}.webp`
);

const SANS = "var(--font-sans)";

export default function AiGallerySection() {
  const t = useT();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLParagraphElement | null>(null);
  const [headerIn, setHeaderIn] = useState(false);

  useEffect(() => {
    const h = headerRef.current;
    if (!h) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setHeaderIn(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(h);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const wrap = wrapRef.current;
    if (!wrap) return;

    const grid = wrap.querySelector<HTMLElement>(".gallery--grid");
    const items = wrap.querySelectorAll<HTMLElement>(".gallery__item");
    if (!grid || items.length === 0) return;

    const tl = gsap.timeline({
      onComplete: () => ScrollTrigger.refresh(),
      scrollTrigger: {
        trigger: wrap,
        start: "center center",
        end: "+=100%",
        id: "ai-gallery",
        scrub: 1,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.to(grid, { gap: "8vw" }, 0);
    tl.to(items, { width: "100vw", height: "100vh", borderRadius: 0 }, 0);

    return () => {
      tl.scrollTrigger?.kill();
      tl.revert();
      tl.kill();
    };
  }, []);

  return (
    <section id="past-work" data-light-section={false} style={{ backgroundColor: "#000", fontFamily: SANS }}>
      {/* 标题区 (Figma node 2231:49151): 年份小字 + 居中大标题 */}
      <div
        ref={headerRef}
        style={{
          padding: "clamp(64px, 14vh, 160px) clamp(24px, 4vw, 64px) clamp(40px, 7vh, 96px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "clamp(24px, 3vh, 40px)",
          textAlign: "center",
          opacity: headerIn ? 1 : 0,
          transform: `translateY(${headerIn ? 0 : 24}px)`,
          transition:
            "opacity 800ms cubic-bezier(0.22,1,0.36,1), transform 800ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* 主标题: 使用 Figma 设计稿导出的描边字 SVG (過往 / 設計作品 / 收錄) */}
        <div
          role="heading"
          aria-level={2}
          aria-label="過往 設計作品 收錄"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(16px, 3.2vw, 40px)",
            width: "100%",
            maxWidth: 1245,
            height: "clamp(64px, 10vw, 145px)",
          }}
        >
          <img src="/ai-gallery/title-1.svg" alt="" aria-hidden="true" draggable={false}
               style={{ height: "97%", width: "auto", display: "block" }} />
          <img src="/ai-gallery/title-2.svg" alt="" aria-hidden="true" draggable={false}
               style={{ height: "98.3%", width: "auto", display: "block" }} />
          <img src="/ai-gallery/title-3.svg" alt="" aria-hidden="true" draggable={false}
               style={{ height: "100%", width: "auto", display: "block" }} />
        </div>
      </div>

      {/* 画廊: 原站结构 .gallery-wrap > .gallery--grid > .gallery__item (背景图) */}
      <section className="ai-gallery">
        <div ref={wrapRef} className="gallery-wrap gallery-wrap--large">
          <div className="gallery gallery--grid gallery--breakout" id="ai-gallery-grid">
            {GALLERY_IMAGES.map((src) => (
              <div
                key={src}
                className="gallery__item"
                style={{ backgroundImage: `url("${src}")` }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 作品长图: 全宽 (左右各 40px 页边距), 各自原比例, 一张接一张纵向排列 */}
      <div className="work-stack">
        {WORK_IMAGES.map((src) => (
          <img key={src} src={src} alt="" aria-hidden="true" draggable={false} className="work-img" />
        ))}
      </div>

      <style jsx>{`
        .ai-gallery {
          width: 100vw;
        }
        .work-stack {
          display: block;
          font-size: 0;
        }
        .work-stack :global(.work-img) {
          display: block;
          width: 100%;
          height: auto;
          margin: 0;
        }
        .gallery-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100vh;
          position: relative;
          overflow: hidden;
        }
        .gallery-wrap--large {
          height: 100vh;
        }
        .gallery {
          flex: none;
          width: 100%;
          height: 100%;
          position: relative;
        }
        .gallery--breakout {
          width: min-content;
        }
        .gallery--grid {
          display: grid;
          grid-template-rows: repeat(3, auto);
          grid-template-columns: repeat(3, auto);
          gap: 1vw;
          height: auto;
        }
        .gallery--grid :global(.gallery__item) {
          width: 31vw;
          height: 31vh;
        }
        .gallery :global(.gallery__item) {
          border-radius: 16px;
          flex: none;
          background-size: cover;
          background-position: 50%;
          background-color: #15131a;
          position: relative;
        }
      `}</style>
    </section>
  );
}
