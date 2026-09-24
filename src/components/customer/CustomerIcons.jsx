import React from "react";

// Inline SVG icon + illustration set for the customer portal.
//
// Everything here is vector and inherits `currentColor`, which keeps the
// artwork sharp on any screen, themeable from the shared.css variables, and
// free of binary assets in the repo. The technician layout already draws its
// icons inline the same way.

const BASE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const PATHS = {
  snowflake: (
    <>
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="3.5" y1="7" x2="20.5" y2="17" />
      <line x1="20.5" y1="7" x2="3.5" y2="17" />
      <path d="M12 5.5 9.5 3.5M12 5.5l2.5-2M12 18.5 9.5 20.5M12 18.5l2.5 2" />
      <path d="M5.2 8 4.6 5.2M5.2 8l-2.8.6M18.8 16l.6 2.8M18.8 16l2.8-.6" />
      <path d="M18.8 8l.6-2.8M18.8 8l2.8.6M5.2 16l-.6 2.8M5.2 16l-2.8-.6" />
    </>
  ),
  droplet: (
    <>
      <path d="M12 2.7s6 6.4 6 10.5a6 6 0 0 1-12 0C6 9.1 12 2.7 12 2.7Z" />
      <path d="M9.4 13.6a2.6 2.6 0 0 0 2.6 2.6" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
      <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" />
    </>
  ),
  gauge: (
    <>
      <path d="M3.6 16a9 9 0 1 1 16.8 0" />
      <path d="M12 16l4.2-4.4" />
      <circle cx="12" cy="16" r="1.4" />
      <path d="M3.6 16h2M18.4 16h2M12 7v1.6" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z" />
  ),
  install: (
    <>
      <rect x="2.8" y="3.6" width="18.4" height="7" rx="2" />
      <path d="M6.4 7.6h8.2" />
      <path d="M12 13.4v6.4" />
      <path d="M9.2 17.2 12 20l2.8-2.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.6" width="18" height="16.4" rx="2" />
      <line x1="3" y1="9.6" x2="21" y2="9.6" />
      <line x1="8.2" y1="2.6" x2="8.2" y2="6.4" />
      <line x1="15.8" y1="2.6" x2="15.8" y2="6.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.2V12l3.4 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.5s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </>
  ),
  phone: (
    <path d="M6.3 3.5h3l1.5 3.8-1.9 1.4a11.4 11.4 0 0 0 5.4 5.4l1.4-1.9 3.8 1.5v3a1.8 1.8 0 0 1-2 1.8A15.8 15.8 0 0 1 4.5 5.5a1.8 1.8 0 0 1 1.8-2Z" />
  ),
  star: (
    <path d="M12 3.4l2.7 5.6 6.1.85-4.45 4.3 1.1 6.05L12 17.4l-5.45 2.8 1.1-6.05L3.2 9.85l6.1-.85Z" />
  ),
  check: <path d="M4.5 12.8l4.8 4.7L19.5 7" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.4l2.8 2.8L16.2 9.6" />
    </>
  ),
  chevronRight: <path d="M9.4 5.5l6.6 6.5-6.6 6.5" />,
  chevronLeft: <path d="M14.6 5.5 8 12l6.6 6.5" />,
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="3.8" />
      <path d="M4.8 20.4a7.4 7.4 0 0 1 14.4 0" />
    </>
  ),
  home: (
    <>
      <path d="M3.6 10.4 12 3.6l8.4 6.8v9a1.4 1.4 0 0 1-1.4 1.4H5a1.4 1.4 0 0 1-1.4-1.4Z" />
      <path d="M9.4 20.8v-6.4h5.2v6.4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8.6A6 6 0 0 0 6 8.6c0 6.4-2.6 8.2-2.6 8.2h17.2S18 15 18 8.6" />
      <path d="M13.7 20.2a2 2 0 0 1-3.4 0" />
    </>
  ),
  logout: (
    <>
      <path d="M9.8 20.4H5.6a1.8 1.8 0 0 1-1.8-1.8V5.4a1.8 1.8 0 0 1 1.8-1.8h4.2" />
      <path d="M15.6 16.4 20 12l-4.4-4.4M20 12H9.2" />
    </>
  ),
  menu: (
    <>
      <line x1="3.4" y1="6.4" x2="20.6" y2="6.4" />
      <line x1="3.4" y1="12" x2="20.6" y2="12" />
      <line x1="3.4" y1="17.6" x2="20.6" y2="17.6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.8 20 6v6c0 4.9-3.4 8.3-8 9.2-4.6-.9-8-4.3-8-9.2V6Z" />
      <path d="M8.8 12.2l2.3 2.3 4.1-4.4" />
    </>
  ),
  receipt: (
    <>
      <path d="M5.4 3.4h13.2v17.2l-2.2-1.5-2.2 1.5-2.2-1.5-2.2 1.5-2.2-1.5-2.2 1.5Z" />
      <path d="M8.8 8h6.4M8.8 12h6.4" />
    </>
  ),
  tag: (
    <>
      <path d="M20.4 12.6 12.6 20.4a1.8 1.8 0 0 1-2.6 0L3.4 13.8V3.4h10.4l6.6 6.6a1.8 1.8 0 0 1 0 2.6Z" />
      <circle cx="8" cy="8" r="1.5" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M4.6 12h14.8" />
      <path d="M14.4 7l5 5-5 5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.6 21.2 19.4H2.8Z" />
      <path d="M12 9.6v4.2M12 16.8v.1" />
    </>
  ),
  history: (
    <>
      <path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1" />
      <path d="M3.4 4.2v4.2h4.2" />
      <path d="M12 8.2V12l3 1.8" />
    </>
  ),
  grid: (
    <>
      <rect x="3.6" y="3.6" width="7" height="7" rx="1.4" />
      <rect x="13.4" y="3.6" width="7" height="7" rx="1.4" />
      <rect x="3.6" y="13.4" width="7" height="7" rx="1.4" />
      <rect x="13.4" y="13.4" width="7" height="7" rx="1.4" />
    </>
  ),
};

/**
 * Single-line icon. `name` must be a key of PATHS; anything else renders
 * nothing rather than an empty box, so a typo degrades quietly.
 */
export function Icon({ name, size = 18, strokeWidth, className, style, title }) {
  const path = PATHS[name];
  if (!path) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...BASE}
      strokeWidth={strokeWidth ?? BASE.strokeWidth}
    >
      {title ? <title>{title}</title> : null}
      {path}
    </svg>
  );
}

/** Brand lockup used in the sidebar and the mobile drawer header. */
export function CoolAirLogo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="cust-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00b8d9" />
          <stop offset="100%" stopColor="#2e6ff2" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="37" height="37" rx="10" fill="url(#cust-logo-grad)" />
      <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none">
        <line x1="20" y1="9" x2="20" y2="31" />
        <line x1="10.5" y1="14.5" x2="29.5" y2="25.5" />
        <line x1="29.5" y1="14.5" x2="10.5" y2="25.5" />
        <path d="M20 13.2 17.6 11M20 13.2l2.4-2.2M20 26.8 17.6 29M20 26.8l2.4 2.2" />
      </g>
    </svg>
  );
}

/**
 * Wall-mounted split unit illustration with airflow.
 * `tone` shifts the airflow colour so the same drawing can read as healthy
 * (cyan) or as needing attention (amber) on the unit cards.
 */
export function AirconUnitArt({ width = 220, tone = "cool" }) {
  const FLOW_BY_TONE = { cool: "#00b8d9", warn: "#b7791f", alert: "#d64545" };
  const flow = FLOW_BY_TONE[tone] || FLOW_BY_TONE.cool;
  const gradId = `cust-unit-${tone}`;

  return (
    <svg
      width={width}
      viewBox="0 0 220 132"
      aria-hidden="true"
      style={{ display: "block", maxWidth: "100%" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dce4ee" />
        </linearGradient>
      </defs>

      {/* wall bracket shadow */}
      <rect x="24" y="30" width="172" height="34" rx="7" fill="#c3ccd8" opacity="0.5" />

      {/* unit body */}
      <rect
        x="20"
        y="22"
        width="172"
        height="38"
        rx="7"
        fill={`url(#${gradId})`}
        stroke="#aab6c6"
        strokeWidth="1.5"
      />

      {/* louvre / outlet vent */}
      <rect x="32" y="49" width="148" height="7" rx="3.5" fill="#8f9dae" />
      <g stroke="#ffffff" strokeWidth="1" opacity="0.55">
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={i} x1={40 + i * 10} y1="50" x2={40 + i * 10} y2="55" />
        ))}
      </g>

      {/* status light + brand notch */}
      <circle cx="176" cy="34" r="3" fill={flow} />
      <rect x="32" y="30" width="26" height="4" rx="2" fill="#c3ccd8" />

      {/* airflow streams */}
      <g stroke={flow} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.75">
        <path d="M58 72c10 8 22 8 32 0s22-8 32 0" />
        <path d="M70 90c9 7 20 7 29 0s20-7 29 0" opacity="0.6" />
        <path d="M84 107c8 6 17 6 25 0s17-6 25 0" opacity="0.4" />
      </g>

      {/* drifting snowflakes */}
      <g stroke={flow} strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
        <g transform="translate(150 78)">
          <line x1="0" y1="-5" x2="0" y2="5" />
          <line x1="-4.3" y1="-2.5" x2="4.3" y2="2.5" />
          <line x1="4.3" y1="-2.5" x2="-4.3" y2="2.5" />
        </g>
        <g transform="translate(168 100)" opacity="0.6">
          <line x1="0" y1="-3.6" x2="0" y2="3.6" />
          <line x1="-3.1" y1="-1.8" x2="3.1" y2="1.8" />
          <line x1="3.1" y1="-1.8" x2="-3.1" y2="1.8" />
        </g>
        <g transform="translate(44 96)" opacity="0.5">
          <line x1="0" y1="-4" x2="0" y2="4" />
          <line x1="-3.5" y1="-2" x2="3.5" y2="2" />
          <line x1="3.5" y1="-2" x2="-3.5" y2="2" />
        </g>
      </g>
    </svg>
  );
}

/**
 * Circular condition meter for a unit's health score.
 * The arc is drawn with a dash offset so no animation library is needed.
 */
export function HealthRing({ value = 0, size = 72, tone = "success" }) {
  const palette = { success: "#1b8a5a", warning: "#b7791f", danger: "#d64545" };
  const stroke = palette[tone] || palette.success;
  const radius = (size - 9) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(Math.max(value, 0), 100) / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e3e9f0"
        strokeWidth="6"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={stroke}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'IBM Plex Mono', monospace"
        fontSize={size * 0.26}
        fontWeight="600"
        fill="#101828"
      >
        {value}
      </text>
    </svg>
  );
}

/** Tiled snowflake wash that sits behind the dashboard and catalog banners. */
export function SnowfieldBackdrop() {
  return (
    <svg className="cust-backdrop" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="cust-snow-tile" width="72" height="72" patternUnits="userSpaceOnUse">
          <g stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" opacity="0.5">
            <g transform="translate(18 18)">
              <line x1="0" y1="-8" x2="0" y2="8" />
              <line x1="-7" y1="-4" x2="7" y2="4" />
              <line x1="7" y1="-4" x2="-7" y2="4" />
            </g>
            <g transform="translate(54 50) scale(0.62)">
              <line x1="0" y1="-8" x2="0" y2="8" />
              <line x1="-7" y1="-4" x2="7" y2="4" />
              <line x1="7" y1="-4" x2="-7" y2="4" />
            </g>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cust-snow-tile)" />
    </svg>
  );
}

/** Placeholder drawing for lists with nothing in them yet. */
export function EmptyStateArt({ width = 148 }) {
  return (
    <svg width={width} viewBox="0 0 148 104" aria-hidden="true" style={{ maxWidth: "100%" }}>
      <ellipse cx="74" cy="92" rx="46" ry="6" fill="#d8dee6" opacity="0.7" />
      <rect
        x="30"
        y="30"
        width="88"
        height="24"
        rx="5"
        fill="#ffffff"
        stroke="#c3ccd8"
        strokeWidth="1.5"
      />
      <rect x="38" y="46" width="72" height="5" rx="2.5" fill="#c3ccd8" />
      <circle cx="108" cy="38" r="2.4" fill="#00b8d9" opacity="0.8" />
      <g stroke="#c3ccd8" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M52 66c7 5 14 5 21 0s14-5 21 0" />
        <path d="M60 80c6 4 12 4 18 0" opacity="0.6" />
      </g>
    </svg>
  );
}
