# Nihongo Go · Flashcard tiếng Nhật

App học từ vựng và ngữ pháp JLPT (HTML / JS / Tailwind), chạy được offline như một app (PWA).

## Cấu trúc

```
index.html, app.js        giao diện + logic
src/styles.css            CSS nguồn  →  styles.css (file dựng ra, KHÔNG sửa tay)
data/levels.js            danh sách cấp độ N5…N1 + TANGO_DATA_VERSION
data/n2/*.js              dữ liệu N2: vocab, examples, synonyms, grammar
sw.js, manifest.webmanifest, icons/   PWA (offline, cài lên máy)
```

## Khi sửa

| Sửa gì | Cần làm thêm |
|---|---|
| Class Tailwind trong `index.html` / `app.js`, hoặc `src/styles.css` | `npm install` (lần đầu) rồi `npm run build:css` |
| Bất kỳ file nào trong `data/` | Tăng `TANGO_DATA_VERSION` trong `data/levels.js` |
| Thêm cấp mới (N3…) | Xem hướng dẫn ở đầu `data/levels.js` |

## Đưa lên GitHub Pages

Lần đầu:

```bash
git init
git add .
git commit -m "Nihongo Go"
git branch -M main
git remote add origin https://github.com/<tên-tài-khoản>/<tên-repo>.git
git push -u origin main
```

Sau đó vào repo trên GitHub → **Settings → Pages** → *Source*: **Deploy from a branch**, *Branch*: **main**, thư mục **/ (root)** → **Save**.
Khoảng 1–2 phút sau app có ở `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

Cập nhật về sau:

```bash
npm run build:css          # nếu có sửa giao diện
git add .
git commit -m "Mô tả thay đổi"
git push
```

App đã cài trên máy sẽ nhận bản mới ở lần mở tiếp theo khi có mạng.
