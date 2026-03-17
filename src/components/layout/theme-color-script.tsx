/**
 * Inline script that sets theme-color meta tag BEFORE React hydration.
 * Prevents status bar color flash on iOS Safari and PWA.
 *
 * Reads the theme from localStorage (next-themes stores it as 'theme')
 * and sets the appropriate color immediately.
 *
 * Light: #f9fafb  (oklch(0.985 0.002 250) — bg-background)
 * Dark:  #2e2e2e  (oklch(0.30 0.00 0)     — bg-background)
 *
 * Also removes any media-specific theme-color metas to prevent
 * system dark preference from overriding the app theme.
 */
export function ThemeColorScript() {
  const scriptContent = [
    '(function(){',
    "var L='#f9fafb',D='#2e2e2e';",
    'try{',
    "var t=localStorage.getItem('theme');",
    "var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);",
    'var c=d?D:L;',
    // Remove ALL existing theme-color metas (prevents media-specific duplicates)
    "document.querySelectorAll('meta[name=\"theme-color\"]').forEach(function(m){m.remove()});",
    "var n=document.createElement('meta');n.name='theme-color';n.content=c;document.head.appendChild(n);",
    '}catch(e){}',
    '})();',
  ].join('');

  return <script suppressHydrationWarning>{scriptContent}</script>;
}
