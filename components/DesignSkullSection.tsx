"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* ============================================================
 * "DESIGN" 石刻字 + 中央骷髅头盔 视觉装置 (Figma 节点 334:49209).
 * 动画参考 roiheads.com 首屏: 每个石头/字母为独立图层, 随页面滚动
 * 按各自的位移 + 旋转做「分层视差」(element-parallax / data-scrub),
 * 不同图层 scrub 不同, 形成错落的纵深漂移。
 *   - 黑底, 每个字母 / 碎石 / 骷髅都是独立图层, 各自带初始旋转与定位;
 *   - 按 1512×850 设计稿坐标绝对定位, 整体等比缩放铺满宽度;
 *   - 滚动驱动: 进入时各层从偏移位汇聚, 滚出时继续向外漂散 (scrub 平滑)。
 * 图片: public/figma/design-skull/*.webp (Figma 导出转 webp)。
 * ============================================================ */

const BASE = "/figma/design-skull";

// 设计稿画布: 内容横跨 x[-45,1548]、y[39,787]; 取 1512×850 为基准帧。
const FRAME_W = 1512;
const FRAME_H = 850;

type Layer = {
  src: string;
  alt: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number; // 设计稿中的静态旋转 (作为运动中点)
  imgStyle: CSSProperties;
  // roiheads 风格视差参数 (单位: 设计稿 px, 进度 0=滚入 1=滚出)
  moveX: number; // 整段滚动内 x 方向漂移总量
  moveY: number; // y 方向漂移总量
  rotateDelta: number; // 滚动中额外旋转量 (deg)
  scrub: number; // 视差强度系数 (越大漂得越多, 模拟 data-scrub 分层)
};

const COVER: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  pointerEvents: "none",
};

// 字母图层 (D E S I G N) —— 参考 roiheads home-good_letter 的 move/rotate
const LAYERS: Layer[] = [
  {
    src: `${BASE}/aso-a.webp`,
    alt: "D",
    left: -45,
    top: 332,
    width: 290,
    height: 320,
    rotate: 0,
    imgStyle: { position: "absolute", height: "129.38%", left: "-21.38%", top: "-14.69%", width: "142.76%", maxWidth: "none", pointerEvents: "none" },
    moveX: -120,
    moveY: -70,
    rotateDelta: -10,
    scrub: 1,
  },
  {
    src: `${BASE}/seo-e.webp`,
    alt: "E",
    left: 142,
    top: 202,
    width: 250,
    height: 396,
    rotate: 0,
    imgStyle: { position: "absolute", height: "111.11%", left: "-38%", top: "-5.56%", width: "176%", maxWidth: "none", pointerEvents: "none" },
    moveX: -70,
    moveY: -110,
    rotateDelta: -6,
    scrub: 1.3,
  },
  {
    src: `${BASE}/seo-s.webp`,
    alt: "S",
    left: 244.76,
    top: 311.59,
    width: 345.553,
    height: 363.884,
    rotate: -16.96,
    imgStyle: { position: "absolute", height: "131.5%", left: "-22.45%", top: "-15.75%", width: "144.91%", maxWidth: "none", pointerEvents: "none" },
    moveX: -40,
    moveY: -150,
    rotateDelta: -14,
    scrub: 1.6,
  },
  {
    src: `${BASE}/uac-u.webp`,
    alt: "I",
    left: 872,
    top: 228,
    width: 224,
    height: 344,
    rotate: 0,
    imgStyle: { position: "absolute", height: "119.19%", left: "-41.52%", top: "-9.59%", width: "183.04%", maxWidth: "none", pointerEvents: "none" },
    moveX: 60,
    moveY: -120,
    rotateDelta: 6,
    scrub: 1.4,
  },
  {
    src: `${BASE}/uac-a.webp`,
    alt: "G",
    left: 989.54,
    top: 309.61,
    width: 344.861,
    height: 380.716,
    rotate: 11.24,
    imgStyle: { position: "absolute", height: "128.83%", left: "-24.7%", top: "-14.41%", width: "149.4%", maxWidth: "none", pointerEvents: "none" },
    moveX: 90,
    moveY: -150,
    rotateDelta: 12,
    scrub: 1.6,
  },
  {
    src: `${BASE}/uac-c.webp`,
    alt: "N",
    left: 1190.48,
    top: 372.66,
    width: 357.613,
    height: 363.764,
    rotate: -15.32,
    imgStyle: { position: "absolute", height: "142.39%", left: "-27.95%", top: "-20.99%", width: "146.71%", maxWidth: "none", pointerEvents: "none" },
    moveX: 130,
    moveY: -90,
    rotateDelta: -10,
    scrub: 1.2,
  },
  // 碎石: 各自 scrub 更大, 漂移更明显 (参考 roiheads home-roiheads_stone)
  {
    src: `${BASE}/l-rock-2.webp`,
    alt: "",
    left: 1088,
    top: 249,
    width: 40,
    height: 27,
    rotate: 0,
    imgStyle: COVER,
    moveX: 40,
    moveY: -180,
    rotateDelta: 40,
    scrub: 2.4,
  },
  {
    src: `${BASE}/l-rock-5.webp`,
    alt: "",
    left: 1348,
    top: 319,
    width: 56.856,
    height: 48.739,
    rotate: 15.42,
    imgStyle: COVER,
    moveX: 90,
    moveY: -150,
    rotateDelta: 55,
    scrub: 2.6,
  },
  {
    src: `${BASE}/r-rock-3.webp`,
    alt: "",
    left: 487,
    top: 319,
    width: 77.834,
    height: 64.576,
    rotate: 17.05,
    imgStyle: COVER,
    moveX: -90,
    moveY: -160,
    rotateDelta: -45,
    scrub: 2.5,
  },
  {
    src: `${BASE}/r-rock-1.webp`,
    alt: "",
    left: 1108,
    top: 649,
    width: 80.556,
    height: 74.194,
    rotate: 15.08,
    imgStyle: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", maxWidth: "none", pointerEvents: "none" },
    moveX: 70,
    moveY: 140,
    rotateDelta: 50,
    scrub: 2.5,
  },
  {
    src: `${BASE}/l-rock-1.webp`,
    alt: "",
    left: 21,
    top: 673,
    width: 52,
    height: 52,
    rotate: 180,
    imgStyle: COVER,
    moveX: -60,
    moveY: 130,
    rotateDelta: -40,
    scrub: 2.3,
  },
];

// 中央骷髅头盔 —— 主体, 漂移最小 (在最前层, 视觉锚点)
const SKULL: Layer = {
  src: `${BASE}/helmet-skull.webp`,
  alt: "",
  left: 472,
  top: 39,
  width: 535.31,
  height: 748.469,
  rotate: 2.77,
  imgStyle: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "bottom", pointerEvents: "none" },
  moveX: 0,
  moveY: -40,
  rotateDelta: 2,
  scrub: 0.6,
};

export default function DesignSkullSection({
  id = "design-skull",
}: {
  id?: string;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  // 等比缩放: 让 1512 宽的帧铺满容器宽度
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / FRAME_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 滚动驱动的分层视差 (参考 roiheads element-parallax / data-scrub)
  useEffect(() => {
    const section = sectionRef.current;
    const frame = frameRef.current;
    if (!section || !frame) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const items = Array.from(
        frame.querySelectorAll<HTMLElement>("[data-skull-layer]")
      );

      items.forEach((el) => {
        const moveX = parseFloat(el.dataset.mx || "0");
        const moveY = parseFloat(el.dataset.my || "0");
        const rotDelta = parseFloat(el.dataset.rd || "0");
        const baseRot = parseFloat(el.dataset.rot || "0");

        // 进入时位于「汇聚前」的偏移位 (反方向一半), 滚出时漂到正方向,
        // 经过模块中段时回到设计稿原位附近 —— 形成穿过感。
        gsap.fromTo(
          el,
          {
            x: -moveX,
            y: -moveY,
            rotation: baseRot - rotDelta,
          },
          {
            x: moveX,
            y: moveY,
            rotation: baseRot + rotDelta,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: parseFloat(el.dataset.scrub || "1.5"),
            },
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  // 向上离场时给「底部」两角加圆角: 这条底边正是上浮露出下层 footer 的边缘,
  // 圆角缺口处露出绿色 (容器底色), 形成卡片上浮、footer 在下被揭示的收束感。
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        section,
        { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
        {
          borderBottomLeftRadius: 160,
          borderBottomRightRadius: 160,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const allLayers = [...LAYERS, SKULL];

  return (
    <section
      ref={sectionRef}
      id={id}
      data-light-section={false}
      style={{
        backgroundColor: "#000000",
        width: "100%",
        position: "relative",
        zIndex: 1,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: "clamp(40px, 8vh, 120px) 0",
      }}
    >
      <div ref={stageRef} style={{ width: "100%", position: "relative" }}>
        {/* 缩放帧: 内部按 1512×850 设计坐标绝对定位 */}
        <div
          ref={frameRef}
          style={{
            position: "relative",
            width: FRAME_W,
            height: FRAME_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            marginBottom: FRAME_H * (scale - 1),
          }}
        >
          {allLayers.map((layer, i) => (
            <div
              key={`${layer.src}-${i}`}
              data-skull-layer=""
              data-mx={layer.moveX}
              data-my={layer.moveY}
              data-rd={layer.rotateDelta}
              data-rot={layer.rotate}
              data-scrub={layer.scrub}
              aria-hidden={layer.alt === ""}
              style={{
                position: "absolute",
                left: layer.left,
                top: layer.top,
                width: layer.width,
                height: layer.height,
                willChange: "transform",
              }}
            >
              <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={layer.src}
                  alt={layer.alt}
                  draggable={false}
                  loading="lazy"
                  style={layer.imgStyle}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
