---
name: ui-ux-design
description: Dùng khi cần thiết kế lại hoặc chỉnh sửa giao diện, bố cục, luồng thao tác của một trang trong PTIT Career Hub mà vẫn giữ đúng Design System và nhận diện thương hiệu.
---

# UI/UX Design – Sửa và cải thiện giao diện PTIT Career Hub

## Mục đích
Giúp AI đề xuất và chỉnh sửa giao diện theo đúng phong cách CareerTech của dự án: chuyên nghiệp, trẻ trung, tối giản, dùng card, có biểu đồ và thanh tiến độ. Trước khi sửa giao diện, AI phải **phân tích vấn đề trải nghiệm** rồi mới đưa giải pháp, không chỉ "làm cho đẹp hơn".

## Khi nào dùng
- Một trang khó dùng, rối, thiếu thông tin hoặc thiếu nút hành động.
- Cần thêm trạng thái loading / empty / error cho một trang.
- Trang hiển thị lỗi trên mobile hoặc tablet.
- Cần thiết kế trang mới thuộc sitemap (Student, Admin, Public).

## Đầu vào cần có
1. Tên trang và khu vực (Public / Student / Admin).
2. Ảnh chụp màn hình hoặc mô tả hiện trạng.
3. Vấn đề gặp phải hoặc mục tiêu cần đạt.
4. *(Nếu có)* File component hiện tại.

## Quy trình
1. **Xác định người dùng và mục tiêu của trang**: ai dùng trang này, họ cần làm xong việc gì.
2. **Đánh giá hiện trạng** theo 5 tiêu chí: thứ bậc thông tin, hành động chính, độ dài văn bản, các trạng thái (loading/empty/error), responsive.
3. **Liệt kê vấn đề** theo mức độ: 🔴 chặn thao tác, 🟡 gây khó hiểu, 🟢 thẩm mỹ.
4. **Đề xuất bố cục mới** dạng wireframe chữ (khối, thứ tự, nội dung từng khối).
5. **Ghép vào Design System**: chỉ dùng component có sẵn (Button, Card, Badge, Progress bar, Tabs, Modal, Toast…). Nếu cần component mới thì nói rõ lý do.
6. **Bàn giao**: mô tả thay đổi kèm yêu cầu cụ thể cho skill `frontend-development` thực hiện.

## Quy ước bắt buộc
- **Không đổi màu thương hiệu, font, logo** khi chưa được yêu cầu.
- Mỗi màn hình có **đúng 1 nút hành động chính** (primary button).
- Trang kết quả (Career Check, Skill Gap, Job Matching): ưu tiên số liệu, biểu đồ và badge; mỗi đoạn văn tối đa 3 dòng.
- Student và Admin dùng **layout riêng**, không lẫn menu của nhau.
- Mọi danh sách phải có đủ 3 trạng thái: loading (skeleton), empty (có hướng dẫn bước tiếp theo), error (có nút thử lại).
- Responsive: thiết kế mobile trước, rồi mở rộng cho tablet (≥768px) và desktop (≥1024px).
- Chữ hiển thị cho sinh viên dùng tiếng Việt; thuật ngữ sản phẩm giữ tiếng Anh (Career Check, Roadmap, Job Hub).

## Mẫu đầu ra
```
## Trang: [tên] – Khu vực: [Student/Admin/Public]
### Mục tiêu người dùng
### Vấn đề hiện tại
- 🔴 ...
- 🟡 ...
### Bố cục đề xuất
[Header] ...
[Khối 1 – Card tổng quan] ...
[Khối 2 – ...] ...
[CTA chính] ...
### Trạng thái: loading / empty / error
### Responsive: mobile / tablet / desktop
### Yêu cầu chuyển cho frontend-development
```

## Ví dụ
**Đầu vào:** "Trang Kết quả Career Check toàn chữ, sinh viên đọc xong không biết làm gì tiếp."

**Đầu ra (rút gọn):**
- 🔴 Không có nút đi tiếp sang Định hướng hoặc Roadmap.
- 🟡 Điểm 4 nhóm năng lực (CR/AN/OP/CO) nằm trong đoạn văn, khó so sánh.
- Bố cục mới: biểu đồ radar 4 nhóm → card "Nhóm nổi trội" → 3 card Top nghề kèm % phù hợp và 2 dòng lý do → CTA chính "Xem lộ trình cho nghề này".
- Empty state: chưa làm bài thì hiện nút "Làm Career Check nhanh (10 câu)".

## Checklist trước khi bàn giao
- [ ] Không đổi nhận diện thương hiệu
- [ ] Có 1 CTA chính rõ ràng
- [ ] Đủ 3 trạng thái loading / empty / error
- [ ] Đã mô tả hiển thị trên mobile
- [ ] Chỉ dùng component trong Design System, hoặc đã giải thích lý do thêm component mới
