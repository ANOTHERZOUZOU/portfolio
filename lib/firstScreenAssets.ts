// 首屏关键资源清单 —— 单一数据源
//
// JobyTimeline 用它驱动 intro 序列帧 / 背景视频;
// Preloader 用它做"真实预加载 + 进度条"。
// 两边引用同一份, 保证预加载 URL 与实际渲染请求完全一致, 才能命中浏览器缓存。

// 序列帧版本号: 修改源图后改这里, 强制刷新缓存。
export const IMAGE_SEQUENCE_VERSION = "20260603-egg";

// Intro 滚动序列帧 (1..19), 滚动 scrub 必须全部就绪才流畅, 是预加载进度的主体。
export const FIRST_SCREEN_IMAGES: string[] = Array.from(
  { length: 19 },
  (_, i) => `/img/${i + 1}.webp?v=${IMAGE_SEQUENCE_VERSION}`,
);

// AVIF 版本 (体积更小, 作 <picture> 首选; 不支持 AVIF 的浏览器回退到上面的 WebP)。
export const FIRST_SCREEN_IMAGES_AVIF: string[] = FIRST_SCREEN_IMAGES.map((src) =>
  src.replace(".webp", ".avif"),
);

// 本地背景视频, 放在 public/timeline/ 下。reveal 后按数组顺序自动循环, 数量任意。
// 体积较大且 intro 末尾 (p>=0.89) 才淡入, 不计入开场进度, 由 JobyTimeline 自行加载。
export const FIRST_SCREEN_VIDEOS: string[] = [
  "/timeline/1.mp4",
  "/timeline/2.mp4",
  "/timeline/3.mp4",
];
