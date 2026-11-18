---
name: website-testing-debugging
description: Dùng khi website PTIT Career Hub gặp lỗi (trang trắng, không lưu dữ liệu, sai quyền, sai điểm, vỡ giao diện) hoặc cần kiểm thử sau mỗi giai đoạn – tái hiện lỗi, tìm nguyên nhân gốc, sửa tối thiểu và kiểm tra hồi quy.
---

# Testing & Debugging – Tìm và sửa lỗi PTIT Career Hub

## Mục đích
Giúp AI sửa lỗi **có phương pháp**: không đoán mò, không viết lại cả file, không sửa triệu chứng mà bỏ qua nguyên nhân. Mỗi lần sửa đều kèm cách kiểm tra lại.

## Khi nào dùng
- Có lỗi: trang trắng, lỗi console, dữ liệu không lưu hoặc không hiện, sai phân quyền, tính điểm sai, vỡ layout.
- Nghiệm thu cuối mỗi giai đoạn (12 giai đoạn trong master prompt).
- Trước khi deploy lên Firebase Hosting.

## Thông tin cần thu thập (thiếu thì hỏi lại)
1. **Bước tái hiện**: làm gì, ở trang nào, tài khoản vai trò gì.
2. **Kết quả mong đợi** so với **kết quả thực tế**.
3. **Lỗi console / network** (copy nguyên văn).
4. Môi trường: trình duyệt, desktop hay mobile, local hay đã deploy.
5. Thay đổi gần nhất trước khi lỗi xuất hiện.

## Quy trình
1. **Tái hiện**: viết lại các bước tái hiện cho rõ ràng.
2. **Khoanh vùng**: lỗi nằm ở lớp nào – UI → hook → service → Firestore/Rules → API → Gemini?
3. **Đưa giả thuyết**: tối đa 3 giả thuyết, xếp theo khả năng, mỗi cái kèm cách kiểm chứng (console.log, Network tab, Firebase Console, Rules Playground).
4. **Xác định nguyên nhân gốc** rồi mới sửa.
5. **Sửa tối thiểu**: chỉ sửa phần gây lỗi; trả về diff hoặc đoạn code thay đổi.
6. **Kiểm tra hồi quy**: chạy lại luồng bị lỗi và các luồng liên quan.
7. **Ghi nhật ký lỗi** theo mẫu bên dưới.

## Lỗi thường gặp trong dự án
| Triệu chứng | Nguyên nhân hay gặp |
|---|---|
| Trang trắng sau khi deploy | Thiếu cấu hình rewrite SPA trong `firebase.json`; thiếu biến môi trường `VITE_*` |
| `Missing or insufficient permissions` | Rules chặn; query thiếu điều kiện `status == 'published'` khớp với rule |
| Admin tạo xong sinh viên không thấy | Document vẫn ở `draft`; trang sinh viên đọc từ mock data |
| Reload mất tiến độ | Chỉ lưu trong state, chưa ghi vào `userProgress` |
| Điểm Career Check khác nhau mỗi lần | Có `Math.random()` hoặc AI tự chấm thay cho scoring logic |
| AI CV trả về thông tin bịa | Prompt Gemini thiếu ràng buộc "chỉ dùng dữ liệu người dùng cung cấp" |
| Gọi Gemini lỗi CORS / lộ key | Gọi Gemini trực tiếp từ client thay vì qua API backend |

## Mẫu nhật ký lỗi
```
### BUG-[số] – [tiêu đề ngắn]
- Mức độ: Nghiêm trọng / Trung bình / Nhẹ
- Bước tái hiện:
- Mong đợi / Thực tế:
- Nguyên nhân gốc:
- Cách sửa (file, dòng):
- Kiểm tra hồi quy: [luồng đã chạy lại]
- Trạng thái: Đã sửa / Chờ kiểm tra
```

## Checklist nghiệm thu mỗi giai đoạn
- [ ] Chức năng: các luồng chính chạy hết, không có trang trắng
- [ ] Giao diện: đúng Design System, đủ loading / empty / error
- [ ] Dữ liệu: lưu Firestore, reload vẫn còn, không dùng mock
- [ ] Quyền truy cập: thử bằng tài khoản khách, sinh viên A, sinh viên B, admin
- [ ] Responsive: 375px / 768px / 1280px
- [ ] GA4: sự kiện của giai đoạn này hiện trong DebugView
- [ ] Không còn lỗi nghiêm trọng trước khi sang giai đoạn sau
