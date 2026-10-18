export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            boxShadow: {
                'neon-blue': '0 0 20px rgba(34, 211, 238, 0.22)',
                'neon-purple': '0 0 22px rgba(168, 85, 247, 0.24)',
                'neon-red': '0 0 22px rgba(248, 113, 113, 0.24)',
            },
            keyframes: {
                scan: {
                    '0%': { transform: 'translateY(-100%)', opacity: '0' },
                    '10%': { opacity: '0.55' },
                    '90%': { opacity: '0.35' },
                    '100%': { transform: 'translateY(620px)', opacity: '0' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 12px rgba(74, 222, 128, 0.45)' },
                    '50%': { boxShadow: '0 0 30px rgba(74, 222, 128, 0.95)' },
                },
            },
            animation: {
                scan: 'scan 4s linear infinite',
                'pulse-glow': 'pulseGlow 1.8s ease-in-out infinite',
            },
        },
    },
    plugins: [],
};
