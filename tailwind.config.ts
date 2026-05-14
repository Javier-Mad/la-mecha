import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0D0D0D",
        surface: "#1A1A1A",
        ink: "#F5F0E8",
        ember: {
          deep: "#8B1A1A",
          bright: "#FF4500",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      animation: {
        flicker: "flicker 0.25s infinite alternate",
        flash: "flash 0.3s ease-out 1",
        pulse_red: "pulse_red 1.2s ease-in-out infinite",
      },
      keyframes: {
        flicker: {
          "0%": { transform: "scale(1) rotate(-2deg)", opacity: "1" },
          "100%": { transform: "scale(1.08) rotate(2deg)", opacity: "0.92" },
        },
        flash: {
          "0%": { opacity: "0" },
          "50%": { opacity: "0.85" },
          "100%": { opacity: "0" },
        },
        pulse_red: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(220,38,38,0.6)" },
          "50%": { boxShadow: "0 0 0 12px rgba(220,38,38,0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
