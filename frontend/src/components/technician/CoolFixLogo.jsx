import React from 'react'

/**
 * Original Cool Fix brand mark: an open cooling ring paired with a compact
 * snowflake. The SVG stays crisp at sidebar and mobile-header sizes.
 */
function CoolFixLogo({ className = '' }) {
  return (
    <span className={`cool-fix-logo ${className}`.trim()}>
      <svg
        className="cool-fix-logo-mark"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="11" fill="currentColor" />
        <path
          d="M27.2 12.7a10.2 10.2 0 1 0 0 14.6"
          stroke="white"
          strokeWidth="2.7"
          strokeLinecap="round"
        />
        <g className="cool-fix-logo-snow" strokeWidth="1.8" strokeLinecap="round">
          <path d="M28.2 15.8v8.4M24 20h8.4M25.2 17l6 6M31.2 17l-6 6" />
        </g>
      </svg>
      <span className="cool-fix-wordmark">Cool Fix</span>
    </span>
  )
}

export default CoolFixLogo
