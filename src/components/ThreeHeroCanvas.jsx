import React from 'react';

export default function ThreeHeroCanvas() {
  return (
    <div className="hx-hero-scene" role="img" aria-label="HelzerX HX logo">
      <div className="hx-logo-stage">
        <svg className="hx-logo-svg" viewBox="0 0 640 360" aria-hidden="true">
          <defs>
            <linearGradient id="hxMetal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#dceeff" />
              <stop offset=".2" stopColor="#687c99" />
              <stop offset=".42" stopColor="#171d2b" />
              <stop offset=".61" stopColor="#899bb5" />
              <stop offset=".8" stopColor="#262437" />
              <stop offset="1" stopColor="#f0b85f" />
            </linearGradient>
            <linearGradient id="hxEdge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d4f0ff" />
              <stop offset=".45" stopColor="#8d82df" />
              <stop offset=".72" stopColor="#d2b4ff" />
              <stop offset="1" stopColor="#f5bd67" />
            </linearGradient>
            <linearGradient id="hxFaceLight" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity=".5" />
              <stop offset=".28" stopColor="#9ccaff" stopOpacity=".08" />
              <stop offset=".65" stopColor="#b58cff" stopOpacity=".15" />
              <stop offset="1" stopColor="#ffc875" stopOpacity=".4" />
            </linearGradient>
            <filter id="hxSoftGlow" x="-45%" y="-45%" width="190%" height="190%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g className="hx-logo-extrusion" transform="translate(0 13)" fill="#080a12" stroke="#202b3e" strokeWidth="15" strokeLinejoin="round">
            <path d="M95 78 Q95 58 116 58 H164 Q184 58 184 79 V143 H325 L362 180 L325 217 H184 V282 Q184 303 163 303 H116 Q95 303 95 282 Z" />
            <path d="M393 66 Q400 56 416 56 H474 Q495 56 482 76 L377 180 L482 284 Q495 304 474 304 H416 Q402 304 393 294 L294 196 Q278 180 294 164 Z" />
          </g>
          <g className="hx-logo-face" stroke="url(#hxEdge)" strokeWidth="4" strokeLinejoin="round">
            <path d="M95 66 Q95 46 116 46 H164 Q184 46 184 67 V131 H325 L362 168 L325 205 H184 V270 Q184 291 163 291 H116 Q95 291 95 270 Z" fill="url(#hxMetal)" />
            <path d="M393 54 Q400 44 416 44 H474 Q495 44 482 64 L377 168 L482 272 Q495 292 474 292 H416 Q402 292 393 282 L294 184 Q278 168 294 152 Z" fill="url(#hxMetal)" />
            <path d="M95 66 Q95 46 116 46 H164 Q184 46 184 67 V131 H325 L362 168 L325 205 H184 V270 Q184 291 163 291 H116 Q95 291 95 270 Z M393 54 Q400 44 416 44 H474 Q495 44 482 64 L377 168 L482 272 Q495 292 474 292 H416 Q402 292 393 282 L294 184 Q278 168 294 152 Z" fill="url(#hxFaceLight)" stroke="none" />
          </g>
          <path className="hx-logo-highlight" d="M112 62 H158 Q166 62 166 73 V124 M414 58 H465 L366 159" fill="none" stroke="#eff8ff" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
