import React from 'react';

export default function ThreeHeroCanvas() {
  return (
    <div className="hx-hero-scene" role="img" aria-label="HelzerX original HX logo in animated metallic 3D">
      <div className="hx-logo-stage">
        <svg className="hx-logo-svg" viewBox="0 0 800 500" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="hxMetalFace" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#eaf6ff" />
              <stop offset=".2" stopColor="#9cacc0" />
              <stop offset=".43" stopColor="#30394b" />
              <stop offset=".63" stopColor="#7f8ca5" />
              <stop offset=".82" stopColor="#343244" />
              <stop offset="1" stopColor="#d8a85f" />
            </linearGradient>
            <linearGradient id="hxMetalEdge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d9efff" />
              <stop offset=".48" stopColor="#a99aff" />
              <stop offset=".76" stopColor="#6c70a9" />
              <stop offset="1" stopColor="#f4c879" />
            </linearGradient>
            <linearGradient id="hxMetalSheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity=".42" />
              <stop offset=".25" stopColor="#c4e4ff" stopOpacity=".08" />
              <stop offset=".65" stopColor="#c7aaff" stopOpacity=".1" />
              <stop offset="1" stopColor="#ffdaa0" stopOpacity=".3" />
            </linearGradient>
          </defs>
          {/* Extruded rear face adds depth without changing the original silhouette. */}
          <g className="hx-logo-extrusion" transform="translate(0 12)" fill="#080a10" stroke="#151b29" strokeWidth="10" strokeLinejoin="round">
            <path d="M174 115 Q174 82 207 82 H218 Q251 82 251 115 V177 H367 Q389 177 405 193 L424 212 L405 231 Q389 247 367 247 H251 V328 Q251 361 218 361 H207 Q174 361 174 328 Z" />
            <path d="M338 357 Q328 357 334 347 L510 94 Q520 78 539 78 H577 Q596 78 585 96 L417 346 Q409 357 391 357 Z" />
          </g>
          {/* Original H-arrow + rising slash geometry; only the material is stylized. */}
          <g className="hx-logo-face" fill="url(#hxMetalFace)" stroke="url(#hxMetalEdge)" strokeWidth="3.5" strokeLinejoin="round">
            <path d="M174 103 Q174 70 207 70 H218 Q251 70 251 103 V165 H367 Q389 165 405 181 L424 200 L405 219 Q389 235 367 235 H251 V316 Q251 349 218 349 H207 Q174 349 174 316 Z" />
            <path d="M338 345 Q328 345 334 335 L510 82 Q520 66 539 66 H577 Q596 66 585 84 L417 334 Q409 345 391 345 Z" />
          </g>
          <g className="hx-logo-sheen" fill="url(#hxMetalSheen)" stroke="none">
            <path d="M174 103 Q174 70 207 70 H218 Q251 70 251 103 V165 H367 Q389 165 405 181 L424 200 L405 219 Q389 235 367 235 H251 V316 Q251 349 218 349 H207 Q174 349 174 316 Z" />
            <path d="M338 345 Q328 345 334 335 L510 82 Q520 66 539 66 H577 Q596 66 585 84 L417 334 Q409 345 391 345 Z" />
          </g>
          <path className="hx-logo-highlight" d="M190 93 Q190 86 207 86 H218 Q235 86 235 103 V155 H365 Q382 155 396 170 M543 82 H574 L414 320" fill="none" stroke="#f0f8ff" strokeWidth="3.5" strokeLinecap="round" />
          <g className="hx-copyright" fill="none" stroke="url(#hxMetalEdge)" strokeWidth="5">
            <circle cx="641" cy="88" r="29" />
            <path d="M652 75 A16 16 0 1 0 652 101" strokeLinecap="round" />
          </g>
        </svg>
      </div>
    </div>
  );
}
