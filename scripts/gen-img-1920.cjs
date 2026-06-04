// 从源 PNG (根目录 img/*.png, 4320 宽) 生成 1920 宽 WebP 首屏序列帧到 public/img/。
// 用法: node scripts/gen-img-1920.cjs
const sharp = require("sharp");

const WIDTH = 1920;
const QUALITY = 80;
const N = 19;

(async () => {
  let total = 0;
  for (let i = 1; i <= N; i++) {
    const info = await sharp(`img/${i}.png`)
      .resize({ width: WIDTH })
      .webp({ quality: QUALITY, effort: 5 })
      .toFile(`public/img/${i}.webp`);
    total += info.size;
    process.stdout.write(`${i} `);
  }
  console.log(`\n完成 ${N} 张, 总计 ${(total / 1048576).toFixed(2)} MB @ ${WIDTH}w q${QUALITY}`);
})();
