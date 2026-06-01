import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  // 仅 lint 网站源码 (app / components / lib)。bridge 是独立的 Figma MCP
  // 工具 (自带 dist 构建产物), scripts/ae 为辅助脚本与设计资源, 一并排除,
  // 避免无关报错淹没真实问题。
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "bridge/**",
      "scripts/**",
      "ae/**",
      "_unused/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    // React 19 + eslint-plugin-react-hooks 新增的若干实验性规则, 对项目中多处
    // 合理模式存在误报: ref 懒初始化 (React 官方推荐写法)、事件回调内修改
    // document.body.style、挂载后读 localStorage 或异步资源加载完成后 setState。
    // 这些都不会引起级联渲染问题。统一降为 warn: 保留提示但不阻塞 lint/CI。
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
];

export default eslintConfig;
