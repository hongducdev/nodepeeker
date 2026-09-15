/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./src/ui/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        figma: {
          bg: "var(--figma-color-bg, #ffffff)",
          text: "var(--figma-color-text, #333333)",
          secondary: "var(--figma-color-text-secondary, #8c8c8c)",
          border: "var(--figma-color-border, #e5e5e5)",
          hover: "var(--figma-color-bg-hover, #f5f5f5)",
          active: "var(--figma-color-bg-active, #ebebeb)",
          brand: "var(--figma-color-bg-brand, #0d99ff)",
          brandText: "var(--figma-color-text-onbrand, #ffffff)",
        }
      },
      fontFamily: {
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ]
      }
    },
  },
  plugins: [],
}
