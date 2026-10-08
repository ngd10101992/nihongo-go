/**
 * Cấu hình Tailwind. Sau khi sửa class trong index.html / app.js, chạy:
 *   npm run build:css      (tạo lại styles.css)
 *   npm run watch:css      (tự build lại mỗi khi lưu file)
 */
module.exports = {
  content: ['./index.html', './app.js'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Noto Sans JP"', 'system-ui', 'sans-serif'],
        jp: ['"Noto Serif JP"', '"Noto Sans JP"', 'serif'],
        jpsans: ['"Noto Sans JP"', '"Be Vietnam Pro"', 'sans-serif'],
      },
    },
  },
};
