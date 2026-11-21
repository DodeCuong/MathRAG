# Kế hoạch 2 tuần: MathStorage

**Thời gian:** 23/11/2026 → 06/12/2026 (demo)
**Phân công:** Dương phụ trách Frontend, Thành phụ trách Database. Backend và AI/OCR làm chung.

## Ba vấn đề kỹ thuật (đã xử lý ngày 21/11)

1. **Nougat không trả ra `.tex` → đã có [backend/app/tex.py](backend/app/tex.py).** Lưu và cho người dùng sửa trên bản `.mmd`, đến lúc tải về mới gọi `mmd_to_tex()`. Hàm này bọc thêm preamble, chuyển heading/list/bold/italic, escape các ký tự đặc biệt và giữ nguyên công thức cùng các môi trường `\begin...\end`. Test: `python tests/test_tex.py`.
   - **Lưu ý cho frontend:** Nougat dùng `\(..\)` và `\[..\]`, còn `remark-math` chỉ nhận `$..$` và `$$..$$`. Trước khi đưa vào preview phải đổi dấu: `\(`/`\)` thành `$`, `\[`/`\]` thành `$$`.
2. **Nougat cần GPU → đã chạy được trên máy có Quadro T2000 4GB** (fp16, `nougat-small`), mỗi trang mất khoảng 9–11 giây. Lần chạy đầu tiên tải model về mất khoảng 3 phút. Code tự chọn `cuda`, `mps` hoặc `cpu`. Mỗi lần chỉ chạy một job OCR để tránh hết bộ nhớ GPU. File PDF giới hạn `OCR_MAX_PAGES` trang (mặc định 20).
   - **Chữ viết tay vẫn chưa giải quyết được:** Nougat chỉ được huấn luyện trên tài liệu in. Trang trắng đã được chặn (nếu không, Nougat sẽ tự bịa ra nội dung) và trả lỗi thân thiện. Chữ viết tay thì vẫn có thể ra kết quả sai mà hệ thống không phát hiện được. Thử ngay ngày 1 với tài liệu viết tay thật.
3. **Gọi Nougat qua `transformers` → đã có [backend/app/ocr.py](backend/app/ocr.py).** `ocr(path)` nhận PDF hoặc ảnh và trả về chuỗi `.mmd`. Nếu lỗi, hàm ném `OCRError`, message có thể hiển thị thẳng cho người dùng: `documents.py` bắt lỗi này rồi ghi vào `documents.error` cùng `status='failed'`.
   - Cài torch trước, theo đúng bản CUDA: `pip install torch --index-url https://download.pytorch.org/whl/cu126`, sau đó mới `pip install -r requirements.txt`.

## Các quyết định để giữ trong 2 tuần

| Hạng mục | Chọn | Bỏ qua |
|---|---|---|
| Lưu file | File gốc lưu trên **S3**. Nội dung `.mmd` lưu thẳng vào MySQL (cột `MEDIUMTEXT`) | Firebase |
| Xử lý OCR bất đồng bộ | Chạy OCR bằng `threading.Thread` trong Flask, frontend hỏi trạng thái 3 giây một lần | Celery/Redis: chỉ cần khi có nhiều người dùng cùng lúc |
| Đăng nhập | Frontend dùng `@react-oauth/google` để lấy ID token, backend kiểm tra token bằng `google-auth` rồi cấp JWT | Tự viết luồng OAuth bằng tay |
| Ô soạn thảo | `<textarea>` hoặc CodeMirror | Monaco |
| Xem trước | `react-markdown` + `remark-math` + `rehype-katex` | |

## API

```
POST   /api/auth/google            {credential} → {token, user}
GET    /api/documents              → danh sách tài liệu của user
POST   /api/documents              (multipart) → {id, status: "processing"}
GET    /api/documents/:id          → {status, content, original_url, error}
PUT    /api/documents/:id          {title, content}
DELETE /api/documents/:id
GET    /api/documents/:id/download → file .tex
```

## Database

```
users(id, google_sub UNIQUE, email, name, created_at)
documents(id, user_id FK, title, original_key, content MEDIUMTEXT,
          status ENUM('processing','done','failed'), error, created_at, updated_at)
```

## Cấu trúc thư mục

```
frontend/              React + Vite (Dương)
backend/
  run.py               chạy Flask
  tests/test_tex.py    test cho tex.py
  app/__init__.py      create_app, CORS, đăng ký blueprint
  app/auth.py          Google login, JWT (Dương)
  app/documents.py     API tài liệu (Thành)
  app/models.py        SQLAlchemy models (Thành)
  app/ocr.py           Nougat: ocr(path) -> mmd (đã xong)
  app/tex.py           mmd_to_tex() (đã xong)
docker-compose.yml     MySQL cho môi trường dev
```

## Lịch làm việc

**Cách chia việc:** phần database ít việc hơn frontend, nên Thành nhận thêm các API quản lý tài liệu và S3. Dương nhận phần đăng nhập ở backend (vì gắn liền với frontend).

**Đã xong trước lịch (21/11):** `ocr.py` (ban đầu là việc ngày 3 của Thành) và `tex.py` (ban đầu là việc ngày 6–7 của Dương). Các việc sau đó được kéo lên sớm hơn, nên Mốc 2 (deploy) sớm hơn 1 ngày và có thêm 1 ngày để thử với tài liệu thật.

### Tuần 1: chạy được trọn luồng ở máy local

| Ngày | Dương (Frontend + backend phần đăng nhập) | Thành (Database + backend phần tài liệu) | Làm chung |
|---|---|---|---|
| 1 | Tạo OAuth Client trên Google Cloud | Dựng MySQL bằng docker-compose | Chốt API và DB như trên. Cả hai cài venv backend (torch CUDA). **Chạy `ocr()` với 5–10 trang tài liệu thật, có cả chữ viết tay**, rồi quyết định phạm vi: chỉ nhận tài liệu in, hay cần tìm thêm model khác cho chữ viết tay |
| 2 | Dựng react-router, layout, trang Login | Viết model SQLAlchemy và tạo bảng | Hoàn thiện khung Flask, cấu hình `.env` |
| 3 | Nút Google Login, viết `POST /auth/google` (kiểm tra token, tạo user, cấp JWT), middleware `@login_required` | `POST /documents`: lưu file tạm ở máy, thêm dòng vào DB, chạy `ocr()` trong thread, bắt `OCRError` rồi ghi `status='failed'` + `error` | |
| 4 | Trang Upload: kéo thả file, kiểm tra loại file (ảnh/PDF) và dung lượng | `GET` danh sách và chi tiết, **kiểm tra tài liệu thuộc đúng user** | |
| 5 | Dashboard: danh sách tài liệu, badge trạng thái, polling, hiển thị `error` khi OCR thất bại | Tạo bucket S3, chuyển phần lưu file gốc sang S3, trả presigned URL | |
| 6–7 | Trang Editor chia 3 cột: file gốc (ảnh hoặc PDF trong `<iframe>`), ô soạn thảo, bản xem trước KaTeX. Đổi `\(..\)` thành `$..$` và `\[..\]` thành `$$..$$` trước khi đưa vào `remark-math` | `PUT` (lưu), `DELETE` (xoá cả file trên S3), `GET /download` (gọi `mmd_to_tex()`) | **Mốc 1:** đăng nhập → upload → OCR → thấy kết quả trên dashboard → mở Editor. Sửa lỗi |

### Tuần 2: hoàn thiện và triển khai

| Ngày | Dương | Thành | Làm chung |
|---|---|---|---|
| 8 | Xem trước cập nhật theo nội dung đang gõ (debounce), xử lý trường hợp công thức lỗi | Thêm index, kiểm tra quyền truy cập trên mọi endpoint, script backup DB | |
| 9 | Nút Lưu / Tải về / Xoá, thông báo toast, trạng thái loading và lỗi, hiển thị ổn trên mobile | Chuẩn bị máy deploy: GPU, driver CUDA, tải model về trước, MySQL production | |
| 10 | Deploy frontend (Vercel/Netlify) | Deploy MySQL và backend lên máy có GPU | **Mốc 2:** chạy được trên môi trường thật |
| 11–12 | | | Thử với tài liệu thật của sinh viên, sửa phần chuyển `.tex` và các lỗi UI |
| 13 | | | Dự phòng: sửa lỗi còn tồn đọng, cập nhật README (cách cài đặt, chạy, deploy) |
| 14 | | | Đóng băng code, chuẩn bị demo |

## Cách làm việc chung

- Mỗi người làm trên nhánh riêng (`fe/...`, `be/...`), merge qua PR và người kia review nhanh.
- Không commit file `.env`. Khi thêm biến môi trường mới thì cập nhật luôn `.env.example`.
- Đến cuối ngày 1, nếu Nougat chạy quá chậm hoặc đọc sai quá nhiều thì phải quyết định ngay: thuê GPU (Colab, Kaggle hay VM thuê theo giờ) hoặc giới hạn số trang.

## Chạy ở môi trường dev

```bash
docker compose up -d                     # MySQL
cd backend && python -m venv .venv && .venv/Scripts/activate
pip install torch --index-url https://download.pytorch.org/whl/cu126
pip install -r requirements.txt && cp .env.example .env
python tests/test_tex.py
python run.py                            # http://localhost:5000/api/health

cd frontend && npm install && cp .env.example .env
npm run dev                              # http://localhost:5173
```
