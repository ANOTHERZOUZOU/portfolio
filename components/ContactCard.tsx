"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useT } from "@/lib/i18n";

/* ============================================================
 * 联系卡片 (Figma 1934:23955) —— 菜单栏 (NavOverlayMenu) 与站点
 * footer (SiteFooter) 共用。黑色不规则圆角卡片:
 *   [头像照片] + "Like? / Contact me" + 微信二维码
 * 卡片四周散落 5 颗漂浮石头作装饰 (Figma 石头01~05)。
 * 点击卡片复制微信号 anotherzouzou; 无 hover 态。
 * 几何 / 圆角 / 字号全部按 1440 设计稿 1:1 还原。
 * ============================================================ */

const WECHAT = "anotherzouzou";
const AVATAR = "/figma/footer/avatar.png";
const QR = "/wechat/Frame 2147226088.svg";

// 石头相对「卡片左上角」(卡片 302×94) 的摆位, 取自 Figma 节点 1934:23993~23997
// 漂浮参数沿用旧 Hero (HomeExperience.hero-legacy) 的 RockSpec 模型: X/Y/旋转
// 三条独立周期 (X 周期 = floatDur×1.35, Y 周期 = floatDur, 旋转 = driftDur),
// 配合非对称四点关键帧, 三者错频叠加出李萨如式无重力漂移 — 轨迹自然不重复、
// 每颗各异。直接套用旧 Hero 那 5 颗石头的浮动数值。
type Rock = {
  src: string;
  w: number;
  h: number;
  left: number;
  top: number;
  rotate: number;
  flipY?: boolean;
  /** 横向漂移幅度 (px) */
  floatX: number;
  /** 纵向漂移幅度 (px) */
  floatY: number;
  /** 基础漂移周期 (s); X 周期会再 ×1.35 */
  floatDur: number;
  /** 旋转摆幅 (deg) */
  tilt: number;
  /** 旋转独立周期 (s) */
  driftDur: number;
  /** 相位偏移 (s), 让各石头节奏错开 */
  floatPhase: number;
};

const ROCKS: Rock[] = [
  { src: "/figma/footer/rock-03.png", w: 17.6, h: 12.3, left: -12, top: -21, rotate: 45.65, floatX: 14, floatY: 18, floatDur: 18, tilt: 11, driftDur: 21, floatPhase: 6.2 },
  { src: "/figma/footer/rock-02.png", w: 38.1, h: 33, left: -20, top: 71, rotate: 13.57, floatX: 8, floatY: 12, floatDur: 22, tilt: 7, driftDur: 28, floatPhase: 3.4 },
  { src: "/figma/footer/rock-05.png", w: 11, h: 8, left: 203, top: -41, rotate: 0, floatX: 18, floatY: 14, floatDur: 12, tilt: 18, driftDur: 16, floatPhase: 4.5 },
  { src: "/figma/footer/rock-01.png", w: 32.3, h: 24.6, left: 123, top: -36, rotate: 10, floatX: 12, floatY: 16, floatDur: 17, tilt: 9, driftDur: 23, floatPhase: 0 },
  { src: "/figma/footer/rock-04.png", w: 20, h: 20, left: 253, top: 101, rotate: -174.91, flipY: true, floatX: 16, floatY: 22, floatDur: 14, tilt: 6, driftDur: 26, floatPhase: 1.8 },
];

export default function ContactCard({
  showRocks = true,
  className,
  style,
}: {
  /** 是否显示四周漂浮石头, 默认显示 */
  showRocks?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // 点击复制微信号到剪贴板, 短暂切到「已复制」态
  const copyWechat = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(WECHAT);
      } else {
        const ta = document.createElement("textarea");
        ta.value = WECHAT;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // 复制失败静默处理
    }
  };

  return (
    <button
      type="button"
      onClick={copyWechat}
      aria-label={t("点击复制微信号 anotherzouzou", "Click to copy WeChat ID anotherzouzou")}
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        padding: 0,
        border: 0,
        background: "transparent",
        textAlign: "left",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      {/* 黑色卡片 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: 12,
          backgroundColor: "#000000",
          borderRadius: "24px 16px 16px 2px",
          width: "fit-content",
        }}
      >
        {/* 左: 头像 + 文案 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 70,
              height: 70,
              flexShrink: 0,
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: "#000000",
            }}
          >
            <img
              src={AVATAR}
              alt={t("作者头像", "Portrait")}
              draggable={false}
              style={{ display: "block", width: 70, height: 70, objectFit: "cover" }}
            />
          </div>
          <span
            style={{
              width: 98,
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 16,
              lineHeight: "normal",
              color: "#ffffff",
            }}
          >
            {copied ? (
              "WeChat ID copied"
            ) : (
              <>
                Like?
                <br />
                Contact me
              </>
            )}
          </span>
        </div>

        {/* 右: 微信二维码 */}
        <div
          style={{
            width: 70,
            height: 70,
            flexShrink: 0,
            borderRadius: 8,
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={QR}
            alt={t("微信二维码", "WeChat QR code")}
            draggable={false}
            style={{ display: "block", width: 60, height: 62, objectFit: "contain" }}
          />
        </div>
      </div>

      {/* 漂浮石头 (装饰, 不拦事件) — 渲染在卡片之后且 zIndex 更高, 浮在名片上面。
          外层 wrapper 做太空漂浮 (位移 + 摆动) 动画, 内层 img 保持 base rotate/flip,
          两层 transform 解耦, 互不干扰。 */}
      {showRocks && (
        <>
          <style
            dangerouslySetInnerHTML={{
              __html: `
/* 复刻旧 Hero (hero-legacy) 的「李萨如无重力漂移」: 把 X / Y / 旋转拆成三层
   嵌套, 各自独立 keyframes + 独立周期 (X×1.35 / Y×1 / 旋转 driftDur), 三条
   不同频率叠加 → 轨迹连续、自然、永不重复, 且每颗石头幅度/周期/相位各异。
   关键帧用旧 Hero 同款「非对称四点」, 全程 ease-in-out 柔顺无卡顿。 */
@keyframes ccFloatX {
  0%   { transform: translate3d(0, 0, 0); }
  25%  { transform: translate3d(var(--fx), 0, 0); }
  50%  { transform: translate3d(calc(var(--fx) * 0.3), 0, 0); }
  75%  { transform: translate3d(calc(var(--fx) * -0.7), 0, 0); }
  100% { transform: translate3d(0, 0, 0); }
}
@keyframes ccFloatY {
  0%   { transform: translate3d(0, 0, 0); }
  25%  { transform: translate3d(0, calc(var(--fy) * -0.7), 0); }
  50%  { transform: translate3d(0, calc(var(--fy) * -1), 0); }
  75%  { transform: translate3d(0, calc(var(--fy) * 0.45), 0); }
  100% { transform: translate3d(0, 0, 0); }
}
@keyframes ccFloatR {
  0%   { transform: rotate(0deg); }
  25%  { transform: rotate(var(--tilt)); }
  50%  { transform: rotate(calc(var(--tilt) * -0.4)); }
  75%  { transform: rotate(calc(var(--tilt) * -1)); }
  100% { transform: rotate(0deg); }
}
.cc-rock-x {
  animation: ccFloatX calc(var(--dur) * 1.35) ease-in-out var(--ph-x) infinite both;
  will-change: transform;
}
.cc-rock-y {
  animation: ccFloatY var(--dur) ease-in-out var(--ph-y) infinite both;
  will-change: transform;
}
.cc-rock-r {
  animation: ccFloatR var(--dur-r) ease-in-out var(--ph-r) infinite both;
  will-change: transform;
  backface-visibility: hidden;
}
@media (prefers-reduced-motion: reduce) {
  .cc-rock-x, .cc-rock-y, .cc-rock-r { animation: none; }
}
`,
            }}
          />
          {ROCKS.map((r, i) => (
            // 三层嵌套: X 漂移 → Y 漂移 → 旋转, 各自独立周期叠加成李萨如轨迹。
            // 内层 img 保持 base rotate / flip。相位错开 (X / Y×0.7 / R×1.3),
            // 取负值让动画一加载就处于周期中段, 各石头不同步。
            <span
              key={i}
              aria-hidden="true"
              className="cc-rock-x"
              style={{
                position: "absolute",
                zIndex: 2,
                left: r.left,
                top: r.top,
                width: r.w,
                height: r.h,
                pointerEvents: "none",
                userSelect: "none",
                ["--fx" as string]: `${r.floatX}px`,
                ["--dur" as string]: `${r.floatDur}s`,
                ["--ph-x" as string]: `${-r.floatPhase}s`,
              }}
            >
              <span
                className="cc-rock-y"
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  ["--fy" as string]: `${r.floatY}px`,
                  ["--dur" as string]: `${r.floatDur}s`,
                  ["--ph-y" as string]: `${-r.floatPhase * 0.7}s`,
                }}
              >
                <span
                  className="cc-rock-r"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    ["--tilt" as string]: `${r.tilt}deg`,
                    ["--dur-r" as string]: `${r.driftDur}s`,
                    ["--ph-r" as string]: `${-r.floatPhase * 1.3}s`,
                  }}
                >
                  <img
                    src={r.src}
                    alt=""
                    draggable={false}
                    style={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: `rotate(${r.rotate}deg)${r.flipY ? " scaleY(-1)" : ""}`,
                      transformOrigin: "center",
                    }}
                  />
                </span>
              </span>
            </span>
          ))}
        </>
      )}
    </button>
  );
}
