#!/usr/bin/env bash
#
# Extract a hero MP4 background into a webp image sequence at /public/hero-frames-* .
# 用法:
#   ./scripts/extract-hero-frames.sh public/hero-bg-scrub.mp4 hero-frames
#   ./scripts/extract-hero-frames.sh public/hero-bg-scrub-2.mp4 hero-frames-2
#
# 抽帧策略:
#   - 24fps × 10s = 240 帧, 跟现有 /public/hero-frames 保持一致
#   - 1280px 宽, 高度按比例 (-2 = 自动 round 到偶数)
#   - libwebp + q 80, compression_level 6: 单帧 30~80KB, 240 帧 ≈ 10MB
#
# 需要 ffmpeg. 如果没装:
#   brew install ffmpeg
#
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <input.mp4> <out-folder-name>" >&2
  exit 1
fi

SRC="$1"
OUT_NAME="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/public/$OUT_NAME"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg 未安装。brew install ffmpeg 后重试。" >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

ffmpeg -y -i "$SRC" \
  -vf "fps=24,scale=1280:-2" \
  -c:v libwebp -q:v 80 -compression_level 6 \
  -f image2 \
  "$OUT_DIR/hero-%03d.webp"

# 削掉第 241 帧 (10.04s × 24fps 偶尔会冒出来)
rm -f "$OUT_DIR/hero-241.webp"

echo "✅ 输出 $(ls "$OUT_DIR" | wc -l | tr -d ' ') 帧到 $OUT_DIR"
