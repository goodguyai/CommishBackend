import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "var(--radius-xs)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      colors: {
        surface: {
          base: "var(--surface-base)",
          elevated: "var(--surface-elevated)",
          overlay: "var(--surface-overlay)",
          card: "var(--surface-card)",
          hover: "var(--surface-hover)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        border: {
          subtle: "var(--border-subtle)",
          default: "var(--border-default)",
          emphasis: "var(--border-emphasis)",
        },
        brand: {
          teal: {
            400: "var(--brand-teal-400)",
            500: "var(--brand-teal-500)",
            600: "var(--brand-teal-600)",
            700: "var(--brand-teal-700)",
            DEFAULT: "var(--brand-teal)",
          },
          coral: {
            400: "var(--brand-coral-400)",
            500: "var(--brand-coral-500)",
            600: "var(--brand-coral-600)",
            DEFAULT: "var(--brand-coral-500)",
          },
          gold: {
            400: "var(--brand-gold-400)",
            500: "var(--brand-gold-500)",
            600: "var(--brand-gold-600)",
            DEFAULT: "var(--brand-gold-500)",
          },
          pink: {
            400: "var(--brand-pink-400)",
            500: "var(--brand-pink-500)",
            600: "var(--brand-pink-600)",
            DEFAULT: "var(--brand-pink-500)",
          },
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        depth1: "var(--shadow-depth1)",
        depth2: "var(--shadow-depth2)",
        depth3: "var(--shadow-depth3)",
        glow: "var(--shadow-glow)",
        glowStrong: "var(--shadow-glow-strong)",
      },
      backgroundImage: {
        "gradient-teal-radial": "var(--gradient-teal-radial)",
        "gradient-teal-angle": "var(--gradient-teal-angle)",
        "gradient-hero-angle": "var(--gradient-hero-angle)",
        "gradient-cta": "var(--gradient-cta)",
      },
      transitionTimingFunction: {
        brand: "var(--motion-ease)",
        spring: "var(--motion-spring)",
      },
      transitionDuration: {
        fast: "var(--motion-fast)",
        normal: "var(--motion-normal)",
        slow: "var(--motion-slow)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
