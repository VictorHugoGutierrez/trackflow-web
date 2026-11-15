/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/views/**/*.ejs",
    "./src/**/*.{ts,js}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--foreground) / <alpha-value>)",
        },
        play: {
          DEFAULT: "hsl(var(--play) / <alpha-value>)",
          hover: "hsl(var(--play) / 0.9)",
          foreground: "#FFFFFF",
        },
        stop: {
          DEFAULT: "hsl(var(--stop) / <alpha-value>)",
          hover: "hsl(var(--stop) / 0.9)",
          foreground: "#FFFFFF",
        },
        "play-color": "hsl(var(--play) / <alpha-value>)",
        "stop-color": "hsl(var(--stop) / <alpha-value>)",
        dark: {
          bg: "#0F172A",
          card: "#1E293B",
          text: "#F8FAFC",
        },
        light: {
          bg: "#F1F5F9",
          card: "#FFFFFF",
          text: "#0F172A",
        },
      },
    },
  },
  plugins: [],
};
