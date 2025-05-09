import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        'xxs': '0.625rem', // 10px - Ultra small text
      },
      zIndex: {
        '-5': '-5',
        '-10': '-10',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // New refined color palette inspired by Weaverly
        "abyss": "#0E0E10", // Deep background
        "void": "#111114", // Nearly black, but softer
        "shadow": "#1B1B22", // Dark gray with subtle warmth
        "enigma": "#23232D", // Dark charcoal with hint of purple
        "whisper": "#DADAE2", // Light gray for primary text
        "rune": "#8F8F9C", // Medium gray for secondary text  
        "oracle": "#2A2A35", // Rich dark background for cards
        "mystic": "#242440", // Dark with blue-purple tone
        "twilight": "#16161D", // Deep shadow color
        "obsidian": "#0D0D11", // Near-black with texture
        "arcane": "#6D28D9", // Primary purple - vibrant but refined
        "silver": "#F0F0F5", // Bright highlight color
        "ember": "#E454A8", // Pink accent for important elements
        "celestial": "#3C82F6", // Blue accent for interactions
        "ethereal": "#2D2D39", // Elevated surface color
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "dark-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(109, 40, 217, 0.2)" },
          "50%": { boxShadow: "0 0 20px rgba(109, 40, 217, 0.4)" },
        },
        "ember-glow": {
          "0%": { textShadow: "0 0 5px rgba(228, 84, 168, 0.3)" },
          "100%": { textShadow: "0 0 15px rgba(228, 84, 168, 0.5)" },
        },
        "mystic-flow": {
          "0%, 100%": { borderColor: "rgba(109, 40, 217, 0.5)" },
          "50%": { borderColor: "rgba(228, 84, 168, 0.5)" },
        },
        "shadow-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "typing": {
          from: { width: "0" },
          to: { width: "100%" },
        },
        "blink-caret": {
          from: { borderColor: "transparent" },
          "50%": { borderColor: "#6D28D9" },
          to: { borderColor: "transparent" },
        },
        "loading": {
          "0%": { content: "''" },
          "25%": { content: "'·'" },
          "50%": { content: "'··'" },
          "75%": { content: "'···'" },
          "100%": { content: "''" },
        },
        "fade-in-out": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "rotate-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "morph": {
          "0%, 100%": { borderRadius: "60% 40% 30% 70%/60% 30% 70% 40%" },
          "25%": { borderRadius: "50% 50% 20% 80%/25% 80% 20% 75%" },
          "50%": { borderRadius: "30% 70% 70% 30%/50% 50% 50% 50%" },
          "75%": { borderRadius: "80% 20% 50% 50%/40% 30% 70% 60%" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200%" },
          "100%": { backgroundPosition: "200%" },
        },
        "dim-pulse": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.7" },
        },
        "floating-symbols": {
          "0%": { transform: "translateY(0) rotate(0)" },
          "50%": { transform: "translateY(-15px) rotate(5deg)" },
          "100%": { transform: "translateY(0) rotate(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "dark-pulse": "dark-pulse 4s infinite",
        "ember-glow": "ember-glow 2s infinite alternate",
        "mystic-flow": "mystic-flow 3s infinite",
        "shadow-float": "shadow-float 5s ease-in-out infinite",
        "typing": "typing 3.5s steps(40, end)",
        "blink-caret": "blink-caret 0.75s step-end infinite",
        "loading": "loading 1.5s infinite",
        "fade-in-out": "fade-in-out 4s infinite ease-in-out",
        "rotate-slow": "rotate-slow 12s linear infinite",
        "morph": "morph 10s ease-in-out infinite",
        "shimmer": "shimmer 3s infinite linear",
        "dim-pulse": "dim-pulse 3s infinite ease-in-out",
        "floating-symbols": "floating-symbols 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
