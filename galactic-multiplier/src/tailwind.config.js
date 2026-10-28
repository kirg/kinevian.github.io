/** Build: see README.md */
module.exports = {
  content: ['./index.html', './app.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Fredoka', 'ui-rounded', '-apple-system', 'system-ui', 'sans-serif'],
        game: ['"Press Start 2P"', 'monospace'],
      },
      screens: {
        // Short phones (iPhone SE / mini, landscape) need a more compact layout.
        short: { raw: '(max-height: 700px)' },
      },
    },
  },
  plugins: [],
};
