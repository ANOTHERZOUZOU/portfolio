"use client";

interface TagData {
  label: string;
  color: string;
  cx: number;
  cy: number;
  rot: number;
}

interface FloatingTagsHeroProps {
  tags: TagData[];
  progress: number;
  className?: string;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function easeOutBounce(x: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

export default function FloatingTagsHero({
  tags,
  progress,
  className = "",
}: FloatingTagsHeroProps) {
  return (
    <div className={className} style={{ position: "absolute", inset: 0 }}>
      {tags.map((tag, i) => {
        const r = (n: number) => seededRandom(i * 13 + n);

        const finalX = tag.cx;
        const finalY = tag.cy;
        const finalRot = tag.rot;
        const delay = i * 0.12 + r(4) * 0.08;

        // 从终态X正上方垂直掉落
        const startX = finalX;
        const startY = -15 - r(6) * 10; // -15%~-25%

        const localT = Math.min(1, Math.max(0, (progress - delay) / 0.6));
        if (localT < 0.001) return null;

        const bounced = easeOutBounce(localT);
        const smooth = easeOutCubic(localT);

        const currentX = startX + (finalX - startX) * smooth;
        const currentY = startY + (finalY - startY) * bounced;
        const currentRot = finalRot * bounced;
        const scale = 0.95 + 0.05 * smooth;
        const opacity = Math.min(1, localT * 5);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${currentY}%`,
              left: `${currentX}%`,
              transform: `translate(-50%, -50%) rotate(${currentRot}deg) scale(${scale})`,
              display: "flex",
              alignItems: "center",
              height: 59,
              borderRadius: 67.5,
              backgroundColor: "#F0F0F0",
              padding: "12px 16px 12px 12px",
              gap: 12,
              opacity,
              willChange: "transform, opacity",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: tag.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 24,
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                color: "#3B3B3B",
                whiteSpace: "nowrap",
              }}
            >
              {tag.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
