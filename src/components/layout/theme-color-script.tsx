/**
 * Inline script that sets theme-color meta tag BEFORE React hydration.
 * Prevents status bar color flash on iOS Safari and PWA.
 *
 * Reads the theme from localStorage (next-themes stores it as 'theme')
 * and sets the appropriate color immediately.
 *
 * Light: #ffffff, Dark: #363636
 */
export function ThemeColorScript() {
  const scriptContent = [
    '(function(){',
    "var L='#ffffff',D='#363636';",
    'try{',
    "var t=localStorage.getItem('theme');",
    "var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);",
    'var c=d?D:L;',
    "var m=document.querySelector('meta[name=\"theme-color\"]');",
    "if(m){m.setAttribute('content',c)}",
    "else{var n=document.createElement('meta');n.name='theme-color';n.content=c;document.head.appendChild(n)}",
    '}catch(e){}',
    '})();',
  ].join('');

  return <script suppressHydrationWarning>{scriptContent}</script>;
}
