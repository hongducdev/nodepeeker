"use strict";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { transpileToTailwind } from "../../utils/tailwind-transpiler";
import { Code2, Copy, Check } from "lucide-react";
import { CodeHighlighter } from "./CodeHighlighter";
export const CodeViewer = ({ data, onCopy, copiedText }) => {
  const [tab, setTab] = useState("css");
  const tailwindCode = transpileToTailwind(data);
  const formatCss = () => {
    const cssMap = { ...data.css };
    if (data.border && !cssMap["border"] && !cssMap["border-top"]) {
      const { strokeWeight, individualWeights, strokeStyle, color } = data.border;
      if (individualWeights) {
        if (individualWeights.top > 0) cssMap["border-top"] = `${individualWeights.top}px ${strokeStyle} ${color}`;
        if (individualWeights.right > 0) cssMap["border-right"] = `${individualWeights.right}px ${strokeStyle} ${color}`;
        if (individualWeights.bottom > 0) cssMap["border-bottom"] = `${individualWeights.bottom}px ${strokeStyle} ${color}`;
        if (individualWeights.left > 0) cssMap["border-left"] = `${individualWeights.left}px ${strokeStyle} ${color}`;
      } else if (strokeWeight > 0) {
        cssMap["border"] = `${strokeWeight}px ${strokeStyle} ${color}`;
      }
    }
    const entries = Object.entries(cssMap);
    if (entries.length === 0) {
      return `/* Dimensions */
width: ${data.boxModel.width}px;
height: ${data.boxModel.height}px;`;
    }
    return entries.map(([prop, val]) => `${prop}: ${val};`).join("\n");
  };
  const cssCode = formatCss();
  const activeCode = tab === "css" ? cssCode : tailwindCode;
  const isCopied = copiedText === activeCode;
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target?.tagName)) {
        return;
      }
      if (e.key === "1" || e.key.toLowerCase() === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setTab("css");
      } else if (e.key === "2" || e.key.toLowerCase() === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setTab("tailwind");
      } else if ((e.ctrlKey || e.metaKey || e.altKey) && e.key.toLowerCase() === "c") {
        onCopy(activeCode, tab === "css" ? "CSS styles" : "Tailwind classes");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCode, tab, onCopy]);
  return /* @__PURE__ */ jsxs("div", { className: "p-3 border-b border-surface0", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(Code2, { size: 12, className: "text-overlay1" }),
        /* @__PURE__ */ jsxs("div", { className: "flex rounded bg-surface0 p-0.5 text-[11px] font-medium", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => setTab("css"),
              className: `flex items-center gap-1 px-2 py-0.5 rounded transition ${tab === "css" ? "bg-surface2 text-blue font-semibold shadow-xs" : "text-overlay1 hover:text-text"}`,
              title: "Shortcut: Press '1' or 'C'",
              children: [
                /* @__PURE__ */ jsx("span", { children: "CSS" }),
                /* @__PURE__ */ jsx("kbd", { className: "text-[9px] font-mono opacity-50 px-1 py-0.2 rounded bg-surface1/60", children: "1" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => setTab("tailwind"),
              className: `flex items-center gap-1 px-2 py-0.5 rounded transition ${tab === "tailwind" ? "bg-surface2 text-blue font-semibold shadow-xs" : "text-overlay1 hover:text-text"}`,
              title: "Shortcut: Press '2' or 'T'",
              children: [
                /* @__PURE__ */ jsx("span", { children: "Tailwind" }),
                /* @__PURE__ */ jsx("kbd", { className: "text-[9px] font-mono opacity-50 px-1 py-0.2 rounded bg-surface1/60", children: "2" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => onCopy(activeCode, tab === "css" ? "CSS styles" : "Tailwind classes"),
          className: "flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-surface0 hover:bg-surface1 text-subtext1 transition",
          title: "Copy to clipboard (Ctrl+C / Cmd+C)",
          children: isCopied ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Check, { size: 12, className: "text-green" }),
            /* @__PURE__ */ jsx("span", { className: "text-green", children: "Copied" })
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Copy, { size: 12 }),
            /* @__PURE__ */ jsx("span", { children: "Copy" })
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "relative rounded-md bg-crust text-text p-2.5 overflow-x-auto max-h-56 scrollbar-thin border border-surface0", children: /* @__PURE__ */ jsx(CodeHighlighter, { code: activeCode, language: tab }) })
  ] });
};
