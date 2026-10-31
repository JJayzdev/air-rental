# A.I.R — bản Next.js (GĐ 0)

App Next.js 15 + TypeScript strict, port từ bản Vite ở thư mục cha. Giao diện giữ nguyên
(`globals.css` là bản sao y nguyên `../src/styles/site.css`), logic state chuyển sang TS.

Tài liệu đầy đủ về dự án, dữ liệu và lộ trình: [`../README.md`](../README.md),
[`../docs/ROADMAP.md`](../docs/ROADMAP.md).

## Chạy

```bash
npm install
cp .env.example .env.local   # không bắt buộc khi chạy local
npm run dev                  # http://localhost:3000
```

Bản production:

```bash
npm run build
npm start
```

## Lệnh

| Lệnh                   | Việc                               |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Dev server (cổng 3000)             |
| `npm run build`        | Build production                   |
| `npm start`            | Chạy bản build                     |
| `npm run lint`         | ESLint 9 flat config               |
| `npm run lint:fix`     | ESLint tự sửa                      |
| `npm run typecheck`    | `tsc --noEmit`                     |
| `npm run format`       | Prettier ghi đè                    |
| `npm run format:check` | Chỉ kiểm tra định dạng             |
| `npm run precommit`    | lint-staged (Husky gọi khi commit) |

## Cấu trúc

```
src/
  app/          App Router: layout, page, client-app, globals.css
  components/   app-shell (state), layout/, ui/, chat/
  views/        8 màn: Home … Account
  features/     schema Zod + domain dựng sẵn cho GĐ 1–2
  lib/          format, dates, pricing, order-code, storage, env, observability
  data/         products.ts
  types/        type dùng chung
```

## Ghi chú GĐ 0

- **Client-side toàn bộ**: `app/client-app.tsx` dùng `dynamic(..., { ssr: false })` vì app đọc
  `localStorage` ngay lần render đầu. GĐ 1 sẽ tách server component + URL routing.
- **CSS không sửa**: mọi thay đổi giao diện nên bắt đầu từ thư mục cha (`site.css`) rồi copy sang,
  để hai bản không lệch nhau trong thời gian song song.
- **Husky chưa cài hook** vì thư mục cha chưa phải git repo. Hook mẫu đã có ở
  `../.husky/pre-commit` (`cd web && npx lint-staged`). Sau `git init` ở gốc repo, chạy
  `npm install` trong `web/` — `prepare` là `cd .. && husky .husky`, tạo `.husky/_` ở gốc repo và
  trỏ `core.hooksPath` vào đó.
- **Env**: `lib/env.ts` validate bằng Zod. Build/CI có thể đặt `SKIP_ENV_VALIDATION=true`
  (xem `.github/workflows/ci.yml`).
