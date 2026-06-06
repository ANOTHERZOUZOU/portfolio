"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import ContactCard from "./ContactCard";

/* ============================================================
 * 站点 footer —— 版式与内容复刻下拉菜单 (NavOverlayMenu) 的布局:
 *   - 左侧: 章节目录 (复用全站 s4-link 样式: 标题 + leader 虚线 + 罗马序号);
 *   - 左下: TEL / E-mail 联系方式;
 *   - 右下: "Like? / Contact me" 绿色卡片 + 微信二维码。
 * 配色: footer 为品牌绿底 (亮色), 导航走 s4-nav-light 深色版,
 *   文字色用 --foreground (深) 系列, 保证对比度。
 * 字体 / 字号 / 行高 / 字间距 / 间距全部走站内规范:
 *   var(--font-sans) + t-* 工具类 + var(--space-*).
 * ============================================================ */

const FG = "var(--background)"; // footer 绿底上的深色前景
const SANS = "var(--font-sans)";

const EMAIL = "anotherzouzou@gmail.com";
const TEL = "+8618842701237";
const TEL_DISPLAY = "188\u00a0\u00a04270\u00a0\u00a01237";

// 与下拉菜单目录一致: 带罗马序号的完整章节导航 (双语)。
const NAV: { zh: string; en: string; index: string; href: string }[] = [
  { zh: "经历", en: "Experience", index: "I", href: "#experience" },
  { zh: "品牌宣传", en: "Brand Marketing", index: "II", href: "#brand-center" },
  { zh: "产品构建", en: "Product Building", index: "III", href: "#product" },
  { zh: "运营活动", en: "Campaigns", index: "IV", href: "#events" },
  { zh: "素材库搭建", en: "Asset Library", index: "V", href: "#material" },
  { zh: "其他项目", en: "Other Projects", index: "VI", href: "#other-projects" },
  { zh: "AI 工具", en: "AI Tools", index: "VII", href: "#ai" },
];

function useCopyEmail() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(EMAIL);
      } else {
        const ta = document.createElement("textarea");
        ta.value = EMAIL;
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
      // 复制失败时静默: mailto 仍会作为默认行为触发
    }
  };

  return { copied, copy };
}

export default function SiteFooter() {
  const t = useT();
  const { copied, copy } = useCopyEmail();
  return (
    <footer
      data-light-section
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 0,
        backgroundColor: "var(--brand-green)",
        color: FG,
        fontFamily: SANS,
        paddingBlock: "40px",
        paddingInline: "40px",
        width: "100%",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
.opx-foot-link { transition: opacity 0.25s ease; }
.opx-foot-link:hover { opacity: 0.6; }
`,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          columnGap: "var(--space-5)",
          rowGap: "var(--space-8)",
          alignItems: "stretch",
          width: "100%",
        }}
      >
        {/* 左: 章节目录 + 联系方式 (同下拉菜单的左列) */}
        <div
          className="opx-foot-left"
          style={{
            gridColumn: "span 12",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-7)",
          }}
        >
          <nav aria-label={t("章节导航", "Sections")}>
            <ul
              className="s4-nav-light"
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
                maxWidth: 226,
              }}
            >
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="s4-link t-body-sm"
                    style={{ fontFamily: SANS, fontWeight: 400 }}
                  >
                    <span className="s4-label">{t(item.zh, item.en)}</span>
                    <span className="s4-leader" aria-hidden="true" />
                    <span className="s4-index">{item.index}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div
            className="t-body-sm"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
              fontWeight: 500,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-1)" }}>
              <span>TEL:</span>
              <a
                href={`tel:${TEL}`}
                className="opx-foot-link"
                style={{ color: FG, textDecoration: "none" }}
              >
                {TEL_DISPLAY}
              </a>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-1)" }}>
              <span>E-mail:</span>
              <a
                href={`mailto:${EMAIL}`}
                onClick={copy}
                className="opx-foot-link"
                style={{ color: FG, textDecoration: "none" }}
              >
                {EMAIL}
              </a>
              {copied ? (
                <span aria-live="polite" style={{ opacity: 0.6 }}>
                  {t("（已复制）", "(copied)")}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* 右: 署名 + 版权 (上) + 联系卡片 (下, 同下拉菜单的右下卡片) */}
        <div
          className="opx-foot-right"
          style={{
            gridColumn: "span 12",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "var(--space-7)",
            textAlign: "right",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "var(--space-1)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: SANS,
                fontWeight: 500,
                fontSize: "16px",
                lineHeight: 1.65,
                color: FG,
              }}
            >
              Designed by ANOTHERZOUZOU
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: SANS,
                fontWeight: 400,
                fontSize: 14,
                lineHeight: 1.65,
                color: FG,
              }}
            >
              ©2026
            </p>
          </div>

          <ContactCard />
        </div>
      </div>

      {/* 大屏 (lg+) 下: 左列 (目录+联系) 占左半, 卡片靠右 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media (min-width: 1024px) {
  .opx-foot-left { grid-column: span 7 / span 7 !important; }
  .opx-foot-right { grid-column: span 5 / span 5 !important; justify-content: flex-end; }
}
`,
        }}
      />
    </footer>
  );
}
