/** @type {import('tailwindcss').Config} */

// Colours resolve through CSS custom properties defined in src/ui/styles.css,
// so the SAME utility class renders Catppuccin Latte in light mode and
// Catppuccin Mocha in dark mode. Prefer these semantic tokens over raw palette
// shades -- `dark:` variants are almost never needed for colour.
const ctp = (name) => `rgb(var(--ctp-${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./src/ui/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Structural / neutral
        base: ctp('base'),
        mantle: ctp('mantle'),
        crust: ctp('crust'),
        surface0: ctp('surface0'),
        surface1: ctp('surface1'),
        surface2: ctp('surface2'),
        overlay0: ctp('overlay0'),
        overlay1: ctp('overlay1'),
        overlay2: ctp('overlay2'),
        subtext0: ctp('subtext0'),
        subtext1: ctp('subtext1'),
        text: ctp('text'),

        // Accents
        rosewater: ctp('rosewater'),
        flamingo: ctp('flamingo'),
        pink: ctp('pink'),
        mauve: ctp('mauve'),
        red: ctp('red'),
        maroon: ctp('maroon'),
        peach: ctp('peach'),
        yellow: ctp('yellow'),
        green: ctp('green'),
        teal: ctp('teal'),
        sky: ctp('sky'),
        sapphire: ctp('sapphire'),
        blue: ctp('blue'),
        lavender: ctp('lavender'),
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
