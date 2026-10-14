import React from 'react';

export default function ThreeHeroCanvas() {
  return (
    <div className="hx-hero-scene" role="img" aria-label="HelzerX HX emblem in animated metallic 3D">
      <div className="hx-scene-halo hx-halo-gold" />
      <div className="hx-scene-halo hx-halo-violet" />
      <div className="hx-orbit hx-orbit-one" />
      <div className="hx-orbit hx-orbit-two" />
      <div className="hx-logo-stage">
        <svg className="hx-logo-svg" viewBox="0 0 640 360" aria-hidden="true">
          <defs>
            <linearGradient id="hxMetal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f8fbff" />
              <stop offset=".18" stopColor="#64758b" />
              <stop offset=".38" stopColor="#172332" />
              <stop offset=".58" stopColor="#a9b8c9" />
              <stop offset=".76" stopColor="#303344" />
              <stop offset="1" stopColor="#f4b85d" />
            </linearGradient>
            <linearGradient id="hxEdge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#b9e7ff" />
              <stop offset=".48" stopColor="#7663c9" />
              <stop offset="1" stopColor="#f5b041" />
            </linearGradient>
            <filter id="hxGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g className="hx-logo-depth" transform="translate(0 12)" opacity=".5" fill="#06080d" stroke="#202b3b" strokeWidth="13" strokeLinejoin="round">
            <path d="M95 78 Q95 58 116 58 H164 Q184 58 184 79 V143 H325 L362 180 L325 217 H184 V282 Q184 303 163 303 H116 Q95 303 95 282 Z" />
            <path d="M393 66 Q400 56 416 56 H474 Q495 56 482 76 L377 180 L482 284 Q495 304 474 304 H416 Q402 304 393 294 L294 196 Q278 180 294 164 Z" />
          </g>
          <g className="hx-logo-face" stroke="url(#hxEdge)" strokeWidth="3" strokeLinejoin="round">
            <path d="M95 66 Q95 46 116 46 H164 Q184 46 184 67 V131 H325 L362 168 L325 205 H184 V270 Q184 291 163 291 H116 Q95 291 95 270 Z" fill="url(#hxMetal)" />
            <path d="M393 54 Q400 44 416 44 H474 Q495 44 482 64 L377 168 L482 272 Q495 292 474 292 H416 Q402 292 393 282 L294 184 Q278 168 294 152 Z" fill="url(#hxMetal)" />
          </g>
          <path className="hx-logo-glint" d="M112 63 H159 Q166 63 166 73 V125 M414 60 H465 L366 159" fill="none" stroke="#f5fbff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
        </svg>
        <div className="hx-logo-reflection" />
      </div>
      <div className="hx-scene-caption"><span /> HELZERX TECHNOLOGIES</div>
    </div>
  );
}
