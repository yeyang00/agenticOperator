import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--c-bg)",
        surface: "var(--c-surface)",
        panel: "var(--c-panel)",
        raised: "var(--c-raised)",
        line: "var(--c-line)",
        "line-strong": "var(--c-line-strong)",
        "ink-1": "var(--c-ink-1)",
        "ink-2": "var(--c-ink-2)",
        "ink-3": "var(--c-ink-3)",
        "ink-4": "var(--c-ink-4)",
        accent: "var(--c-accent)",
        "accent-2": "var(--c-accent-2)",
        "accent-bg": "var(--c-accent-bg)",
        "accent-line": "var(--c-accent-line)",
        ok: "var(--c-ok)",
        "ok-bg": "var(--c-ok-bg)",
        warn: "var(--c-warn)",
        "warn-bg": "var(--c-warn-bg)",
        err: "var(--c-err)",
        "err-bg": "var(--c-err-bg)",
        info: "var(--c-info)",
        "info-bg": "var(--c-info-bg)",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans SC", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
      boxShadow: {
        "sh-1": "var(--sh-1)",
        "sh-2": "var(--sh-2)",
        "sh-3": "var(--sh-3)",
      },
      fontSize: {
        "2xs": "10.5px",
        "xs": "11px",
        "sm": "12px",
        "base": "13px",
      },
      animation: {
        pulse: "pulse 2s ease-in-out infinite",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
