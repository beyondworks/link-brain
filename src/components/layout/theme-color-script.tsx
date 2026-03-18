/**
 * Inline script that updates theme-color meta tag BEFORE React hydration.
 * Prevents status bar color flash on iOS Safari and PWA.
 *
 * Next.js generates the initial <meta name="theme-color"> from viewport export.
 * This script UPDATES its content based on the stored theme preference,
 * without removing/recreating (iOS PWA tracks the original DOM element).
 *
 * Light: #f9fafb  (oklch(0.985 0.002 250) — bg-background)
 * Dark:  #2e2e2e  (oklch(0.30 0.00 0)     — bg-background)
 */
export function ThemeColorScript() {
  const scriptContent = [
    '(function(){',
    "var L='#f9fafb',D='#2e2e2e';",
    'try{',
    "var t=localStorage.getItem('theme');",
    "var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);",
    'var c=d?D:L;',
    "var m=document.querySelector('meta[name=\"theme-color\"]');",
    "if(m){m.setAttribute('content',c);m.removeAttribute('media')}",
    "else{var n=document.createElement('meta');n.name='theme-color';n.content=c;document.head.appendChild(n)}",
    '}catch(e){}',
    '})();',
  ].join('');

  return <script suppressHydrationWarning>{scriptContent}</script>;
}
