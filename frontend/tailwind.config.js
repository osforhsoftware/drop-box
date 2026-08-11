/** @type {import('tailwindcss').Config} */

module.exports = {

    darkMode: ["class"],

    content: [

    "./src/**/*.{js,jsx,ts,tsx}",

    "./index.html"

  ],

  theme: {

    extend: {

      borderRadius: {

        lg: 'var(--radius)',

        md: 'calc(var(--radius) - 2px)',

        sm: 'calc(var(--radius) - 4px)'

      },

      colors: {

        brand: {

          DEFAULT: '#6DB161',

          light: '#84CC47',

          accent: '#6ADC54',

          dark: '#5a9a50',

        },

        background: 'hsl(var(--background))',

        foreground: 'hsl(var(--foreground))',

        card: {

          DEFAULT: 'hsl(var(--card))',

          foreground: 'hsl(var(--card-foreground))'

        },

        popover: {

          DEFAULT: 'hsl(var(--popover))',

          foreground: 'hsl(var(--popover-foreground))'

        },

        primary: {

          DEFAULT: 'hsl(var(--primary))',

          foreground: 'hsl(var(--primary-foreground))'

        },

        secondary: {

          DEFAULT: 'hsl(var(--secondary))',

          foreground: 'hsl(var(--secondary-foreground))'

        },

        muted: {

          DEFAULT: 'hsl(var(--muted))',

          foreground: 'hsl(var(--muted-foreground))'

        },

        accent: {

          DEFAULT: 'hsl(var(--accent))',

          foreground: 'hsl(var(--accent-foreground))'

        },

        destructive: {

          DEFAULT: 'hsl(var(--destructive))',

          foreground: 'hsl(var(--destructive-foreground))'

        },

        border: 'hsl(var(--border))',

        input: 'hsl(var(--input))',

        ring: 'hsl(var(--ring))',

        chart: {

          '1': 'hsl(var(--chart-1))',

          '2': 'hsl(var(--chart-2))',

          '3': 'hsl(var(--chart-3))',

          '4': 'hsl(var(--chart-4))',

          '5': 'hsl(var(--chart-5))'

        }

      },

      backgroundImage: {

        'brand-gradient': 'linear-gradient(135deg, #6DB161 0%, #84CC47 50%, #6ADC54 100%)',

        'brand-gradient-hover': 'linear-gradient(135deg, #84CC47 0%, #6ADC54 50%, #6DB161 100%)',

        'hero-gradient': 'linear-gradient(90deg, #6DB161, #84CC47, #6ADC54)',

      },

      boxShadow: {

        'brand-sm': '0 5px 20px rgba(109, 177, 97, 0.15)',

        'brand-md': '0 10px 30px rgba(109, 177, 97, 0.25)',

        'brand-lg': '0 20px 60px rgba(109, 177, 97, 0.35)',

      },

      keyframes: {

        'accordion-down': {

          from: {

            height: '0'

          },

          to: {

            height: 'var(--radix-accordion-content-height)'

          }

        },

        'accordion-up': {

          from: {

            height: 'var(--radix-accordion-content-height)'

          },

          to: {

            height: '0'

          }

        }

      },

      animation: {

        'accordion-down': 'accordion-down 0.2s ease-out',

        'accordion-up': 'accordion-up 0.2s ease-out'

      }

    }

  },

  plugins: [require("tailwindcss-animate")],

};

