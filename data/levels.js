/**
 * Danh sách cấp độ hiển thị trên menu.
 *
 * Thêm một cấp mới (ví dụ N3):
 *   1. Tạo thư mục data/n3/ với các file cần có:
 *        vocab.js     -> tangoRegister('n3', 'vocab', [ ...bộ thẻ... ]);
 *        examples.js  -> tangoRegister('n3', 'examples', { "1": [{ jp, vi }], ... });   (tùy chọn)
 *        synonyms.js  -> tangoRegister('n3', 'synonyms', { "1": [{ w, r, m }], ... });  (tùy chọn)
 *        grammar.js   -> tangoRegister('n3', 'grammar', [ ...nhóm ngữ pháp... ]);      (tùy chọn)
 *   2. Điền đường dẫn vào `files` của cấp đó bên dưới.
 * Cấp nào chưa có file sẽ hiện "Sắp có" trên menu. Không cần sửa app.js.
 */
window.TANGO_LEVELS = [
  { id: 'n5', label: 'N5', files: {} },
  { id: 'n4', label: 'N4', files: {} },
  { id: 'n3', label: 'N3', files: {} },
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
    },
  },
  { id: 'n1', label: 'N1', files: {} },
];

// Phiên bản dữ liệu: đổi giá trị này mỗi khi sửa file trong data/ để trình duyệt tải lại bản mới
window.TANGO_DATA_VERSION = '2026-10-07.1';

// Các file dữ liệu gọi hàm này để đăng ký nội dung của mình
window.TANGO_DATA = {};
window.tangoRegister = (level, kind, data) => {
  (window.TANGO_DATA[level] ||= {})[kind] = data;
};
