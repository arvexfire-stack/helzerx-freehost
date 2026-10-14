import React from 'react';

export default function ThreeHeroCanvas() {
  return (
    <div className="hx-hero-scene" role="img" aria-label="Original HelzerX HX emblem">
      <div className="hx-logo-stage">
        <svg className="hx-logo-svg" viewBox="0 0 640 360" aria-hidden="true">
          <defs>
            <linearGradient id="hxMetal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e4f3ff" />
              <stop offset=".18" stopColor="#72849b" />
              <stop offset=".42" stopColor="#1a202b" />
              <stop offset=".62" stopColor="#8293aa" />
              <stop offset=".82" stopColor="#282838" />
              <stop offset="1" stopColor="#f3bd70" />
            </linearGradient>
            <linearGradient id="hxRim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d9efff" />
              <stop offset=".48" stopColor="#8b7ce2" />
              <stop offset=".75" stopColor="#c2a5ff" />
              <stop offset="1" stopColor="#f7c36f" />
            </linearGradient>
            <linearGradient id="hxSheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity=".32" />
              <stop offset=".32" stopColor="#a7caff" stopOpacity=".04" />
              <stop offset=".7" stopColor="#c1a0ff" stopOpacity=".12" />
              <stop offset="1" stopColor="#ffd58b" stopOpacity=".3" />
            </linearGradient>
          </defs>
          <g className="hx-logo-extrusion" transform="translate(0 13)" fill="#07090f" stroke="#222b3a" strokeWidth="13" strokeLinejoin="round">
            <path d="M95 78 Q95 58 116 58 H164 Q184 58 184 79 V143 H325 L362 180 L325 217 H184 V282 Q184 303 163 303 H116 Q95 303 95 282 Z" />
            <path d="M254 294 L326 294 L492 68 Q505 48 484 48 H445 Q431 48 421 63 Z" />
          </g>
          <g className="hx-logo-face" fill="url(#hxMetal)" stroke="url(#hxRim)" strokeWidth="3.5" strokeLinejoin="round">
            <path d="M95 66 Q95 46 116 46 H164 Q184 46 184 67 V131 H325 L362 168 L325 205 H184 V270 Q184 291 163 291 H116 Q95 291 95 270 Z" />
            <path d="M254 281 L326 281 L492 55 Q505 35 484 35 H445 Q431 35 421 50 Z" />
          </g>
          <g fill="url(#hxSheen)" stroke="none">
            <path d="M95 66 Q95 46 116 46 H164 Q184 46 184 67 V131 H325 L362 168 L325 205 H184 V270 Q184 291 163 291 H116 Q95 291 95 270 Z" />
            <path d="M254 281 L326 281 L492 55 Q505 35 484 35 H445 Q431 35 421 50 Z" />
          </g>
          <path className="hx-logo-highlight" d="M113 62 H158 Q166 62 166 73 V124 M444 48 H481 L329 260" fill="none" stroke="#eef8ff" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
