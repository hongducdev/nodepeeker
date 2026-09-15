import React from 'react';

interface CodeHighlighterProps {
  code: string;
  language: 'css' | 'tailwind';
}

export const CodeHighlighter: React.FC<CodeHighlighterProps> = ({ code, language }) => {
  if (!code) {
    return <span className="text-slate-500 italic">/* No styles extracted */</span>;
  }

  if (language === 'css') {
    const lines = code.split('\n');
    return (
      <div className="font-mono text-xs select-all">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Comment
          if (trimmed.startsWith('/*')) {
            return (
              <div key={idx} className="flex">
                <span className="select-none text-slate-600 dark:text-slate-600 w-5 text-right pr-2 shrink-0 text-[10px]">
                  {idx + 1}
                </span>
                <span className="text-slate-500 italic">{line}</span>
              </div>
            );
          }

          // Property : Value;
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const property = line.slice(0, colonIdx);
            const rest = line.slice(colonIdx + 1);
            const semiIdx = rest.lastIndexOf(';');
            const value = semiIdx >= 0 ? rest.slice(0, semiIdx) : rest;
            const semi = semiIdx >= 0 ? ';' : '';

            // Tokenize value: look for hex colors, numbers/units, strings
            const tokens = tokenizeCssValue(value);

            return (
              <div key={idx} className="flex leading-relaxed hover:bg-slate-800/40 px-1 rounded transition-colors">
                <span className="select-none text-slate-600 dark:text-slate-600 w-5 text-right pr-2 shrink-0 text-[10px]">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <span className="text-sky-400 font-medium">{property}</span>
                  <span className="text-slate-500">:</span>
                  <span>{tokens}</span>
                  <span className="text-slate-500">{semi}</span>
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="flex leading-relaxed">
              <span className="select-none text-slate-600 dark:text-slate-600 w-5 text-right pr-2 shrink-0 text-[10px]">
                {idx + 1}
              </span>
              <span className="text-slate-300">{line}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Tailwind language
  const classes = code.split(/\s+/).filter(Boolean);
  return (
    <div className="font-mono text-xs leading-relaxed flex flex-wrap gap-1.5 p-1 select-all">
      {classes.map((cls, idx) => {
        const colorClass = getTailwindClassStyle(cls);
        const hexMatch = cls.match(/#([0-9a-fA-F]{3,8})/);

        return (
          <span
            key={idx}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 ${colorClass}`}
          >
            {hexMatch && (
              <span
                className="inline-block w-2 h-2 rounded-full border border-slate-600 shrink-0 shadow-xs"
                style={{ backgroundColor: `#${hexMatch[1]}` }}
              />
            )}
            <span>{cls}</span>
          </span>
        );
      })}
    </div>
  );
};

function tokenizeCssValue(val: string): React.ReactNode[] {
  // Regex to match hex colors, numbers with units, and words
  const regex = /(#[0-9a-fA-F]{3,8})|(\d+(?:\.\d+)?(?:px|%|rem|em|deg|ms|s)?)|([a-zA-Z-]+)|('[^']*'|"[^"]*")|([^#\w\s'"-]+)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(val)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(val.slice(lastIndex, match.index));
    }

    const [full, hex, num, word, str] = match;
    const key = `${match.index}-${full}`;

    if (hex) {
      nodes.push(
        <span key={key} className="inline-flex items-center gap-1 text-amber-300 font-semibold">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full border border-slate-600 shrink-0 shadow-xs"
            style={{ backgroundColor: hex }}
          />
          {hex}
        </span>
      );
    } else if (num) {
      nodes.push(
        <span key={key} className="text-emerald-400 font-medium">
          {num}
        </span>
      );
    } else if (str) {
      nodes.push(
        <span key={key} className="text-amber-200">
          {str}
        </span>
      );
    } else if (word) {
      nodes.push(
        <span key={key} className="text-indigo-300">
          {word}
        </span>
      );
    } else {
      nodes.push(full);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < val.length) {
    nodes.push(val.slice(lastIndex));
  }

  return nodes;
}

function getTailwindClassStyle(cls: string): string {
  if (cls.startsWith('flex') || cls.startsWith('justify-') || cls.startsWith('items-') || cls.startsWith('grid')) {
    return 'text-purple-400';
  }
  if (cls.startsWith('w-') || cls.startsWith('h-') || cls.startsWith('min-') || cls.startsWith('max-')) {
    return 'text-sky-400';
  }
  if (cls.startsWith('p-') || cls.startsWith('px-') || cls.startsWith('py-') || cls.startsWith('pt-') || cls.startsWith('pr-') || cls.startsWith('pb-') || cls.startsWith('pl-') || cls.startsWith('gap-') || cls.startsWith('m-')) {
    return 'text-emerald-400';
  }
  if (cls.startsWith('text-') && !cls.includes('#')) {
    return 'text-pink-400';
  }
  if (cls.startsWith('font-') || cls.startsWith('leading-') || cls.startsWith('tracking-')) {
    return 'text-pink-400';
  }
  if (cls.startsWith('bg-') || cls.includes('#')) {
    return 'text-amber-300';
  }
  if (cls.startsWith('rounded') || cls.startsWith('border')) {
    return 'text-teal-400';
  }
  if (cls.startsWith('shadow') || cls.startsWith('opacity')) {
    return 'text-indigo-400';
  }
  return 'text-slate-300';
}
