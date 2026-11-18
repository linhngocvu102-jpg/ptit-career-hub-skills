---
name: content-strategy
description: Dùng khi cần lên chiến lược hoặc kế hoạch nội dung cho Fanpage PTIT Career Hub – xác định chân dung người đọc, trụ cột nội dung, tỷ lệ bài và lịch đăng theo tuần/tháng, xuất ra đúng định dạng Google Sheets mà workflow n8n đọc được.
---

# Content Strategy – Kế hoạch nội dung Fanpage PTIT Career Hub

## Mục đích
Giúp AI lập kế hoạch nội dung **có định hướng**, không đăng ngẫu hứng. Mỗi bài phải phục vụ một mục tiêu (nhận biết, tương tác hoặc kéo người dùng về website) và thuộc một trụ cột nội dung cố định.

## Khi nào dùng
- Lên lịch nội dung tuần hoặc tháng mới.
- Fanpage ít tương tác, cần xem lại hướng đi.
- Có sự kiện lớn (mùa thực tập, ngày hội việc làm, ra mắt tính năng) cần một chuỗi bài.

## Chân dung người đọc
- **Chính:** sinh viên năm 1–4 khối Kinh tế PTIT – 7 ngành: Marketing, Fintech, Quản trị kinh doanh, Kế toán, Thương mại điện tử, Quan hệ công chúng, Logistics.
- **Nỗi lo:** không biết hợp nghề gì, thiếu kinh nghiệm, CV yếu, không biết tìm thực tập ở đâu.
- **Thói quen:** lướt Facebook buổi trưa và tối, thích nội dung ngắn, có ví dụ thực tế, có checklist để lưu lại.

## Trụ cột nội dung (content pillars)
| # | Trụ cột | Tỷ lệ | Mục tiêu | Ví dụ |
|---|---|---|---|---|
| 1 | Định hướng nghề theo ngành | 25% | Nhận biết | "Học Logistics ra làm gì? 5 vị trí cho fresher" |
| 2 | Kỹ năng xin việc & CV | 25% | Giá trị, lưu bài | "3 lỗi CV khiến sinh viên Marketing bị loại vòng gửi xe" |
| 3 | Cơ hội thực tập / việc làm | 20% | Về website (Job Hub) | "Tổng hợp 5 vị trí intern Fintech tuần này" |
| 4 | Giới thiệu tính năng website | 15% | Đăng ký, dùng thử | "Career Check 10 câu – biết nhóm năng lực của bạn" |
| 5 | Sự kiện & cộng đồng | 15% | Tương tác | "Ngày hội việc làm PTIT – lưu lịch ngay" |

## Quy trình
1. **Xác định mục tiêu giai đoạn** (ví dụ: tháng 12 tăng lượt làm Career Check).
2. **Kiểm tra đầu vào có thật**: sự kiện, tin tuyển dụng, tính năng mới mà nhóm cung cấp. Không tự đặt sự kiện hay tin tuyển dụng.
3. **Phân bổ bài** theo tỷ lệ trụ cột và số buổi đăng (mặc định 2 bài/ngày: 9:30 và 15:30, khớp lịch của Agent).
4. **Viết ý tưởng bài**: mỗi bài gồm chủ đề, trụ cột, góc tiếp cận, CTA, gợi ý ảnh trong Drive.
5. **Xuất bảng lịch** theo đúng cột của Google Sheets để workflow n8n đọc được.
6. **Đặt chỉ số đo**: reach, tương tác, click về website (GA4).

## Quy ước
- Không đặt 2 bài cùng trụ cột liền nhau.
- Mỗi tuần có ít nhất 1 bài dẫn về website (Career Check, Job Hub hoặc AI CV Builder).
- Tin tuyển dụng hay sự kiện chỉ lên lịch khi có thông tin thật (link, hạn, đơn vị tổ chức).
- Xoay vòng đủ 7 ngành trong tháng, không chỉ Marketing.

## Mẫu đầu ra – bảng dán vào Google Sheets
| Ngày đăng | Giờ đăng | Nội dung | Ảnh (link Drive) |
|---|---|---|---|
| 02/12/2026 | 09:30 | [Trụ cột 1] Học Logistics ra làm gì – 5 vị trí cho fresher, CTA: làm Career Check | *[link ảnh]* |
| 02/12/2026 | 15:30 | [Trụ cột 2] 3 lỗi CV thường gặp của sinh viên Marketing, CTA: thử AI CV Builder | *[link ảnh]* |

> Cột **Nội dung** chỉ ghi ý tưởng. Bài hoàn chỉnh do AI Agent trong workflow viết theo skill `social-copywriting`.

## Checklist
- [ ] Đúng tỷ lệ trụ cột, không trùng trụ cột liên tiếp
- [ ] Mỗi bài có mục tiêu và CTA
- [ ] Không có sự kiện hay tin tuyển dụng bịa
- [ ] Bảng đúng 4 cột, đúng định dạng ngày giờ để workflow đọc
