"use strict";
import { jsx, jsxs } from "react/jsx-runtime";
export const CodeHighlighter = ({ code, language }) => {
  if (!code) {
    return /* @__PURE__ */ jsx("span", { className: "text-overlay1 italic", children: "/* No styles extracted */" });
  }
  if (language === "css") {
    const lines = code.split("\n");
    return /* @__PURE__ */ jsx("div", { className: "font-mono text-xs select-all", children: lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("/*")) {
        return /* @__PURE__ */ jsxs("div", { className: "flex", children: [
          /* @__PURE__ */ jsx("span", { className: "select-none text-overlay1 w-5 text-right pr-2 shrink-0 text-[10px]", children: idx + 1 }),
          /* @__PURE__ */ jsx("span", { className: "text-overlay0 italic", children: line })
        ] }, idx);
      }
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const property = line.slice(0, colonIdx);
        const rest = line.slice(colonIdx + 1);
        const semiIdx = rest.lastIndexOf(";");
        const value = semiIdx >= 0 ? rest.slice(0, semiIdx) : rest;
        const semi = semiIdx >= 0 ? ";" : "";
        const tokens = tokenizeCssValue(value);
        return /* @__PURE__ */ jsxs("div", { className: "flex leading-relaxed hover:bg-surface0/40 px-1 rounded transition-colors", children: [
          /* @__PURE__ */ jsx("span", { className: "select-none text-overlay1 w-5 text-right pr-2 shrink-0 text-[10px]", children: idx + 1 }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-blue font-medium", children: property }),
            /* @__PURE__ */ jsx("span", { className: "text-overlay1", children: ":" }),
            /* @__PURE__ */ jsx("span", { children: tokens }),
            /* @__PURE__ */ jsx("span", { className: "text-overlay1", children: semi })
          ] })
        ] }, idx);
      }
      return /* @__PURE__ */ jsxs("div", { className: "flex leading-relaxed", children: [
        /* @__PURE__ */ jsx("span", { className: "select-none text-overlay1 w-5 text-right pr-2 shrink-0 text-[10px]", children: idx + 1 }),
        /* @__PURE__ */ jsx("span", { className: "text-text", children: line })
      ] }, idx);
    }) });
  }
  const classes = code.split(/\s+/).filter(Boolean);
  return /* @__PURE__ */ jsx("div", { className: "font-mono text-xs leading-relaxed flex flex-wrap gap-1.5 p-1 select-all", children: classes.map((cls, idx) => {
    const colorClass = getTailwindClassStyle(cls);
    const hexMatch = cls.match(/#([0-9a-fA-F]{3,8})/);
    return /* @__PURE__ */ jsxs(
      "span",
      {
        className: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface0/60 border border-surface1/60 ${colorClass}`,
        children: [
          hexMatch && /* @__PURE__ */ jsx(
            "span",
            {
              className: "inline-block w-2 h-2 rounded-full border border-surface2 shrink-0 shadow-xs",
              style: { backgroundColor: `#${hexMatch[1]}` }
            }
          ),
          /* @__PURE__ */ jsx("span", { children: cls })
        ]
      },
      idx
    );
  }) });
};
function tokenizeCssValue(val) {
  const regex = /(#[0-9a-fA-F]{3,8})|(\d+(?:\.\d+)?(?:px|%|rem|em|deg|ms|s)?)|([a-zA-Z-]+)|('[^']*'|"[^"]*")|([^#\w\s'"-]+)/g;
  const nodes = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(val)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(val.slice(lastIndex, match.index));
    }
    const [full, hex, num, word, str] = match;
    const key = `${match.index}-${full}`;
    if (hex) {
      nodes.push(
        /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-peach font-semibold", children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: "inline-block w-2.5 h-2.5 rounded-full border border-surface2 shrink-0 shadow-xs",
              style: { backgroundColor: hex }
            }
          ),
          hex
        ] }, key)
      );
    } else if (num) {
      nodes.push(
        /* @__PURE__ */ jsx("span", { className: "text-green font-medium", children: num }, key)
      );
    } else if (str) {
      nodes.push(
        /* @__PURE__ */ jsx("span", { className: "text-yellow", children: str }, key)
      );
    } else if (word) {
      nodes.push(
        /* @__PURE__ */ jsx("span", { className: "text-mauve", children: word }, key)
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
function getTailwindClassStyle(cls) {
  if (cls.startsWith("flex") || cls.startsWith("justify-") || cls.startsWith("items-") || cls.startsWith("grid")) {
    return "text-mauve";
  }
  if (cls.startsWith("w-") || cls.startsWith("h-") || cls.startsWith("min-") || cls.startsWith("max-")) {
    return "text-sky";
  }
  if (cls.startsWith("p-") || cls.startsWith("px-") || cls.startsWith("py-") || cls.startsWith("pt-") || cls.startsWith("pr-") || cls.startsWith("pb-") || cls.startsWith("pl-") || cls.startsWith("gap-") || cls.startsWith("m-")) {
    return "text-green";
  }
  if (cls.startsWith("text-") && !cls.includes("#")) {
    return "text-pink";
  }
  if (cls.startsWith("font-") || cls.startsWith("leading-") || cls.startsWith("tracking-")) {
    return "text-pink";
  }
  if (cls.startsWith("bg-") || cls.includes("#")) {
    return "text-peach";
  }
  if (cls.startsWith("rounded") || cls.startsWith("border")) {
    return "text-teal";
  }
  if (cls.startsWith("shadow") || cls.startsWith("opacity")) {
    return "text-lavender";
  }
  return "text-text";
}
