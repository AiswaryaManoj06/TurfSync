/**
 * High-performance, offline-ready vector illustrations for sports arenas.
 * These load instantaneously (0ms) without network latency or external failures.
 */

function buildSportSvg(title: string, subtitle: string, bg1: string, bg2: string, accent: string, iconGlyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
  <defs>
    <linearGradient id="g_${title}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <radialGradient id="r_${title}" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${bg1}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="450" fill="url(#g_${title})"/>
  <rect width="800" height="450" fill="url(#r_${title})"/>
  <g opacity="0.12" stroke="#ffffff" stroke-width="2" fill="none">
    <circle cx="400" cy="225" r="90"/>
    <line x1="400" y1="0" x2="400" y2="450"/>
    <rect x="40" y="40" width="720" height="370" rx="12"/>
    <rect x="40" y="145" width="130" height="160"/>
    <rect x="630" y="145" width="130" height="160"/>
  </g>
  <g transform="translate(400, 205)" text-anchor="middle">
    <circle r="46" fill="${accent}" opacity="0.25"/>
    <circle r="36" fill="${accent}" opacity="0.45"/>
    <text y="14" font-family="-apple-system, sans-serif" font-size="38" text-anchor="middle">${iconGlyph}</text>
    <text y="78" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800" fill="#ffffff" letter-spacing="0.5">${title}</text>
    <text y="104" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="${accent}" letter-spacing="1.5">${subtitle.toUpperCase()}</text>
  </g>
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export const SPORT_OFFLINE_IMAGES: Record<string, string> = {
  Football: buildSportSvg('Football Arena', 'FIFA Grade Turf & Floodlights', '#064e3b', '#022c22', '#10b981', '⚽'),
  Cricket: buildSportSvg('Box Cricket Arena', 'Natural & Astroturf Pitch', '#065f46', '#022c22', '#34d399', '🏏'),
  Badminton: buildSportSvg('Badminton Court', 'BWF Pro Synthetic Matting', '#1e3a8a', '#0f172a', '#38bdf8', '🏸'),
  Basketball: buildSportSvg('Basketball Court', 'FIBA Standard Hardwood', '#7c2d12', '#431407', '#fb923c', '🏀'),
  Tennis: buildSportSvg('Tennis Arena', 'DecoTurf All-Weather Surface', '#134e4a', '#042f2e', '#2dd4bf', '🎾'),
  Pickleball: buildSportSvg('Pickleball Court', 'Pro Cushion Hard Court', '#1e1b4b', '#0f172a', '#a855f7', '🏓'),
  General: buildSportSvg('Sports Complex', 'Multi-Sport Turf & Lighting', '#0f172a', '#020617', '#10b981', '🏆')
};

export function getSportImage(sport?: string): string {
  if (!sport) return SPORT_OFFLINE_IMAGES['General'];
  return SPORT_OFFLINE_IMAGES[sport] || SPORT_OFFLINE_IMAGES['General'];
}

