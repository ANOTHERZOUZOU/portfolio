// 从源 PNG (根目录 img/*.png) 生成 1920 宽 AVIF 首屏序列帧到 public/img/。
// AVIF 体积更小 (作 <picture> 首选, WebP 作回退)。用法: node scripts/gen-img-avif.cjs
const sharp = require("sharp");

const WIDTH = 1920;
const QUALITY = 50; // AVIF q50 ≈ WebP q80 的观感
const N = 19;

(async () => {
  let total = 0;
  for (let i = 1; i <= N; i++) {
    const info = await sharp(`img/${i}.png`)
      .resize({ width: WIDTH })
      .avif({ quality: QUALITY, effort: 4 })
      .toFile(`public/img/${i}.avif`);
    total += info.size;
    process.stdout.write(`${i} `);
  }
  console.log(`\n完成 ${N} 张 AVIF, 总计 ${(total / 1048576).toFixed(2)} MB @ ${WIDTH}w q${QUALITY}`);
})();
