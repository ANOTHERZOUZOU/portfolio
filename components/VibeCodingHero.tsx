"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { useBreakpoint } from "@/lib/breakpoints";

/* ============================================================
 * Vibe Coding 首屏 —— 真实复刻 artefakt.mov 的 <c-hero> / <c-logo>
 *
 * 中央 logo 不是 Canvas 模拟, 而是 artefakt 源码同款的真实管线:
 *   ① GPGPU 粒子: base 位置取自 "Vibe Coding" 文字点云 (源用 .glb 模型),
 *      每帧用 simplexNoise4d curl flow-field 推动 + spring 拉回 base,
 *      particle.a 生命周期循环 → 持续微抖 (字符跳动的根源).
 *      鼠标按 uMouseStrength 把粒子推离光标 (raycast 投影到平面).
 *   ② 粒子渲染: THREE.Points 白色软圆点, uVisibility 逐粒子错峰淡入 (入场解码),
 *      vLight = dot(随机法线, uLightDir) 给出明暗 → 决定后处理选哪个字符.
 *      渲染到 0.3x 低分辨率 RenderTarget (得到亮度场).
 *   ③ ASCII 后处理: 全屏 pass 把亮度场像素化分块, 每块按 luma 从字符图集
 *      " .:-=+*#%@4RT3F" 选一个字符 (暗→亮). 粒子游动 → 每块 luma 变 → 字符跳动.
 *
 * 全部 shader / 参数照搬 app.js 的 Artefakt 类:
 *   uSize, uMouseStrength=.072, uFlowFieldInfluence=.43,
 *   uFlowFieldStrength=1.09, uFlowFieldFrequency=.53,
 *   asciiChars=" .:-=+*#%@4RT3F", uAsciiContrast=1.09, pixelSize=rtW/180.
 *
 * 底部 .hero-title / .hero-content 用 ScrambleText (源 effects.shuffle /
 * shuffleChar): 入场逐字解码 + hover 逐字乱码.
 * ============================================================ */

const ASCII_CHARS = " .:-=+*#%@4RT3F"; // 源 this.asciiChars (按亮度排序: 暗→亮)

/* ---- GPGPU 流场 sim shader (源 addVariable 第二参数, texture→texture2D) ---- */
const SIM_FRAG = /* glsl */ `
uniform float uTime;
uniform float uDeltaTime;
uniform float uFlowFieldInfluence;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;
uniform vec3  uMouse;
uniform float uMouseStrength;
uniform float uMouseSpeed;
uniform sampler2D uBase;

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}

vec4 grad4(float j, vec4 ip){
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;
  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;
  return p;
}

float simplexNoise4d(vec4 v){
  const vec2  C = vec2( 0.138196601125010504, 0.309016994374947451);
  vec4 i  = floor(v + dot(v, C.yyyy) );
  vec4 x0 = v -   i + dot(i, C.xxxx);
  vec4 i0;
  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );
  vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
  vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
  vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
  vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;
  i = mod(i, 289.0);
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;
  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)), 0.0);
  m0 = m0 * m0; m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
}

void main() {
  float time = uTime * 0.4; // 源 0.2; 提速 → 字符跳变节奏更快
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 particle = texture2D(uParticles, uv);
  vec4 base = texture2D(uBase, uv);

  vec3 targetPos = base.xyz;

  // 鼠标推离 (源: 强度随鼠标速度 clamp 到 uMouseStrength)
  float uRepelStrength = clamp(uMouseSpeed, 0.0, uMouseStrength);
  vec3 dir = normalize(particle.xyz - uMouse);
  float dist = distance(uMouse, particle.xyz) * 3.2; // ×系数 → 缩小鼠标影响圈半径 (系数越大圈越小)
  float repulsionForce = uRepelStrength / (dist * (dist + 1.0));
  vec3 repulsion = dir * repulsionForce * 2.0;
  particle.xyz += repulsion * uRepelStrength;

  if (particle.a >= 1.0) {
    particle.a = mod(particle.a, 1.0);
    particle.xyz = base.xyz;
  } else {
    float strength = simplexNoise4d(vec4(base.xyz, time + 1.0));
    float influence = (uFlowFieldInfluence - 0.5) * (-2.0);
    strength = smoothstep(influence, 1.0, strength);
    vec3 flowField = vec3(
      simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 0.0, time)),
      simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 1.0, time)),
      simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 2.0, time))
    );
    flowField = normalize(flowField);
    particle.xyz += flowField * uDeltaTime * strength * uFlowFieldStrength;
    vec3 toTarget = targetPos - particle.xyz;
    particle.xyz += toTarget * 2.0 * uDeltaTime;   // springStrength
    particle.xyz += toTarget * uDeltaTime * 0.1;   // pullStrength
    particle.a += uDeltaTime * 0.5;
  }

  gl_FragColor = particle;
}
`;

/* ---- 粒子渲染 vertex (源 particles.material.vertexShader, texture→texture2D) ---- */
const PARTICLE_VERT = /* glsl */ `
uniform vec2 uResolution;
uniform float uSize;
uniform float uVisibility;
uniform sampler2D uParticlesTexture;
uniform sampler2D uNormalsTexture;
uniform vec3 uLightDir;

attribute vec2 aParticlesUv;
attribute float aSize;

varying float vAlpha;
varying float vLight;
varying float vDelay;

float hash1(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec4 particle = texture2D(uParticlesTexture, aParticlesUv);
  vec4 modelPosition = modelMatrix * vec4(particle.xyz, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  vDelay = hash1(modelPosition.xyz);
  vec3 normalFromTex = texture2D(uNormalsTexture, aParticlesUv).xyz;

  float sizeIn = smoothstep(0., 0.1, particle.a);
  float sizeOut = 1. - smoothstep(0.7, 1., particle.a);
  float size = min(sizeIn, sizeOut);

  gl_Position = projectedPosition;
  gl_PointSize = size * aSize * uSize * uResolution.y;
  gl_PointSize *= (1.0 / - viewPosition.z);

  vAlpha = uVisibility;
  vec3 n = normalize(normalMatrix * normalFromTex);
  vLight = max(dot(n, uLightDir), 0.0);
}
`;

/* ---- 粒子渲染 fragment (源 particles.material.fragmentShader) ---- */
const PARTICLE_FRAG = /* glsl */ `
varying float vAlpha;
varying float vDelay;
varying float vLight;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float alpha = 1.0 - smoothstep(0.4, 0.5, d);

  float fadeDuration = 0.15;
  float localProgress = (vAlpha - vDelay) / fadeDuration;
  float appear = smoothstep(0.0, 1.0, localProgress);

  alpha *= appear;
  alpha *= vLight;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(vec3(1.0), alpha);
}
`;

/* ---- ASCII 后处理 (源 setupPostProcessing 的 ShaderPass) ---- */
const ASCII_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
const ASCII_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uAsciiPixelSize;
uniform sampler2D uAsciiTexture;
uniform vec2 uCharCount;
uniform float uAsciiContrast;
uniform float uAsciiBrightness;
uniform float uAsciiMin;
uniform float uAsciiMax;
uniform float uAsciiGamma;
varying vec2 vUv;

void main() {
  vec2 normalizedPixelSize = uAsciiPixelSize / uResolution;
  vec2 uvPixel = normalizedPixelSize * floor(vUv / normalizedPixelSize);
  vec4 texColor = texture2D(tDiffuse, uvPixel);

  float luma = dot(vec3(0.2126, 0.7152, 0.0722), texColor.rgb);
  // additive HDR → Reinhard 软压缩: 中心高密度永不 clamp 死, 随粒子流动连续变化 → 字符自动切换
  luma = max(luma - uAsciiMin, 0.0);
  luma = luma / (luma + uAsciiMax); // uAsciiMax = 半饱和点 k (luma=k → 0.5)
  luma = pow(luma, uAsciiGamma); // gamma<1 提亮暗部 → 飞散/稀疏处也升到清晰字符档 (纯黑背景仍黑, 不冒噪点)
  luma = luma + uAsciiBrightness;
  luma = (luma - 0.5) * uAsciiContrast + 0.5;
  luma = clamp(luma, 0.0, 1.0);

  vec2 cellUV = fract(vUv / normalizedPixelSize);
  float charIndex = clamp(floor(luma * (uCharCount.x - 1.0)), 0.0, uCharCount.x - 1.0);
  vec2 asciiUV = vec2((charIndex + cellUV.x) / uCharCount.x, cellUV.y);
  float character = texture2D(uAsciiTexture, asciiUV).r;

  vec3 finalColor = character * vec3(1.0) * (luma + 0.9);
  float alpha = texColor.a * character;
  gl_FragColor = vec4(finalColor, alpha);
}
`;

export default function VibeCodingHero({
  text = "Vibe Coding",
  title,
  description,
}: {
  text?: string;
  title?: string;
  description?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bp = useBreakpoint();
  const padX = bp === "sm" ? 16 : 40; // 对齐 TopNavigation logo 左缘 (页边距规范: sm 16px / 其他 40px)

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fontFamily = getComputedStyle(wrap).fontFamily || "sans-serif";

    // ---- 可调常量 (按源码比例标定) ----
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const SIZE = isMobile ? 240 : 360; // GPGPU 纹理边长. 海量粒子兼顾笔画饱满 + 动态
    const COUNT = SIZE * SIZE;
    const FILL = 0.82; // 文字宽 / 视宽
    const FOV = 45;
    const CAM_Z = 4;
    // 点直径亚格子级(格 ~2.4 RT px). ascii 取每格"角点一个纹素"的 luma:
    // 点 < 格 → 粒子一游动该纹素就在命中点/边缘/落空间横跳 → luma 全幅波动 →
    // 字符在全字符集里不停切换; 点≈格则恒命中白 → 永远 F 且不切换.
    // 再靠海量粒子(SIZE) 把笔画填实, 避免点小导致稀疏.
    const U_SIZE = 0.06;
    const RT_SCALE = 0.3; // 后处理低分辨率 (源 e=0.3)
    const ASCII_T = 180; // 源 t=180 → 横向字符格数

    let renderer: THREE.WebGLRenderer | null = null;
    let gpu: GPUComputationRenderer | null = null;
    let disposed = false;
    let raf = 0;
    let running = false;

    // ---- 文字点云采样: "Vibe Coding" → 不透明像素 ----
    const sampleText = () => {
      const FS = 220;
      const c = document.createElement("canvas");
      const cx = c.getContext("2d")!;
      cx.font = `800 ${FS}px ${fontFamily}`;
      const w = Math.ceil(cx.measureText(text).width) + 60;
      const h = Math.ceil(FS * 1.5);
      c.width = w;
      c.height = h;
      cx.font = `800 ${FS}px ${fontFamily}`;
      cx.fillStyle = "#fff";
      cx.textAlign = "center";
      cx.textBaseline = "middle";
      cx.fillText(text, w / 2, h / 2);
      const data = cx.getImageData(0, 0, w, h).data;
      const pts: number[] = [];
      let minX = w;
      let maxX = 0;
      let minY = h;
      let maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 128) {
            pts.push(x, y);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      return { pts, minX, maxX, minY, maxY };
    };

    const { pts, minX, maxX, minY, maxY } = sampleText();
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const cx0 = (minX + maxX) / 2;
    const cy0 = (minY + maxY) / 2;
    const textAspect = bw / bh; // 宽/高
    const nPts = pts.length / 2;

    // ---- three 基础 ----
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
      });
    } catch {
      return;
    }
    const r3 = renderer;
    r3.setClearColor(0x000000, 0);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    r3.setPixelRatio(dpr);

    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 1000);
    camera.position.set(0, 0, CAM_Z);

    const particleScene = new THREE.Scene();

    // ---- GPGPU ----
    gpu = new GPUComputationRenderer(SIZE, SIZE, r3);
    const gpuRef = gpu;
    const baseTex = gpuRef.createTexture();
    const normalsTex = gpuRef.createTexture();
    const baseArr = baseTex.image.data as unknown as Float32Array;
    const normArr = normalsTex.image.data as unknown as Float32Array;

    // base = 文字点云 (model 空间 ~[-1,1]); normals = 随机方向 → vLight 多样
    for (let i = 0; i < COUNT; i++) {
      const s = (Math.floor(Math.random() * nPts)) * 2;
      const px = pts[s] + (Math.random() - 0.5);
      const py = pts[s + 1] + (Math.random() - 0.5);
      const nx = (px - cx0) / bh; // 以高度归一: y∈[-0.5,0.5], x∈[-aspect/2,aspect/2]
      const ny = -(py - cy0) / bh;
      const nz = (Math.random() - 0.5) * 0.15;
      const o = i * 4;
      baseArr[o] = nx;
      baseArr[o + 1] = ny;
      baseArr[o + 2] = nz;
      baseArr[o + 3] = Math.random(); // particle.a 初始相位错开 → 持续闪烁
      // 随机单位法线
      let rx = Math.random() * 2 - 1;
      let ry = Math.random() * 2 - 1;
      let rz = Math.random() * 2 - 1;
      const rl = Math.hypot(rx, ry, rz) || 1;
      rx /= rl;
      ry /= rl;
      rz /= rl;
      normArr[o] = rx;
      normArr[o + 1] = ry;
      normArr[o + 2] = rz;
      normArr[o + 3] = 1;
    }
    baseTex.needsUpdate = true; // 直接作为 uBase sampler 采样
    normalsTex.needsUpdate = true; // 直接作为 uNormalsTexture sampler 采样

    const particlesVar = gpuRef.addVariable("uParticles", SIM_FRAG, baseTex);
    gpuRef.setVariableDependencies(particlesVar, [particlesVar]);
    Object.assign(particlesVar.material.uniforms, {
      uTime: { value: 0 },
      uDeltaTime: { value: 0 },
      uBase: { value: baseTex },
      uFlowFieldInfluence: { value: 0.43 },
      uFlowFieldStrength: { value: 1.09 },
      uFlowFieldFrequency: { value: 0.53 },
      uMouse: { value: new THREE.Vector3(0, 0, 0) },
      uMouseStrength: { value: 0.1 }, // 位移∝强度²; 调小 → 粒子推开距离小 → 鼠标搅动圈更小
      uMouseSpeed: { value: 0 },
    });
    const gpuErr = gpuRef.init();
    if (gpuErr) {
      // 不支持浮点 RT: 放弃 (保留黑底)
      r3.dispose();
      return;
    }

    // ---- 粒子 geometry / material ----
    const aParticlesUv = new Float32Array(COUNT * 2);
    const aSize = new Float32Array(COUNT);
    for (let cyi = 0; cyi < SIZE; cyi++) {
      for (let cxi = 0; cxi < SIZE; cxi++) {
        const i = cyi * SIZE + cxi;
        aParticlesUv[i * 2] = (cxi + 0.5) / SIZE;
        aParticlesUv[i * 2 + 1] = (cyi + 0.5) / SIZE;
        aSize[i] = Math.random();
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    geo.setAttribute("aParticlesUv", new THREE.BufferAttribute(aParticlesUv, 2));
    geo.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));

    const particleMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending, // 亮度=粒子密度的线性叠加, 不再 alpha 饱和到纯白 → 笔画核心也随密度连续变化
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uSize: { value: U_SIZE },
        uVisibility: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uParticlesTexture: { value: null },
        uNormalsTexture: { value: normalsTex },
        uLightDir: { value: new THREE.Vector3(0.1, 1, 1).normalize() },
      },
    });
    const points = new THREE.Points(geo, particleMat);
    points.frustumCulled = false;
    particleScene.add(points);

    // ---- ASCII 字符图集 (源 createAsciiTexture) ----
    const makeAsciiTexture = () => {
      const cell = 16;
      const c = document.createElement("canvas");
      c.width = cell * ASCII_CHARS.length;
      c.height = cell;
      const cx = c.getContext("2d")!;
      cx.fillStyle = "black";
      cx.fillRect(0, 0, c.width, c.height);
      cx.fillStyle = "white";
      cx.font = `${cell}px monospace`;
      cx.textBaseline = "middle";
      cx.textAlign = "center";
      ASCII_CHARS.split("").forEach((ch, i) => {
        cx.fillText(ch, cell * (i + 0.5), cell / 2);
      });
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      return tex;
    };
    const asciiTexture = makeAsciiTexture();

    // ---- ASCII 后处理 scene (全屏 quad) ----
    const asciiScene = new THREE.Scene();
    const asciiCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const asciiMat = new THREE.ShaderMaterial({
      vertexShader: ASCII_VERT,
      fragmentShader: ASCII_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uAsciiPixelSize: { value: 2 },
        uAsciiTexture: { value: asciiTexture },
        uCharCount: { value: new THREE.Vector2(ASCII_CHARS.length, 1) },
        uAsciiContrast: { value: 1.09 },
        uAsciiBrightness: { value: 0 },
        uAsciiMin: { value: 0 },
        uAsciiMax: { value: 5 }, // Reinhard 半饱和点 k: 调大→整体偏暗+中心字符变化更敏感, 调小→更亮
        uAsciiGamma: { value: 0.5 }, // <1 提亮暗部, 让飞散/稀疏处也显示清晰字符; 越小飞散越亮 (过小则背景噪点)
      },
    });
    asciiScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), asciiMat));

    let rt: THREE.WebGLRenderTarget | null = null;
    let W = 0;
    let H = 0;
    let pointsScaleRef = 1;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      W = Math.max(2, Math.floor(rect.width));
      H = Math.max(2, Math.floor(rect.height));
      r3.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();

      // 文字填屏: 求 points.scale 使文字宽 = FILL * 可见宽
      const visH = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360);
      const visW = visH * (W / H);
      const worldTextW = FILL * visW;
      const S = worldTextW / textAspect; // base y 跨度 ≈ 1 → 世界高 = S
      points.scale.set(S, S, S);

      // RT (0.3x) + uResolution
      const rtW = Math.max(2, Math.round(W * RT_SCALE));
      const rtH = Math.max(2, Math.round(H * RT_SCALE));
      if (rt) rt.dispose();
      rt = new THREE.WebGLRenderTarget(rtW, rtH, {
        depthBuffer: false,
        stencilBuffer: false,
        magFilter: THREE.LinearFilter,
        minFilter: THREE.LinearFilter,
        type: THREE.HalfFloatType, // additive 需累积 >1 的 HDR 亮度, 8位会 clamp 仍饱和
      });
      particleMat.uniforms.uResolution.value.set(rtW, rtH);
      asciiMat.uniforms.uResolution.value.set(rtW, rtH);
      asciiMat.uniforms.uAsciiPixelSize.value = rtW / ASCII_T;

      pointsScaleRef = S;
    };

    // ---- 鼠标 (raycast 到 z=0 平面 → model 空间 → uMouse) ----
    const ndc = new THREE.Vector2(-10, -10);
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hit = new THREE.Vector3();
    const prevMouse = new THREE.Vector3();
    let mouseSpeed = 0;
    let pointerOn = false;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointerOn = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      ndc.x = (x / rect.width) * 2 - 1;
      ndc.y = -(y / rect.height) * 2 + 1;
    };
    const onLeave = () => {
      pointerOn = false;
    };

    // ---- 入场 visibility ----
    let inView = false;
    let lastT = performance.now();

    const frame = () => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (!rt) return;

      const now = performance.now();
      let dt = (now - lastT) / 1000;
      lastT = now;
      if (dt > 0.05) dt = 0.05; // 防卡顿跳变
      const elapsed = now / 1000;

      // visibility 缓动 (入场逐粒子错峰淡入)
      const target = inView ? 1 : 0;
      const vis = particleMat.uniforms.uVisibility.value as number;
      particleMat.uniforms.uVisibility.value = vis + (target - vis) * (reduce ? 1 : 0.03);

      // 鼠标 → model 空间
      const simU = particlesVar.material.uniforms;
      if (pointerOn) {
        ray.setFromCamera(ndc, camera);
        if (ray.ray.intersectPlane(plane, hit)) {
          const mx = hit.x / pointsScaleRef;
          const my = hit.y / pointsScaleRef;
          const mz = 0;
          const n = 720 * mouseSpeed; // 鼠标速度→排斥强度, 越大越敏感
          simU.uMouseSpeed.value = THREE.MathUtils.lerp(simU.uMouseSpeed.value, n, 0.15);
          mouseSpeed = Math.hypot(mx - prevMouse.x, my - prevMouse.y, mz - prevMouse.z);
          prevMouse.set(mx, my, mz);
          (simU.uMouse.value as THREE.Vector3).set(mx, my, mz);
        }
      } else {
        simU.uMouseSpeed.value *= 0.9;
      }

      // GPGPU compute
      simU.uTime.value = elapsed;
      simU.uDeltaTime.value = dt;
      gpuRef.compute();
      particleMat.uniforms.uParticlesTexture.value =
        gpuRef.getCurrentRenderTarget(particlesVar).texture;

      // 粒子 → RT
      r3.setRenderTarget(rt);
      r3.setClearColor(0x000000, 0);
      r3.clear();
      r3.render(particleScene, camera);

      // ASCII pass → 屏幕
      asciiMat.uniforms.tDiffuse.value = rt.texture;
      r3.setRenderTarget(null);
      r3.clear();
      r3.render(asciiScene, asciiCam);
    };

    const start = () => {
      if (running) return;
      running = true;
      lastT = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const ro = new ResizeObserver(() => resize());
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          inView = entry.isIntersecting;
          if (entry.isIntersecting) start();
          else stop();
        });
      },
      { threshold: 0.05 }
    );

    document.fonts.ready.then(() => {
      if (disposed) return;
      resize();
      ro.observe(wrap);
      io.observe(wrap);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseout", onLeave);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      rt?.dispose();
      geo.dispose();
      particleMat.dispose();
      asciiMat.dispose();
      asciiTexture.dispose();
      gpuRef.dispose();
      r3.dispose();
    };
  }, [text]);

  const titleLines = title ? title.split("\n") : [];

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden"
      style={{ height: "100svh", background: "#000000", fontFamily: "var(--font-sans)" }}
    >
      {/* c-logo: GPGPU 粒子 → ASCII 后处理, 铺满 */}
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />

      {/* 底部 grid: 左标题 + 右描述 (对照 c-hero 的 .grid-w.bottom-margin) */}
      {(title || description) && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 w-full"
          style={{ padding: `0 ${padX}px ${padX}px` }}
        >
          <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            {title && (
              <div className="pointer-events-auto select-none">
                {titleLines.map((line, i) => (
                  <ScrambleText
                    key={i}
                    text={line}
                    stagger={30}
                    style={{
                      display: "block",
                      fontSize: "clamp(26px, 3.4vw, 48px)",
                      fontWeight: 700,
                      lineHeight: 1.04,
                      letterSpacing: "-0.01em",
                      textTransform: "uppercase",
                      color: "#fff",
                    }}
                  />
                ))}
              </div>
            )}
            {description && (
              <ScrambleText
                text={description}
                stagger={8}
                className="pointer-events-auto t-body select-none"
                style={{
                  display: "block",
                  maxWidth: "min(440px, 42vw)",
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.7)",
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* a11y / SEO: 真实标题 */}
      <h2 className="sr-only">{text}</h2>
    </div>
  );
}

/* ============================================================
 * ScrambleText —— ① 进入视口逐字解码 (源 effects.shuffle)
 *                  ② hover 逐字乱码     (源 effects.shuffleChar)
 *   两套字形集均与 artefakt 源码一致。
 * ============================================================ */
const ENTRANCE_GLYPHS = "abcdefghijklmnopqrstuvwxyz!@#$%^&*-_+=;:<>,".split("");
const HOVER_GLYPHS = "!@#$%&*FKT_".split("");
const pick = (arr: string[]) => arr[(Math.random() * arr.length) | 0];

export function ScrambleText({
  text,
  className,
  style,
  stagger = 40,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  stagger?: number;
}) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const decodedRef = useRef(false);
  const startedRef = useRef(false);
  const chars = Array.from(text);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const spans = charRefs.current;
    decodedRef.current = false;
    startedRef.current = false;

    spans.forEach((s) => {
      if (s && s.dataset.char !== " ") s.textContent = pick(ENTRANCE_GLYPHS);
    });

    const decodeChar = (span: HTMLSpanElement, real: string, duration = 420) => {
      const interval = 32;
      let elapsed = 0;
      const id = window.setInterval(() => {
        elapsed += interval;
        if (elapsed >= duration) {
          window.clearInterval(id);
          span.textContent = real;
          delete span.dataset.busy;
        } else {
          span.textContent = pick(ENTRANCE_GLYPHS);
        }
      }, interval);
      span.dataset.busy = String(id);
    };

    const run = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      spans.forEach((s, i) => {
        if (!s) return;
        const real = s.dataset.char ?? "";
        if (real === " ") return;
        window.setTimeout(() => decodeChar(s, real), i * stagger);
      });
      window.setTimeout(() => {
        decodedRef.current = true;
      }, spans.length * stagger + 480);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run();
            io.disconnect();
          }
        });
      },
      { threshold: 0.6 }
    );
    io.observe(root);

    return () => {
      io.disconnect();
      spans.forEach((s) => {
        if (s?.dataset.busy) window.clearInterval(Number(s.dataset.busy));
      });
    };
  }, [text, stagger]);

  const handleEnter = (index: number) => {
    if (!decodedRef.current) return;
    const span = charRefs.current[index];
    if (!span || span.dataset.char === " " || span.dataset.busy) return;
    const real = span.dataset.char ?? "";
    const interval = 30;
    const duration = 300;
    let elapsed = 0;
    const id = window.setInterval(() => {
      elapsed += interval;
      if (elapsed >= duration) {
        window.clearInterval(id);
        span.textContent = real;
        delete span.dataset.busy;
      } else {
        span.textContent = pick(HOVER_GLYPHS);
      }
    }, interval);
    span.dataset.busy = String(id);
  };

  return (
    <span ref={rootRef} className={className} style={style}>
      {chars.map((ch, i) => {
        const isSpace = ch === " ";
        return (
          <span
            key={i}
            ref={(el) => {
              charRefs.current[i] = el;
            }}
            data-char={ch}
            onMouseEnter={isSpace ? undefined : () => handleEnter(i)}
            style={isSpace ? undefined : { display: "inline-block" }}
          >
            {isSpace ? " " : ch}
          </span>
        );
      })}
    </span>
  );
}
