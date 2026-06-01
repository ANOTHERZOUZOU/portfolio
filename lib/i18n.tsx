"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* ============================================================
   全站轻量级 i18n (中 / 英).
   ------------------------------------------------------------
   设计取向: 文案"就地双语" —— 组件里直接写 t("中文", "English"),
   两种语言并排, 不维护独立 key 词典. 因为本站文案散落在若干超大
   组件里 (CredmexSection 4600+ 行等), 就地写法最易维护、最不易漏。

   用法:
     const t = useT();
     <span>{t("经历", "Experience")}</span>

   语言开关:
     const { lang, setLang, toggle } = useLang();

   持久化: localStorage("portfolio-lang"); 默认 zh, 与 SSR 首屏一致
   (localStorage 在 mount 后读取, 避免 hydration 文本不匹配)。
   ============================================================ */

export type Lang = "zh" | "en";

const STORAGE_KEY = "portfolio-lang";

type LangContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  toggle: () => void;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");

  // mount 后读取本地偏好 (服务端始终 zh, 避免首屏 hydration mismatch)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "zh" || saved === "en") setLangState(saved);
    } catch {
      /* localStorage 不可用时忽略 */
    }
  }, []);

  // 同步 <html lang>, 利于无障碍 / SEO / 字体断词
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* 忽略 */
    }
  }, []);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      toggle: () => setLang(lang === "zh" ? "en" : "zh"),
    }),
    [lang, setLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // Provider 缺失时的安全兜底 (理论上不会发生, 整站已被包裹)
    return { lang: "zh", setLang: () => {}, toggle: () => {} };
  }
  return ctx;
}

/**
 * 返回一个按当前语言取值的函数: t("中文", "English").
 * 也支持取数值/任意类型以外的场景请直接用 useLang().lang 判断。
 */
export function useT() {
  const { lang } = useLang();
  return useCallback((zh: string, en: string) => (lang === "zh" ? zh : en), [lang]);
}
