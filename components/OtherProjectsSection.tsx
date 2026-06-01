"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/* ============================================================
 * 其他项目: 文件夹式标签卡 (Figma 节点 1898:23459).
 *   - 两个 tab (easyPLN / Instacash) 点击切换;
 *   - 面板颜色 = 当前激活 tab 的颜色 (easyPLN 浅蓝白 #f5f9fc / Instacash 绿 #8cc23a);
 *   - 面板内为「作品网格墙」: 多列瀑布流, 相邻列上下交替漂移, 边缘融入面板色
 *     (参考录屏 / design.cash.app 风格, 纯图片仅展示)。
 * 图片来自 public/easypln、public/instacash (源图转 webp)。
 * ============================================================ */

type TabKey = "easypln" | "instacash";

const TAB_KEYS: TabKey[] = ["instacash", "easypln"];

const PANEL_COLOR: Record<TabKey, string> = {
  easypln: "#f5f9fc",
  instacash: "#8cc23a",
};

const TAB_LOGO: Record<TabKey, string> = {
  easypln: "/figma/other-projects/tab-easypln.svg",
  instacash: "/figma/other-projects/tab-instacash.svg",
};

const TAB_LABEL: Record<TabKey, string> = {
  easypln: "easyPLN",
  instacash: "Instacash",
};

const buildImages = (name: string, count: number) =>
  Array.from(
    { length: count },
    (_, i) => `/${name}/${String(i + 1).padStart(2, "0")}.webp`
  );

const IMAGES: Record<TabKey, string[]> = {
  easypln: buildImages("easypln", 20),
  instacash: buildImages("instacash", 16),
};

export default function OtherProjectsSection({
  id = "other-projects",
}: {
  id?: string;
}) {
  const [active, setActive] = useState<TabKey>("instacash");

  return (
    <section
      id={id}
      data-light-section={false}
      style={{
        backgroundColor: "#000000",
        minHeight: "100vh",
        marginTop: 120,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "clamp(40px,7vh,96px) 0",
      }}
    >
      {/* 网格墙漂移 keyframes + 悬停暂停 (注入一次) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes opxUp { from { transform: translateY(0); } to { transform: translateY(-50%); } }
@keyframes opxDown { from { transform: translateY(-50%); } to { transform: translateY(0); } }
.opx-col-wrap:hover .opx-col { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .opx-col { animation: none !important; } }
`,
        }}
      />

      <div
        style={
          {
            width: "100%",
            position: "relative",
            "--opx-tabw": "clamp(160px, 19vw, 260px)",
          } as CSSProperties
        }
      >
        {/* 文件夹 tab 行 */}
        <div
          role="tablist"
          aria-label="项目切换"
          style={{
            display: "flex",
            alignItems: "flex-end",
            paddingLeft: "clamp(24px, 6vw, 96px)",
            position: "relative",
            zIndex: 2,
          }}
        >
          {TAB_KEYS.map((key, idx) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={TAB_LABEL[key]}
                onClick={() => setActive(key)}
                style={{
                  width: "var(--opx-tabw)",
                  aspectRatio: "300 / 47",
                  marginLeft: idx === 0 ? 0 : "calc(var(--opx-tabw) * -0.155)",
                  marginBottom: -1,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  zIndex: isActive ? 2 : 1,
                  transform: "translateY(0)",
                  opacity: 1,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <img
                  src={TAB_LOGO[key]}
                  alt={TAB_LABEL[key]}
                  draggable={false}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* 面板: 颜色随激活 tab 过渡, 内部为作品网格墙 (四周留面板色边 + 圆角) */}
        <div
          role="tabpanel"
          style={{
            backgroundColor: PANEL_COLOR[active],
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            minHeight: "clamp(480px, 78vh, 880px)",
            transition: "background-color 0.45s ease",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            ["--opx-py" as string]: "clamp(10px, 1.1vw, 18px)",
            ["--opx-px" as string]: "clamp(10px, 1.1vw, 18px)",
          }}
        >
          <GalleryWall
            key={active}
            images={IMAGES[active]}
            label={TAB_LABEL[active]}
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- 作品网格墙: 多列瀑布流, 相邻列上下交替漂移 ---------- */

function GalleryWall({
  images,
  label,
}: {
  images: string[];
  label: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(4);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () =>
      setCols(Math.max(2, Math.min(5, Math.round(el.clientWidth / 300))));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 依次分配到各列
  const columns: string[][] = Array.from({ length: cols }, () => []);
  images.forEach((src, i) => columns[i % cols].push(src));

  return (
    <div
      ref={wrapRef}
      className="opx-wall"
      style={
        {
          position: "absolute",
          top: "var(--opx-py)",
          bottom: "var(--opx-py)",
          left: "var(--opx-px)",
          right: "var(--opx-px)",
          overflow: "hidden",
          borderRadius: 26,
          display: "flex",
          gap: "var(--opx-gap)",
          "--opx-gap": "clamp(10px, 1.1vw, 18px)",
        } as CSSProperties
      }
    >
      {columns.map((colImgs, c) => {
        const doubled = [...colImgs, ...colImgs];
        const goUp = c % 2 === 0; // 相邻列方向相反
        const duration = 40 + (c % 3) * 8; // 列间速度错落, 整体偏慢
        return (
          <div
            key={c}
            className="opx-col-wrap"
            style={{ flex: 1, position: "relative", overflow: "hidden" }}
          >
            <div
              className="opx-col"
              style={{
                display: "block",
                animationName: goUp ? "opxUp" : "opxDown",
                animationDuration: `${duration}s`,
                animationTimingFunction: "linear",
                animationIterationCount: "infinite",
                animationDelay: `${-(c * 2.5)}s`,
                willChange: "transform",
              }}
            >
              {doubled.map((src, i) => {
                const original = i < colImgs.length;
                return (
                  <img
                    key={i}
                    src={src}
                    alt={original ? label : ""}
                    aria-hidden={!original}
                    draggable={false}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                      marginBottom: "var(--opx-gap)",
                      borderRadius: 14,
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

    </div>
  );
}
