import { useEffect, useState } from 'react';

export function useFigmaTheme(): 'dark' | 'light' {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    function detectTheme() {
      const isHtmlDark = document.documentElement.classList.contains('figma-dark');
      const isBodyDark = document.body.classList.contains('figma-dark');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = isHtmlDark || isBodyDark || prefersDark;
      document.documentElement.classList.toggle('dark', isDark);
      setTheme(isDark ? 'dark' : 'light');
    }

    detectTheme();

    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', detectTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', detectTheme);
    };
  }, []);

  return theme;
}
