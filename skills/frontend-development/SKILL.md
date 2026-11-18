---
name: frontend-development
description: Dùng khi cần viết mới, sửa hoặc tối ưu code giao diện PTIT Career Hub (React 19, TypeScript, Vite, Tailwind CSS, Motion, Lucide) theo đúng cấu trúc thư mục và quy ước code của nhóm.
---

# Frontend Development – Sửa code giao diện PTIT Career Hub

## Mục đích
Giúp AI sửa hoặc thêm code frontend **đúng chỗ, ít thay đổi, không phá cấu trúc**. AI phải đọc code hiện có trước, chỉ sửa phần cần sửa, và giải thích được mình đã sửa gì.

## Khi nào dùng
- Hiện thực một thay đổi giao diện (thường do skill `ui-ux-design` bàn giao).
- Thêm component, trang hoặc route mới.
- Refactor code bị dồn vào `App.tsx` hoặc lặp lại nhiều nơi.
- Sửa lỗi hiển thị, responsive, animation.

## Bối cảnh kỹ thuật
- React 19 + TypeScript + Vite, Tailwind CSS, Motion (animation), Lucide React (icon).
- Dữ liệu lấy qua `services/` (Firebase / API backend). Component **không** gọi Firestore trực tiếp.

```
src/
├── pages/        # mỗi trang trong sitemap: public/, student/, admin/
├── components/   # ui/ (Design System), layout/, features/<module>/
├── services/     # firebase.ts, authService.ts, jobService.ts, geminiService.ts…
├── hooks/        # useAuth, useProfile, useJobs…
├── types/        # interface dùng chung
├── utils/        # scoring, format, validate
├── config/       # trọng số, hằng số, routes
└── data/         # dữ liệu mẫu (chỉ dùng cho dev/seed)
```

## Quy trình
1. **Đọc trước khi sửa**: yêu cầu xem các file liên quan (page, component, hook, type). Chưa có code thì hỏi, không đoán.
2. **Xác định phạm vi**: liệt kê các file sẽ sửa hoặc tạo. Không đụng file ngoài danh sách.
3. **Viết code** theo quy ước bên dưới.
4. **Trả kết quả theo từng file**: đường dẫn + code đầy đủ của phần thay đổi (hoặc diff), không trả cả project.
5. **Tự kiểm tra**: TypeScript không lỗi, không còn import thừa, chạy được trên mobile.
6. **Ghi chú**: 2–5 dòng giải thích thay đổi và cách kiểm tra lại.

## Quy ước code
- Component dạng function, đặt tên PascalCase; mỗi file 1 component chính, dưới khoảng 200 dòng.
- Props có `interface` riêng; **không dùng `any`**.
- Logic nghiệp vụ (tính điểm, matching) nằm trong `utils/` hoặc `services/`, không viết trong JSX.
- Trọng số và cấu hình nằm trong `config/`, không hard-code trong component.
- **Không hard-code API key**; dùng `import.meta.env.VITE_*` cho key công khai, còn key bí mật (Gemini) phải gọi qua backend.
- Styling chỉ dùng Tailwind class; dùng lại component trong `components/ui/`.
- Mọi lệnh gọi dữ liệu xử lý đủ 3 trạng thái `loading` / `error` / `empty`.
- Không dùng dữ liệu trong `data/` làm nguồn hiển thị chính ở production.
- Animation (Motion) ngắn (≤300ms), không cản thao tác.
- Gắn sự kiện GA4 đúng tên trong danh sách (`job_view`, `job_click_apply`…), không gửi dữ liệu cá nhân.

## Mẫu đầu ra
```
### Phạm vi thay đổi
- Sửa: src/pages/student/CareerResultPage.tsx
- Tạo: src/components/features/career/TopCareerCard.tsx

### Code
// src/components/features/career/TopCareerCard.tsx
...

### Giải thích
### Cách kiểm tra
1. Đăng nhập tài khoản sinh viên đã làm Career Check → vào /student/career-check/result
2. Thu nhỏ màn hình về 375px → card xếp dọc
```

## Ví dụ
**Đầu vào:** "Trang Job Hub lọc theo cấp độ không chạy, chọn Intern vẫn hiện Junior."

**Hướng xử lý đúng:** xem `JobHubPage.tsx`, `useJobs.ts`, `types/job.ts` → phát hiện filter so sánh `'intern'` với giá trị `'Intern'` trong dữ liệu → chuẩn hóa level bằng enum `JobLevel` trong `types/`, sửa hàm filter trong hook, **không** sửa UI.

## Checklist
- [ ] Đã đọc code hiện có trước khi sửa
- [ ] Chỉ sửa các file trong phạm vi đã nêu
- [ ] Không có `any`, không hard-code key hay trọng số
- [ ] Đủ loading / empty / error
- [ ] Responsive ở 375px, 768px, 1280px
- [ ] Có hướng dẫn kiểm tra lại
