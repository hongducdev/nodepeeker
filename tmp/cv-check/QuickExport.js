"use strict";
import { jsx, jsxs } from "react/jsx-runtime";
import { Download, FileCode, Image, FileDown } from "lucide-react";
export const QuickExport = ({ onExport, isExporting, svgContent, onCopy }) => {
  const handleCopySvg = () => {
    if (svgContent && onCopy) {
      onCopy(svgContent, "SVG Markup");
    } else {
      onExport({
        type: "REQUEST_EXPORT",
        format: "SVG",
        action: "copy"
      });
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 text-[11px] font-medium text-overlay1 mb-2", children: [
      /* @__PURE__ */ jsx(Download, { size: 12 }),
      /* @__PURE__ */ jsx("span", { children: "1-Click Asset Export" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-1.5", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          disabled: isExporting,
          onClick: handleCopySvg,
          className: "flex flex-col items-center justify-center p-2 rounded-md border border-surface1 bg-surface0 hover:bg-surface1/60 text-subtext1 hover:border-surface2 transition disabled:opacity-50 group",
          title: "Copy raw SVG markup to clipboard",
          children: [
            /* @__PURE__ */ jsx(FileCode, { size: 15, className: "text-peach mb-1 group-hover:scale-110 transition" }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px] font-medium", children: "Copy SVG" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          disabled: isExporting,
          onClick: () => onExport({
            type: "REQUEST_EXPORT",
            format: "SVG",
            action: "download"
          }),
          className: "flex flex-col items-center justify-center p-2 rounded-md border border-surface1 bg-surface0 hover:bg-surface1/60 text-subtext1 hover:border-surface2 transition disabled:opacity-50 group",
          title: "Download SVG vector file",
          children: [
            /* @__PURE__ */ jsx(FileDown, { size: 15, className: "text-green mb-1 group-hover:scale-110 transition" }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px] font-medium", children: "SVG File" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          disabled: isExporting,
          onClick: () => onExport({
            type: "REQUEST_EXPORT",
            format: "PNG",
            scale: 2,
            action: "download"
          }),
          className: "flex flex-col items-center justify-center p-2 rounded-md border border-surface1 bg-surface0 hover:bg-surface1/60 text-subtext1 hover:border-surface2 transition disabled:opacity-50 group",
          title: "Download 2x Retina PNG image",
          children: [
            /* @__PURE__ */ jsx(Image, { size: 15, className: "text-blue mb-1 group-hover:scale-110 transition" }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px] font-medium", children: "PNG @2x" })
          ]
        }
      )
    ] })
  ] });
};
