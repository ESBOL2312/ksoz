<!-- SVG-символы из макета «Сөз ауылы». Монтируется один раз в App.vue, используется через <Art name="…" />. -->
<template>
  <svg width="0" height="0" style="position: absolute" aria-hidden="true">
    <defs>
      <symbol id="art-coin" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="15" fill="#B97F12" />
        <circle cx="16" cy="15" r="14" fill="#F2B42C" />
        <circle cx="16" cy="15" r="9.5" fill="none" stroke="#B97F12" stroke-width="2" />
        <path d="M16 5.5v19M6.5 15h19M9.3 8.3l13.4 13.4M22.7 8.3L9.3 21.7" stroke="#B97F12" stroke-width="1.6" />
        <circle cx="16" cy="15" r="4" fill="#F2B42C" stroke="#B97F12" stroke-width="2" />
      </symbol>
      <symbol id="art-flame" viewBox="0 0 24 24">
        <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" fill="#FF7A2F" />
        <path d="M12 12c1 2 3 3 3 5a3 3 0 0 1-6 0c0-1.5 1-2.5 1.5-3 .3 1 .8 1.4 1.5 1.4 0-1.2-.4-2.4 0-3.4z" fill="#FFD25A" />
      </symbol>
      <symbol id="art-horn" viewBox="0 0 40 40">
        <path d="M20 34V22c0-8-8-12-13-8-3 3-1 8 3 6M20 22c0-8 8-12 13-8 3 3 1 8-3 6M20 14V6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      </symbol>
      <symbol id="art-horse" viewBox="0 0 120 100">
        <path d="M30 46 Q10 48 14 76" fill="none" stroke="#3B2314" stroke-width="7" stroke-linecap="round" />
        <rect x="36" y="56" width="7" height="34" rx="3" fill="#6E3A1E" />
        <rect x="78" y="56" width="7" height="34" rx="3" fill="#6E3A1E" />
        <ellipse cx="60" cy="50" rx="33" ry="17" fill="#8A4B2A" />
        <rect x="46" y="58" width="7" height="32" rx="3" fill="#8A4B2A" />
        <rect x="88" y="56" width="7" height="34" rx="3" fill="#8A4B2A" />
        <path d="M80 42 L95 14 L106 18 L94 54 Z" fill="#8A4B2A" />
        <ellipse cx="104" cy="22" rx="12" ry="7" transform="rotate(28 104 22)" fill="#8A4B2A" />
        <path d="M93 12 L96 4 L100 12" fill="#6E3A1E" />
        <path d="M80 44 Q84 26 93 13" fill="none" stroke="#3B2314" stroke-width="6" stroke-linecap="round" />
        <circle cx="104" cy="18" r="1.8" fill="#1B1736" />
        <path d="M48 34 Q60 30 72 34 L74 48 Q60 52 46 48 Z" fill="#C7382B" />
        <path d="M50 40 H70" stroke="#F2B42C" stroke-width="2.5" />
      </symbol>
      <symbol id="art-yurt" viewBox="0 0 200 140">
        <path d="M14 132 L18 78 Q100 6 182 78 L186 132 Z" fill="#F6EBD8" />
        <path d="M18 78 Q100 6 182 78 L182 92 Q100 26 18 92 Z" fill="#E7D3B0" />
        <path d="M20 94 L180 94 L181 106 L19 106 Z" fill="#C7382B" />
        <g fill="none" stroke="#F2B42C" stroke-width="2.4" stroke-linecap="round">
          <path d="M40 104v-4c0-3-4-4-5-2M40 100c0-3 4-4 5-2M80 104v-4c0-3-4-4-5-2M80 100c0-3 4-4 5-2M120 104v-4c0-3-4-4-5-2M120 100c0-3 4-4 5-2M160 104v-4c0-3-4-4-5-2M160 100c0-3 4-4 5-2" />
        </g>
        <g stroke="#D9C39C" stroke-width="1.4"><path d="M24 112 L44 132M44 112 L24 132M150 112 L170 132M170 112 L150 132M140 112 L160 132M160 112 L140 132" /></g>
        <rect x="84" y="96" width="32" height="36" rx="3" fill="#8E2219" />
        <rect x="88" y="100" width="24" height="32" rx="2" fill="#C7382B" />
        <use href="#art-horn" x="90" y="104" width="20" height="20" color="#F2B42C" />
        <ellipse cx="100" cy="34" rx="16" ry="5" fill="#8A4B2A" />
        <path d="M90 34 Q100 22 110 34" fill="none" stroke="#6E3A1E" stroke-width="3" />
      </symbol>
      <symbol id="art-dombra" viewBox="0 0 60 170">
        <rect x="26" y="6" width="8" height="98" rx="3" fill="#8A4B2A" />
        <rect x="24" y="2" width="12" height="16" rx="3" fill="#6E3A1E" />
        <circle cx="22" cy="10" r="2.5" fill="#F2B42C" /><circle cx="38" cy="10" r="2.5" fill="#F2B42C" />
        <path d="M30 92 C8 102 6 158 30 164 C54 158 52 102 30 92Z" fill="#B5652F" />
        <path d="M30 100 C14 108 13 152 30 157 C47 152 46 108 30 100Z" fill="#D1843F" />
        <circle cx="24" cy="124" r="2" fill="#6E3A1E" /><circle cx="36" cy="124" r="2" fill="#6E3A1E" /><circle cx="30" cy="118" r="2" fill="#6E3A1E" />
        <rect x="22" y="146" width="16" height="4" rx="2" fill="#3B2314" />
        <path d="M28.5 12 V148 M31.5 12 V148" stroke="#FBF3E3" stroke-width=".9" />
      </symbol>
      <symbol id="art-chapan" viewBox="0 0 100 100">
        <path d="M30 14 Q50 8 70 14 L86 92 Q50 98 14 92 Z" fill="#203272" />
        <path d="M30 14 L10 60 L22 64 L34 34 M70 14 L90 60 L78 64 L66 34" fill="#1A2860" />
        <path d="M44 12 L48 96 M56 12 L52 96" stroke="#F2B42C" stroke-width="3" />
        <path d="M14 92 Q50 98 86 92 L85 86 Q50 92 15 86Z" fill="#F2B42C" />
        <use href="#art-horn" x="18" y="58" width="18" height="18" color="#F2B42C" />
        <use href="#art-horn" x="64" y="58" width="18" height="18" color="#F2B42C" />
      </symbol>
      <symbol id="art-syrmak" viewBox="0 0 100 70">
        <rect x="4" y="4" width="92" height="62" rx="4" fill="#C7382B" />
        <rect x="10" y="10" width="80" height="50" rx="2" fill="#203272" />
        <use href="#art-horn" x="14" y="16" width="38" height="38" color="#F2B42C" />
        <use href="#art-horn" x="48" y="16" width="38" height="38" color="#FBF3E3" />
      </symbol>
      <symbol id="art-eagle" viewBox="0 0 200 120">
        <path d="M100 58 L18 30 L36 48 L8 52 L40 62 L16 74 L62 72 L84 80 Z" fill="#6E3A1E" />
        <path d="M100 58 L182 30 L164 48 L192 52 L160 62 L184 74 L138 72 L116 80 Z" fill="#6E3A1E" />
        <path d="M100 58 L40 40 L60 56 L86 72 Z M100 58 L160 40 L140 56 L114 72 Z" fill="#8A4B2A" />
        <ellipse cx="100" cy="72" rx="15" ry="24" fill="#5A2E15" />
        <path d="M90 92 L100 112 L110 92 Z" fill="#5A2E15" />
        <circle cx="100" cy="46" r="11" fill="#C79A55" />
        <path d="M100 48 L108 52 L100 56 Z" fill="#F2B42C" />
        <circle cx="104" cy="44" r="1.8" fill="#1B1736" />
      </symbol>
      <symbol id="art-takiya" viewBox="0 0 100 80">
        <ellipse cx="50" cy="70" rx="38" ry="6" fill="#000" opacity=".12" />
        <path d="M14 62 Q14 20 50 18 Q86 20 86 62 Q50 52 14 62 Z" fill="#C7382B" />
        <path d="M14 62 Q50 52 86 62 L86 52 Q50 42 14 52 Z" fill="#8E2219" />
        <path d="M30 30 Q50 22 70 30" fill="none" stroke="#E2675B" stroke-width="3" stroke-linecap="round" />
        <use href="#art-horn" x="38" y="26" width="24" height="24" color="#F2B42C" />
        <use href="#art-horn" x="18" y="34" width="16" height="16" color="#F2B42C" />
        <use href="#art-horn" x="66" y="34" width="16" height="16" color="#F2B42C" />
        <path d="M50 19 C42 6 46 -2 56 -4 C53 4 58 10 53 19 Z" fill="#fff" stroke="#D9D9E8" stroke-width="1.5" />
      </symbol>
      <symbol id="art-etik" viewBox="0 0 110 90">
        <ellipse cx="55" cy="84" rx="44" ry="5" fill="#000" opacity=".12" />
        <g transform="translate(26 -2)">
          <rect x="30" y="8" width="26" height="54" rx="6" fill="#5A2E15" />
          <path d="M22 70 q-8-10 0-10 l8 4 h26 q12 0 12 10 q0 8-10 8 H30 q-12 0-8-12z" fill="#5A2E15" />
          <path d="M30 16h26" stroke="#B97F12" stroke-width="6" />
        </g>
        <rect x="30" y="12" width="26" height="54" rx="6" fill="#8A4B2A" />
        <path d="M22 74 q-8-10 0-10 l8 4 h26 q12 0 12 10 q0 8-10 8 H30 q-12 0-8-12z" fill="#8A4B2A" />
        <path d="M30 20h26" stroke="#F2B42C" stroke-width="6" />
        <use href="#art-horn" x="33" y="32" width="20" height="20" color="#F2B42C" />
        <path d="M24 82h42" stroke="#3B2314" stroke-width="4" stroke-linecap="round" />
      </symbol>
      <symbol id="art-cat" viewBox="0 0 100 100">
        <ellipse cx="50" cy="93" rx="32" ry="5" fill="#000" opacity=".12" />
        <path d="M72 86 C96 84 96 56 82 54" fill="none" stroke="#D9772F" stroke-width="9" stroke-linecap="round" />
        <path d="M24 92 Q20 56 50 52 Q80 56 76 92 Z" fill="#F0974A" />
        <path d="M40 92 Q40 70 50 68 Q60 70 60 92 Z" fill="#FBE4C8" />
        <path d="M30 66l8 4M28 76l8 2M70 66l-8 4M72 76l-8 2" stroke="#D9772F" stroke-width="3" stroke-linecap="round" />
        <path d="M24 40 L22 12 L42 26 Z M76 40 L78 12 L58 26 Z" fill="#F0974A" />
        <path d="M27 32 L26 19 L36 26 Z M73 32 L74 19 L64 26 Z" fill="#F7B9A6" />
        <ellipse cx="50" cy="40" rx="28" ry="23" fill="#F0974A" />
        <path d="M44 20 l2 8 M50 18 v9 M56 20 l-2 8" stroke="#D9772F" stroke-width="3" stroke-linecap="round" />
        <ellipse cx="50" cy="50" rx="13" ry="9" fill="#FBE4C8" />
        <ellipse cx="40" cy="38" rx="4" ry="5.5" fill="#1B1736" />
        <ellipse cx="60" cy="38" rx="4" ry="5.5" fill="#1B1736" />
        <circle cx="41.5" cy="36" r="1.6" fill="#fff" /><circle cx="61.5" cy="36" r="1.6" fill="#fff" />
        <path d="M47 46 h6 l-3 3 z" fill="#E2675B" />
        <path d="M50 49 v2 M50 51 q-3 3-6 1 M50 51 q3 3 6 1" fill="none" stroke="#1B1736" stroke-width="1.6" stroke-linecap="round" />
      </symbol>
      <symbol id="art-sheep" viewBox="0 0 120 100">
        <ellipse cx="60" cy="93" rx="40" ry="5" fill="#000" opacity=".12" />
        <rect x="36" y="64" width="8" height="28" rx="3" fill="#3B2314" />
        <rect x="52" y="66" width="8" height="26" rx="3" fill="#3B2314" />
        <rect x="68" y="66" width="8" height="26" rx="3" fill="#3B2314" />
        <rect x="82" y="64" width="8" height="28" rx="3" fill="#3B2314" />
        <g fill="#F6EBD8" stroke="#E2CFAE" stroke-width="2">
          <circle cx="40" cy="50" r="15" /><circle cx="58" cy="40" r="16" /><circle cx="78" cy="42" r="15" />
          <circle cx="90" cy="56" r="13" /><circle cx="70" cy="62" r="15" /><circle cx="48" cy="64" r="14" />
        </g>
        <ellipse cx="62" cy="52" rx="26" ry="16" fill="#F6EBD8" />
        <ellipse cx="22" cy="44" rx="7" ry="4" transform="rotate(-30 22 44)" fill="#3B2314" />
        <ellipse cx="44" cy="42" rx="7" ry="4" transform="rotate(30 44 42)" fill="#3B2314" />
        <ellipse cx="32" cy="52" rx="12" ry="15" fill="#4A3020" />
        <circle cx="32" cy="38" r="8" fill="#F6EBD8" stroke="#E2CFAE" stroke-width="2" />
        <circle cx="27" cy="50" r="2.2" fill="#fff" /><circle cx="37" cy="50" r="2.2" fill="#fff" />
        <circle cx="27.5" cy="50.5" r="1.2" fill="#1B1736" /><circle cx="37.5" cy="50.5" r="1.2" fill="#1B1736" />
        <path d="M28 60 q4 3 8 0" fill="none" stroke="#F6EBD8" stroke-width="1.6" stroke-linecap="round" />
      </symbol>
      <symbol id="art-tea" viewBox="0 0 110 90">
        <ellipse cx="55" cy="82" rx="46" ry="6" fill="#000" opacity=".12" />
        <path d="M44 22 q-6-8 0-14 M56 22 q-6-8 0-14 M68 22 q-6-8 0-14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8" />
        <ellipse cx="56" cy="74" rx="34" ry="7" fill="#E7D3B0" />
        <path d="M24 34 H88 Q86 72 56 74 Q26 72 24 34 Z" fill="#fff" />
        <path d="M26 46 H86 Q85 54 82 58 H30 Q27 54 26 46 Z" fill="#19AECB" />
        <use href="#art-horn" x="34" y="44" width="14" height="14" color="#F2B42C" />
        <use href="#art-horn" x="49" y="44" width="14" height="14" color="#F2B42C" />
        <use href="#art-horn" x="64" y="44" width="14" height="14" color="#F2B42C" />
        <ellipse cx="56" cy="34" rx="32" ry="7" fill="#fff" />
        <ellipse cx="56" cy="34" rx="28" ry="5" fill="#B5652F" />
        <ellipse cx="50" cy="33" rx="10" ry="1.6" fill="#E3A066" />
        <rect x="88" y="62" width="14" height="12" rx="5" fill="#D1843F" />
        <rect x="94" y="54" width="12" height="11" rx="5" fill="#E09A50" />
        <rect x="6" y="64" width="13" height="11" rx="5" fill="#D1843F" />
      </symbol>
      <symbol id="art-i-aul" viewBox="0 0 24 24">
        <path d="M3 20 L3.5 12 Q12 2 20.5 12 L21 20 Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
        <path d="M10 20v-5h4v5M4 13h16" fill="none" stroke="currentColor" stroke-width="2.2" />
      </symbol>
      <symbol id="art-i-lesson" viewBox="0 0 24 24">
        <rect x="4" y="3" width="16" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2.2" />
        <path d="M8 9h8M8 13h5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
      </symbol>
      <symbol id="art-i-bazaar" viewBox="0 0 24 24">
        <path d="M4 9 L6 4 H18 L20 9 Z M5 9 V20 H19 V9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
        <path d="M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="2.2" />
      </symbol>
      <symbol id="art-i-baige" viewBox="0 0 24 24">
        <path d="M6 21V4M6 4h11l-2 4 2 4H6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
      </symbol>
    </defs>
  </svg>
</template>
