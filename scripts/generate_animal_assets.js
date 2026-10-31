const puppeteer = require('./e2e/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_DIR = path.join(__dirname, '../admin/public/assets/games/spiral');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const SVGS = {
  lion: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1024" height="1024">
      <defs>
        <radialGradient id="lionAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.45"/>
          <stop offset="70%" stop-color="#d97706" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#d97706" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="maneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="35%" stop-color="#f59e0b"/>
          <stop offset="70%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
        <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="40%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
        <linearGradient id="muzzleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fef3c7"/>
          <stop offset="60%" stop-color="#fde68a"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- Golden Radiant Aura -->
      <circle cx="256" cy="256" r="230" fill="url(#lionAura)"/>

      <!-- Outer Volumetric Mane Tufts -->
      <g filter="url(#goldGlow)">
        <!-- 24 radiating flame-shaped mane spikes -->
        <path d="M256 30 L275 80 L315 50 L315 105 L360 85 L350 140 L405 130 L380 180 L440 185 L400 230 L455 256 L395 285 L445 325 L375 340 L410 390 L345 390 L365 445 L305 425 L300 480 L256 445 L212 480 L207 425 L147 445 L167 390 L102 390 L137 340 L67 325 L117 285 L57 256 L112 230 L72 185 L132 180 L107 130 L162 140 L152 85 L197 105 L197 50 L237 80 Z" fill="url(#maneGrad)" stroke="#fef08a" stroke-width="4"/>
      </g>

      <!-- Inner Volumetric Mane Layer -->
      <path d="M256 70 L280 120 L320 100 L325 150 L370 145 L355 195 L400 205 L370 250 L405 280 L350 305 L375 350 L320 355 L325 410 L275 395 L256 430 L237 395 L187 410 L192 355 L137 350 L162 305 L107 280 L142 250 L112 205 L157 195 L142 145 L187 150 L192 100 L232 120 Z" fill="#b45309" stroke="#fbbf24" stroke-width="3"/>

      <!-- Rounded Ears -->
      <path d="M140 160 C120 130, 160 100, 190 130 Z" fill="#d97706" stroke="#fef08a" stroke-width="4"/>
      <path d="M150 155 C135 135, 165 115, 180 135 Z" fill="#78350f"/>
      <path d="M372 160 C392 130, 352 100, 322 130 Z" fill="#d97706" stroke="#fef08a" stroke-width="4"/>
      <path d="M362 155 C377 135, 347 115, 332 135 Z" fill="#78350f"/>

      <!-- Cranium Face Plate -->
      <path d="M175 160 C175 110, 337 110, 337 160 C345 220, 330 270, 310 320 L256 370 L202 320 C182 270, 167 220, 175 160 Z" fill="url(#faceGrad)" stroke="#fef08a" stroke-width="5"/>

      <!-- Forehead Fur Ridges -->
      <path d="M226 150 L256 170 L286 150" fill="none" stroke="#78350f" stroke-width="5" stroke-linecap="round"/>
      <path d="M216 175 L256 200 L296 175" fill="none" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>

      <!-- Glowing Amber Eyes with Brow Tufts -->
      <path d="M185 200 Q215 185 235 210 Q215 220 185 200 Z" fill="#0f172a" stroke="#78350f" stroke-width="4"/>
      <circle cx="210" cy="205" r="10" fill="#fef08a"/>
      <circle cx="210" cy="205" r="5" fill="#000000"/>
      <circle cx="213" cy="202" r="2.5" fill="#ffffff"/>

      <path d="M327 200 Q297 185 277 210 Q297 220 327 200 Z" fill="#0f172a" stroke="#78350f" stroke-width="4"/>
      <circle cx="302" cy="205" r="10" fill="#fef08a"/>
      <circle cx="302" cy="205" r="5" fill="#000000"/>
      <circle cx="299" cy="202" r="2.5" fill="#ffffff"/>

      <!-- Broad Snout / Muzzle -->
      <path d="M256 230 C210 230, 200 280, 205 320 C210 345, 235 355, 256 355 C277 355, 302 345, 307 320 C312 280, 302 230, 256 230 Z" fill="url(#muzzleGrad)" stroke="#b45309" stroke-width="4"/>

      <!-- Black Nose Pad -->
      <path d="M236 260 L276 260 C282 260, 286 268, 280 274 L260 298 C258 300, 254 300, 252 298 L232 274 C226 268, 230 260, 236 260 Z" fill="#18181b"/>
      <circle cx="245" cy="270" r="3" fill="#ffffff" opacity="0.4"/>

      <!-- Mouth Seam & Whisker Spots -->
      <path d="M256 298 L256 322" stroke="#18181b" stroke-width="4"/>
      <path d="M225 322 Q256 335 287 322" fill="none" stroke="#18181b" stroke-width="4"/>
      <circle cx="225" cy="295" r="2.5" fill="#78350f"/>
      <circle cx="235" cy="305" r="2.5" fill="#78350f"/>
      <circle cx="220" cy="310" r="2.5" fill="#78350f"/>
      <circle cx="287" cy="295" r="2.5" fill="#78350f"/>
      <circle cx="277" cy="305" r="2.5" fill="#78350f"/>
      <circle cx="292" cy="310" r="2.5" fill="#78350f"/>

      <!-- Chin Beard -->
      <path d="M236 355 Q256 395 276 355 Z" fill="#b45309" stroke="#f59e0b" stroke-width="3"/>
    </svg>
  `,

  elephant: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1024" height="1024">
      <defs>
        <radialGradient id="eleAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45"/>
          <stop offset="70%" stop-color="#0284c7" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="eleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#cbd5e1"/>
          <stop offset="40%" stop-color="#64748b"/>
          <stop offset="80%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
        <linearGradient id="earInner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="60%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
        <linearGradient id="tuskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="60%" stop-color="#fef3c7"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
        <filter id="eleGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- Radiant Blue Aura -->
      <circle cx="256" cy="256" r="230" fill="url(#eleAura)"/>

      <!-- Large Broad Elephant Ears -->
      <g filter="url(#eleGlow)">
        <!-- Left Ear -->
        <path d="M210 140 C140 70, 30 110, 40 230 C45 320, 130 360, 205 320 Z" fill="url(#eleGrad)" stroke="#38bdf8" stroke-width="6"/>
        <path d="M190 155 C140 105, 60 135, 70 230 C75 300, 140 330, 190 295 Z" fill="url(#earInner)"/>

        <!-- Right Ear -->
        <path d="M302 140 C372 70, 482 110, 472 230 C467 320, 382 360, 307 320 Z" fill="url(#eleGrad)" stroke="#38bdf8" stroke-width="6"/>
        <path d="M322 155 C372 105, 452 135, 442 230 C437 300, 372 330, 322 295 Z" fill="url(#earInner)"/>
      </g>

      <!-- Ivory Tusks Behind Trunk -->
      <!-- Left Tusk -->
      <path d="M215 320 C185 360, 140 405, 120 400 C110 398, 120 380, 150 345 C175 315, 205 295, 220 300 Z" fill="url(#tuskGrad)" stroke="#fef08a" stroke-width="3"/>
      <!-- Right Tusk -->
      <path d="M297 320 C327 360, 372 405, 392 400 C402 398, 392 380, 362 345 C337 315, 307 295, 292 300 Z" fill="url(#tuskGrad)" stroke="#fef08a" stroke-width="3"/>

      <!-- Massive Cranium -->
      <path d="M185 140 C185 75, 327 75, 327 140 C340 185, 335 240, 320 280 L256 300 L192 280 C177 240, 172 185, 185 140 Z" fill="url(#eleGrad)" stroke="#38bdf8" stroke-width="5"/>

      <!-- Temporal Head Dome Lobes -->
      <circle cx="220" cy="120" r="28" fill="#94a3b8" opacity="0.3"/>
      <circle cx="292" cy="120" r="28" fill="#94a3b8" opacity="0.3"/>

      <!-- Piercing Eyes with Brow Folds -->
      <path d="M195 195 Q220 180, 235 200" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>
      <circle cx="218" cy="202" r="8" fill="#38bdf8"/>
      <circle cx="218" cy="202" r="4" fill="#000000"/>
      <circle cx="220" cy="200" r="2" fill="#ffffff"/>

      <path d="M317 195 Q292 180, 277 200" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>
      <circle cx="294" cy="202" r="8" fill="#38bdf8"/>
      <circle cx="294" cy="202" r="4" fill="#000000"/>
      <circle cx="292" cy="200" r="2" fill="#ffffff"/>

      <!-- Long Curved Trunk with Wrinkles -->
      <path d="M228 260 C228 320, 235 370, 235 410 C235 450, 255 470, 280 470 C305 470, 310 445, 300 425 C290 405, 275 415, 275 425 C275 435, 265 440, 255 435 C245 425, 255 370, 255 330 C255 290, 270 270, 284 260 Z" fill="url(#eleGrad)" stroke="#38bdf8" stroke-width="4"/>

      <!-- Trunk Rings / Wrinkles -->
      <path d="M236 295 Q256 305, 276 295" fill="none" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
      <path d="M238 335 Q256 345, 274 335" fill="none" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
      <path d="M240 375 Q256 385, 272 375" fill="none" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
      <path d="M245 410 Q258 418, 275 412" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `,

  dog: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1024" height="1024">
      <defs>
        <radialGradient id="dogAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.45"/>
          <stop offset="70%" stop-color="#d97706" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#d97706" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="dogGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="45%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
        <linearGradient id="snoutGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fef3c7"/>
          <stop offset="50%" stop-color="#fde68a"/>
          <stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
        <filter id="dogGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- Radiant Amber Aura -->
      <circle cx="256" cy="256" r="230" fill="url(#dogAura)"/>

      <!-- Upright Pointed Hound Ears -->
      <g filter="url(#dogGlow)">
        <!-- Left Ear -->
        <path d="M150 190 L110 50 L205 130 Z" fill="url(#dogGrad)" stroke="#fef08a" stroke-width="5"/>
        <path d="M145 175 L125 75 L190 135 Z" fill="#78350f"/>

        <!-- Right Ear -->
        <path d="M362 190 L402 50 L307 130 Z" fill="url(#dogGrad)" stroke="#fef08a" stroke-width="5"/>
        <path d="M367 175 L387 75 L322 135 Z" fill="#78350f"/>
      </g>

      <!-- Cranium Skull -->
      <path d="M175 160 C175 100, 337 100, 337 160 C345 220, 335 270, 320 310 L256 345 L192 310 C177 270, 167 220, 175 160 Z" fill="url(#dogGrad)" stroke="#fef08a" stroke-width="5"/>

      <!-- Forehead Fur Markings -->
      <path d="M256 120 L256 210" stroke="#fef3c7" stroke-width="12" stroke-linecap="round" opacity="0.6"/>

      <!-- Alert Golden Eyes with Brow Ridge -->
      <path d="M195 200 Q220 185, 235 205 Q220 215, 195 200 Z" fill="#18181b" stroke="#78350f" stroke-width="4"/>
      <circle cx="216" cy="202" r="9" fill="#fbbf24"/>
      <circle cx="216" cy="202" r="5" fill="#000000"/>
      <circle cx="218" cy="200" r="2.5" fill="#ffffff"/>

      <path d="M317 200 Q292 185, 277 205 Q292 215, 317 200 Z" fill="#18181b" stroke="#78350f" stroke-width="4"/>
      <circle cx="296" cy="202" r="9" fill="#fbbf24"/>
      <circle cx="296" cy="202" r="5" fill="#000000"/>
      <circle cx="294" cy="200" r="2.5" fill="#ffffff"/>

      <!-- Elongated Canine Snout & Muzzle -->
      <path d="M210 240 L302 240 L295 350 C295 375, 217 375, 217 350 Z" fill="url(#snoutGrad)" stroke="#78350f" stroke-width="4"/>

      <!-- Black Leathery Nose -->
      <path d="M228 260 L284 260 C292 260, 296 270, 290 278 L262 310 C258 314, 254 314, 250 310 L222 278 C216 270, 220 260, 228 260 Z" fill="#0f172a"/>
      <ellipse cx="242" cy="275" rx="4" ry="7" fill="#000000"/>
      <ellipse cx="270" cy="275" rx="4" ry="7" fill="#000000"/>
      <circle cx="245" cy="268" r="3" fill="#ffffff" opacity="0.4"/>

      <!-- Mouth Seam & Cheeks -->
      <path d="M256 312 L256 345" stroke="#18181b" stroke-width="4"/>
      <path d="M228 345 Q256 360, 284 345" fill="none" stroke="#18181b" stroke-width="4"/>
      <circle cx="232" cy="325" r="2.5" fill="#78350f"/>
      <circle cx="242" cy="333" r="2.5" fill="#78350f"/>
      <circle cx="280" cy="325" r="2.5" fill="#78350f"/>
      <circle cx="270" cy="333" r="2.5" fill="#78350f"/>

      <!-- Lower Jaw -->
      <path d="M236 365 Q256 385, 276 365 Z" fill="#78350f"/>
    </svg>
  `,

  goat: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1024" height="1024">
      <defs>
        <radialGradient id="goatAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.45"/>
          <stop offset="70%" stop-color="#059669" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#059669" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="goatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#6ee7b7"/>
          <stop offset="45%" stop-color="#10b981"/>
          <stop offset="100%" stop-color="#047857"/>
        </linearGradient>
        <linearGradient id="hornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="40%" stop-color="#f59e0b"/>
          <stop offset="80%" stop-color="#b45309"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
        <filter id="goatGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- Radiant Green Aura -->
      <circle cx="256" cy="256" r="230" fill="url(#goatAura)"/>

      <!-- Majestic Sweeping Curved Horns -->
      <g filter="url(#goatGlow)">
        <!-- Left Horn -->
        <path d="M225 150 C210 90, 160 40, 80 40 C65 40, 60 55, 75 65 C130 95, 175 145, 195 200 Z" fill="url(#hornGrad)" stroke="#fef08a" stroke-width="4"/>
        <!-- Horn Ridges -->
        <path d="M120 65 L140 85" stroke="#78350f" stroke-width="4"/>
        <path d="M145 95 L165 115" stroke="#78350f" stroke-width="4"/>
        <path d="M170 130 L190 150" stroke="#78350f" stroke-width="4"/>

        <!-- Right Horn -->
        <path d="M287 150 C302 90, 352 40, 432 40 C447 40, 452 55, 437 65 C382 95, 337 145, 317 200 Z" fill="url(#hornGrad)" stroke="#fef08a" stroke-width="4"/>
        <!-- Horn Ridges -->
        <path d="M392 65 L372 85" stroke="#78350f" stroke-width="4"/>
        <path d="M367 95 L347 115" stroke="#78350f" stroke-width="4"/>
        <path d="M342 130 L322 150" stroke="#78350f" stroke-width="4"/>
      </g>

      <!-- Drooping Lateral Ears -->
      <path d="M190 185 C130 185, 90 220, 105 245 C120 270, 170 235, 195 205 Z" fill="url(#goatGrad)" stroke="#fef08a" stroke-width="3"/>
      <path d="M322 185 C382 185, 422 220, 407 245 C392 270, 342 235, 317 205 Z" fill="url(#goatGrad)" stroke="#fef08a" stroke-width="3"/>

      <!-- Slender Angular Goat Face -->
      <path d="M195 160 L317 160 L295 320 C290 370, 222 370, 217 320 Z" fill="url(#goatGrad)" stroke="#fef08a" stroke-width="5"/>

      <!-- Facial Ridge -->
      <path d="M256 160 L256 310" stroke="#047857" stroke-width="4" opacity="0.6"/>

      <!-- Horizontal Slit Eyes -->
      <path d="M200 215 Q220 205, 235 220 Q220 230, 200 215 Z" fill="#0f172a" stroke="#047857" stroke-width="3"/>
      <circle cx="218" cy="217" r="7" fill="#fef08a"/>
      <rect x="212" y="215" width="12" height="4" rx="2" fill="#000000"/>

      <path d="M312 215 Q292 205, 277 220 Q292 230, 312 215 Z" fill="#0f172a" stroke="#047857" stroke-width="3"/>
      <circle cx="294" cy="217" r="7" fill="#fef08a"/>
      <rect x="288" y="215" width="12" height="4" rx="2" fill="#000000"/>

      <!-- Snout & Nostrils -->
      <ellipse cx="256" cy="325" rx="28" ry="16" fill="#065f46"/>
      <ellipse cx="245" cy="325" rx="3.5" ry="6" fill="#000000"/>
      <ellipse cx="267" cy="325" rx="3.5" ry="6" fill="#000000"/>
      <path d="M246 345 Q256 352, 266 345" fill="none" stroke="#000000" stroke-width="3"/>

      <!-- Flowing Long Chin Beard -->
      <path d="M236 355 C220 420, 240 475, 256 485 C272 475, 292 420, 276 355 Z" fill="#f59e0b" stroke="#fef08a" stroke-width="4"/>
      <path d="M248 375 L252 445" stroke="#78350f" stroke-width="3"/>
      <path d="M264 375 L260 445" stroke="#78350f" stroke-width="3"/>
    </svg>
  `,

  skull: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1024" height="1024">
      <defs>
        <radialGradient id="skullAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#9333ea" stop-opacity="0.5"/>
          <stop offset="50%" stop-color="#dc2626" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="skullGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#c084fc"/>
          <stop offset="40%" stop-color="#7e22ce"/>
          <stop offset="85%" stop-color="#3b0764"/>
          <stop offset="100%" stop-color="#18181b"/>
        </linearGradient>
        <linearGradient id="boneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="70%" stop-color="#cbd5e1"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
        <filter id="skullGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- Radiant Purple & Crimson Aura -->
      <circle cx="256" cy="256" r="235" fill="url(#skullAura)"/>

      <!-- Demonic Horn Crest Spurs -->
      <g filter="url(#skullGlow)">
        <!-- Left Horn Spur -->
        <path d="M195 150 C160 80, 95 60, 65 75 C45 85, 60 110, 85 125 C125 145, 165 170, 185 195 Z" fill="#dc2626" stroke="#f87171" stroke-width="4"/>
        <!-- Right Horn Spur -->
        <path d="M317 150 C352 80, 417 60, 447 75 C467 85, 452 110, 427 125 C387 145, 347 170, 327 195 Z" fill="#dc2626" stroke="#f87171" stroke-width="4"/>
      </g>

      <!-- Anatomical Skull Cranium -->
      <path d="M165 170 C165 85, 347 85, 347 170 C357 235, 342 275, 322 305 L310 330 L202 330 L190 305 C170 275, 155 235, 165 170 Z" fill="url(#skullGrad)" stroke="#f43f5e" stroke-width="6"/>

      <!-- Cranial Sagittal Suture -->
      <path d="M256 95 L252 120 L260 145 L256 170" fill="none" stroke="#2e1065" stroke-width="4" stroke-linecap="round"/>

      <!-- Deep Hollow Eye Sockets with Crimson Core -->
      <g filter="url(#skullGlow)">
        <!-- Left Socket -->
        <path d="M185 205 C180 180, 230 180, 235 210 C240 240, 190 245, 185 205 Z" fill="#000000" stroke="#ef4444" stroke-width="4"/>
        <circle cx="210" cy="212" r="7" fill="#ef4444"/>
        <circle cx="210" cy="212" r="3" fill="#ffffff"/>

        <!-- Right Socket -->
        <path d="M327 205 C332 180, 282 180, 277 210 C272 240, 322 245, 327 205 Z" fill="#000000" stroke="#ef4444" stroke-width="4"/>
        <circle cx="302" cy="212" r="7" fill="#ef4444"/>
        <circle cx="302" cy="212" r="3" fill="#ffffff"/>
      </g>

      <!-- Inverted Pear / Triangular Nasal Aperture -->
      <path d="M256 250 L242 285 C240 292, 248 296, 256 296 C264 296, 272 292, 270 285 Z" fill="#000000" stroke="#991b1b" stroke-width="3"/>

      <!-- Upper Maxilla Jaw with Exposed Fanged Teeth -->
      <path d="M205 330 L307 330 L297 375 L215 375 Z" fill="#3b0764" stroke="#e11d48" stroke-width="4"/>
      <!-- Upper Teeth -->
      <g fill="url(#boneGrad)" stroke="#000000" stroke-width="1.5">
        <polygon points="215,330 227,330 221,352"/>
        <polygon points="228,330 240,330 234,354"/>
        <polygon points="241,330 255,330 248,358"/>
        <polygon points="257,330 271,330 264,358"/>
        <polygon points="272,330 284,330 278,354"/>
        <polygon points="285,330 297,330 291,352"/>
      </g>

      <!-- Lower Mandible Jaw with Teeth -->
      <path d="M217 385 L295 385 L285 435 L227 435 Z" fill="#18181b" stroke="#e11d48" stroke-width="4"/>
      <!-- Lower Teeth -->
      <g fill="url(#boneGrad)" stroke="#000000" stroke-width="1.5">
        <polygon points="225,410 235,410 230,388"/>
        <polygon points="237,410 249,410 243,385"/>
        <polygon points="251,410 263,410 257,385"/>
        <polygon points="265,410 277,410 271,388"/>
        <polygon points="279,410 287,410 283,392"/>
      </g>
    </svg>
  `,
};

async function generate() {
  console.log('Launching Puppeteer to render transparent PNG animal assets...');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });

  for (const [name, svg] of Object.entries(SVGS)) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; width: 1024px; height: 1024px; }
            svg { width: 1024px; height: 1024px; }
          </style>
        </head>
        <body>
          ${svg}
        </body>
      </html>
    `;
    await page.setContent(html);
    const filePath = path.join(TARGET_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, omitBackground: true });
    console.log(`✅ Generated: ${filePath} (${fs.statSync(filePath).size} bytes)`);
  }

  await browser.close();
  console.log('🎉 All 5 animal assets generated successfully!');
}

generate().catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});

