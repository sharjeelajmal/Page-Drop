import { useId } from "react";

/**
 * "Deploy" scene for the sign-in page, drawn entirely in one SVG so every
 * card, connector and the server stack share one coordinate system and stay
 * aligned at any size. Layout (viewBox 760 x 400):
 *
 *   [build log card]      (cloud ↑)      [live traffic card]
 *          └──── connector ── [server stack] ── connector ────┘
 */

const W = 760;
const H = 400;
const CX = 380; // stack centre
const HALF_W = 108;
const HALF_H = 52;
const THICK = 28;
const GAP = 12;
const STACK_TOP = 150;

// Cards
const LOG = { x: 16, y: 150, w: 210, h: 116 };
const LIVE = { x: 534, y: 52, w: 210, h: 128 };

// Ports on the stack (left/right vertices of each slab).
const slabY = (level: number) => STACK_TOP + level * (THICK + GAP);
const leftPort = (level: number) => ({ x: CX - HALF_W, y: slabY(level) + HALF_H + THICK / 2 });
const rightPort = (level: number) => ({ x: CX + HALF_W, y: slabY(level) + HALF_H + THICK / 2 });

const r = 8; // connector corner radius
const L1 = leftPort(1);
const R1 = rightPort(1);
const R2 = rightPort(2);
const LOG_OUT = { x: LOG.x + LOG.w, y: LOG.y + LOG.h / 2 };
const LIVE_LEFT = { x: LIVE.x, y: LIVE.y + LIVE.h / 2 };
const LIVE_BOTTOM = { x: LIVE.x + LIVE.w / 2, y: LIVE.y + LIVE.h };

const CONNECTORS = [
  // log card → stack (left)
  `M ${LOG_OUT.x} ${LOG_OUT.y} H ${L1.x - 26 - r} Q ${L1.x - 26} ${LOG_OUT.y} ${L1.x - 26} ${LOG_OUT.y + r} V ${L1.y - r} Q ${L1.x - 26} ${L1.y} ${L1.x - 26 + r} ${L1.y} H ${L1.x}`,
  // live card (left edge) → stack (right, middle slab)
  `M ${LIVE_LEFT.x} ${LIVE_LEFT.y} H ${R1.x + 26 + r} Q ${R1.x + 26} ${LIVE_LEFT.y} ${R1.x + 26} ${LIVE_LEFT.y + r} V ${R1.y - r} Q ${R1.x + 26} ${R1.y} ${R1.x + 26 - r} ${R1.y} H ${R1.x}`,
  // live card (bottom) → stack (right, bottom slab)
  `M ${LIVE_BOTTOM.x} ${LIVE_BOTTOM.y} V ${R2.y - r} Q ${LIVE_BOTTOM.x} ${R2.y} ${LIVE_BOTTOM.x - r} ${R2.y} H ${R2.x}`,
];
const PORTS = [LOG_OUT, L1, LIVE_LEFT, R1, LIVE_BOTTOM, R2];

const SPARK = "M 0 52 C 18 50, 28 32, 46 36 S 70 58, 92 42 S 120 6, 142 14 S 166 26, 178 22";

export function LoginIllustration() {
  const id = useId().replace(/:/g, "");
  const url = (name: string) => `url(#${id}-${name})`;
  const topFaceY = STACK_TOP + HALF_H;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full overflow-visible select-none"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-floor`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#3b82f6" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#1d4ed8" stopOpacity="0.12" />
          <stop offset="1" stopColor="#1e1b4b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="1" stopColor="#172554" />
        </linearGradient>
        <linearGradient id={`${id}-left`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e40af" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id={`${id}-right`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#172554" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <linearGradient id={`${id}-cloud`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#93c5fd" />
          <stop offset="0.5" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id={`${id}-arrow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#bfdbfe" />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#60a5fa" stopOpacity="0.85" />
          <stop offset="1" stopColor="#60a5fa" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-card`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13204f" stopOpacity="0.92" />
          <stop offset="1" stopColor="#0b1336" stopOpacity="0.92" />
        </linearGradient>
        <linearGradient id={`${id}-spark`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id={`${id}-spark-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <pattern id={`${id}-grid`} width="40" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 10 L20 0 L40 10 L20 20 Z" fill="none" stroke="#60a5fa" strokeOpacity="0.2" strokeWidth="0.8" />
        </pattern>
        <radialGradient id={`${id}-fade`} cx="50%" cy="50%" r="50%">
          <stop offset="0.2" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-floor-mask`}>
          <ellipse cx={CX} cy="340" rx="370" ry="100" fill={url("fade")} />
        </mask>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id={`${id}-card-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#3b82f6" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Floor */}
      <rect x="0" y="230" width={W} height="170" fill={url("grid")} mask={url("floor-mask")} />
      <ellipse cx={CX} cy="352" rx="200" ry="56" fill={url("floor")} />

      {/* Connectors with travelling packets */}
      {CONNECTORS.map((d, i) => (
        <g key={d}>
          <path d={d} fill="none" stroke="#38bdf8" strokeOpacity="0.6" strokeWidth="2" strokeLinejoin="round" filter={url("glow")} />
          <circle r="3.5" fill="#bae6fd" filter={url("glow")}>
            <animateMotion dur={`${2.8 + i * 0.6}s`} begin={`${i * 0.5}s`} repeatCount="indefinite" path={d} />
          </circle>
        </g>
      ))}
      {PORTS.map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r="4" fill="#38bdf8" filter={url("glow")} />
      ))}

      {/* Server stack, drawn bottom slab first */}
      {[2, 1, 0].map((level) => {
        const y = slabY(level);
        const top = `${CX},${y} ${CX + HALF_W},${y + HALF_H} ${CX},${y + 2 * HALF_H} ${CX - HALF_W},${y + HALF_H}`;
        const left = `${CX - HALF_W},${y + HALF_H} ${CX},${y + 2 * HALF_H} ${CX},${y + 2 * HALF_H + THICK} ${CX - HALF_W},${y + HALF_H + THICK}`;
        const right = `${CX + HALF_W},${y + HALF_H} ${CX},${y + 2 * HALF_H} ${CX},${y + 2 * HALF_H + THICK} ${CX + HALF_W},${y + HALF_H + THICK}`;
        return (
          <g key={level}>
            <polygon points={left} fill={url("left")} stroke="#60a5fa" strokeOpacity="0.5" strokeWidth="1" />
            <polygon points={right} fill={url("right")} stroke="#60a5fa" strokeOpacity="0.35" strokeWidth="1" />
            <polygon points={top} fill={url("top")} stroke="#93c5fd" strokeOpacity="0.85" strokeWidth="1.2" filter={url("glow")} />
            <line
              x1={CX - HALF_W + 16}
              y1={y + HALF_H + 16}
              x2={CX - 28}
              y2={y + 2 * HALF_H - 14 + 16}
              stroke="#93c5fd"
              strokeWidth="3"
              strokeLinecap="round"
              filter={url("glow")}
            />
            {[0, 1, 2].map((led) => (
              <circle
                key={led}
                cx={CX + 20 + led * 14}
                cy={y + 2 * HALF_H + 12 - led * 6.5}
                r="2.5"
                fill="#7dd3fc"
                className="login-led"
                style={{ animationDelay: `${(level * 3 + led) * 0.25}s` }}
              />
            ))}
          </g>
        );
      })}

      {/* Pad + beam into the cloud */}
      <ellipse cx={CX} cy={topFaceY} rx="50" ry="24" fill="#3b82f6" opacity="0.5" filter={url("soft")} />
      <ellipse cx={CX} cy={topFaceY} rx="38" ry="18" fill="none" stroke="#bfdbfe" strokeWidth="2" filter={url("glow")} />
      <rect x={CX - 17} y="112" width="34" height={topFaceY - 112} fill={url("beam")} className="login-beam" />

      {/* Cloud + arrow */}
      <g className="login-cloud">
        <ellipse cx={CX} cy="78" rx="92" ry="56" fill="#3b82f6" opacity="0.35" filter={url("soft")} />
        <path
          d={`M${CX - 66} 120 a32 32 0 0 1 4 -63 a46 46 0 0 1 86 -13 a38 38 0 0 1 55 34 a23 23 0 0 1 -6 42 Z`}
          fill={url("cloud")}
          stroke="#bfdbfe"
          strokeOpacity="0.8"
          strokeWidth="1.5"
          filter={url("glow")}
        />
        <g className="login-arrow">
          <path d={`M${CX} 46 l25 27 h-14 v32 h-22 v-32 h-14 Z`} fill={url("arrow")} filter={url("glow")} />
        </g>
      </g>

      {/* Build log card */}
      <g filter={url("card-shadow")}>
        <rect x={LOG.x} y={LOG.y} width={LOG.w} height={LOG.h} rx="14" fill={url("card")} stroke="#7dd3fc" strokeOpacity="0.3" />
      </g>
      {[0, 1, 2].map((dot) => (
        <circle key={dot} cx={LOG.x + 20 + dot * 11} cy={LOG.y + 20} r="3" fill="#bae6fd" fillOpacity="0.55" />
      ))}
      {["Building...", "Deploying...", "Live!"].map((text, i) => {
        const y = LOG.y + 50 + i * 24;
        return (
          <g key={text} className="login-log-line" style={{ animationDelay: `${0.6 + i * 0.7}s` }}>
            <circle cx={LOG.x + 26} cy={y - 4} r="7" fill="#34d399" />
            <path d={`M ${LOG.x + 22.5} ${y - 4} l 2.5 2.5 l 4.5 -5`} fill="none" stroke="#0b1336" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <text x={LOG.x + 42} y={y} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="13" fill="#e0f2fe">
              <tspan fill="#7dd3fc" fillOpacity="0.7">&gt; </tspan>
              {text}
            </text>
          </g>
        );
      })}

      {/* Live traffic card */}
      <g filter={url("card-shadow")}>
        <rect x={LIVE.x} y={LIVE.y} width={LIVE.w} height={LIVE.h} rx="14" fill={url("card")} stroke="#7dd3fc" strokeOpacity="0.3" />
      </g>
      <rect x={LIVE.x + 16} y={LIVE.y + 14} width="52" height="22" rx="7" fill="#34d399" fillOpacity="0.15" />
      <circle cx={LIVE.x + 28} cy={LIVE.y + 25} r="3.5" fill="#34d399" className="login-live-dot" />
      <text x={LIVE.x + 37} y={LIVE.y + 29.5} fontSize="12" fontWeight="600" fill="#6ee7b7" fontFamily="Inter, ui-sans-serif, sans-serif">
        Live
      </text>
      <g transform={`translate(${LIVE.x + 16} ${LIVE.y + 50})`}>
        <path d={`${SPARK} V 64 H 0 Z`} fill={url("spark-fill")} />
        <path d={SPARK} fill="none" stroke={url("spark")} strokeWidth="2.5" strokeLinecap="round" pathLength={1} className="login-spark" />
      </g>
    </svg>
  );
}
