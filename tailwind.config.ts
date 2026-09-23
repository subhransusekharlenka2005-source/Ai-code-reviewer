import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14171f",
        paper: "#efede4",
        paper2: "#e4e1d6",
        line: "#d3cfc0",
        signal: "#3454d1",
        crit: "#c1432b",
        warn: "#b8842a",
        good: "#3f8f5f",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
