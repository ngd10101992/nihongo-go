/**
 * Danh sách cấp độ hiển thị trên menu.
 *
 * Thêm một cấp mới (ví dụ N3):
 *   1. Tạo thư mục data/n3/ với các file cần có:
 *        vocab.js     -> tangoRegister('n3', 'vocab', [ ...bộ thẻ... ]);
 *        examples.js  -> tangoRegister('n3', 'examples', { "1": [{ jp, vi }], ... });   (tùy chọn)
 *        synonyms.js  -> tangoRegister('n3', 'synonyms', { "1": [{ w, r, m }], ... });  (tùy chọn)
 *        grammar.js   -> tangoRegister('n3', 'grammar', [ ...nhóm ngữ pháp... ]);      (tùy chọn)
 *        vocab-exercises.js   -> tangoRegister('n3', 'vocabExercises', { "1": { q, options, answer, vi, explain } });   (tùy chọn, tab Bài tập)
 *        grammar-exercises.js -> tangoRegister('n3', 'grammarExercises', { "1.0": [ { q, options, answer, vi, explain } ] }); (tùy chọn)
 *        examples-furigana.js -> tangoRegister('n3', 'examplesRuby', { "1": ["{漢字|かんじ}…"] });  (tùy chọn, câu ví dụ có furigana ở Ôn tập)
 *   2. Điền đường dẫn vào `files` của cấp đó bên dưới.
 * Cấp nào chưa có file sẽ hiện "Sắp có" trên menu. Không cần sửa app.js.
 */
window.TANGO_LEVELS = [
  { id: 'n5', label: 'N5', vocabSource: '729 từ vựng', files: { vocab: 'data/n5/vocab.js' } },
  { id: 'n4', label: 'N4', vocabSource: '969 từ vựng', files: { vocab: 'data/n4/vocab.js' } },
  { id: 'n3', label: 'N3', vocabSource: 'Mimikara N3', files: { vocab: 'data/n3/vocab.js' } },
  {
    id: 'n2',
    label: 'N2',
    vocabSource: 'Mimikara N2',
    grammarSource: 'Shinkanzen N2',
    files: {
      vocab: 'data/n2/vocab.js',
      examples: 'data/n2/examples.js',
      synonyms: 'data/n2/synonyms.js',
      grammar: 'data/n2/grammar.js',
      vocabExercises: 'data/n2/vocab-exercises.js',
      grammarExercises: 'data/n2/grammar-exercises.js',
      examplesRuby: 'data/n2/examples-furigana.js',
    },
  },
  { id: 'n1', label: 'N1', vocabSource: 'Mimikara N1', files: { vocab: 'data/n1/vocab.js' } },
];

// Phiên bản dữ liệu: đổi giá trị này mỗi khi sửa file trong data/ để trình duyệt tải lại bản mới
window.TANGO_DATA_VERSION = '2026-10-29.1';

// Các file dữ liệu gọi hàm này để đăng ký nội dung của mình
window.TANGO_DATA = {};
window.tangoRegister = (level, kind, data) => {
  (window.TANGO_DATA[level] ||= {})[kind] = data;
};
