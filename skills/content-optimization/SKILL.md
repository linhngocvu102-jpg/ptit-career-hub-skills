---
name: content-optimization
description: Dùng khi cần rà soát, chấm điểm và chỉnh sửa một bài đăng Fanpage PTIT Career Hub (do người hoặc AI viết) trước khi đăng – kiểm tra sự thật, giọng thương hiệu, độ dài, hook, CTA và hiển thị trên Facebook.
---

# Content Optimization – Rà soát và tối ưu bài trước khi đăng

## Mục đích
Đây là bước "biên tập viên" trước khi bài lên Fanpage. Workflow n8n lên lịch đăng sau 30 phút, và trong khoảng thời gian đó admin dùng skill này để rà bài. AI chấm điểm, chỉ ra lỗi và đưa **bản sửa giữ nguyên ý gốc**.

## Khi nào dùng
- Rà bài AI Agent vừa viết (sheet `Tự động`) trước giờ công khai.
- Bài đăng ít tương tác, cần viết lại.
- Tối ưu tiêu đề, mở đầu hoặc CTA.

## Đầu vào
1. Bài cần rà.
2. Ý tưởng hoặc dữ liệu gốc (để đối chiếu sự thật).
3. *(Nếu có)* Mục tiêu bài: nhận biết / tương tác / kéo về website.

## Quy trình
1. **Đối chiếu sự thật**: đánh dấu mọi chi tiết (ngày, số liệu, tên, link) không có trong dữ liệu gốc → bắt buộc xóa hoặc hỏi lại.
2. **Chấm điểm** theo bảng tiêu chí (thang 10).
3. **Liệt kê lỗi** theo mức độ: 🔴 phải sửa (sai sự thật, sai chính tả tên riêng, link sai), 🟡 nên sửa, 🟢 tùy chọn.
4. **Viết bản tối ưu**: chỉ sửa những gì cần, giữ ý và thông tin gốc.
5. *(Tùy chọn)* Đưa 2–3 phương án hook để A/B test.

## Bảng chấm điểm
| Tiêu chí | Điểm | Câu hỏi kiểm tra |
|---|---|---|
| Chính xác | 3 | Mọi thông tin đều có trong dữ liệu gốc? |
| Hook | 2 | 2 dòng đầu có khiến sinh viên dừng lướt? |
| Dễ đọc | 2 | Câu ngắn, có xuống dòng, dễ lướt trên điện thoại? |
| CTA | 2 | Có đúng 1 hành động rõ ràng? |
| Giọng thương hiệu | 1 | Thân thiện, không teencode, emoji vừa phải? |

**≥ 8:** đăng được. **6–7:** sửa các lỗi 🟡. **< 6** hoặc có lỗi 🔴 ở mục Chính xác: phải sửa trước khi đăng.

## Lưu ý riêng cho Facebook
- Facebook chỉ hiện khoảng 2–3 dòng đầu trước nút "Xem thêm", nên hook phải nằm ở đó.
- Không dùng Markdown (`**`, `###`) vì Facebook hiển thị nguyên ký tự.
- Link dài thì đặt ở cuối bài hoặc ở bình luận đầu tiên.
- Hashtag: 2–4 cái, đặt cuối bài.
- Kiểm tra chính tả tên riêng: PTIT, PTIT Career Hub, tên các ngành.

## Mẫu đầu ra
```
### Điểm: 6.5/10
### Lỗi
- 🔴 "Hạn nộp 15/12" không có trong dữ liệu gốc → xóa hoặc hỏi lại
- 🟡 Hook dài 3 câu, ý chính bị đẩy xuống dưới
- 🟢 Có thể thêm hashtag theo ngành
### Bản tối ưu
...
### Phương án hook (A/B)
A: ...
B: ...
```

## Checklist
- [ ] Không còn chi tiết ngoài dữ liệu gốc
- [ ] Điểm ≥ 8, không còn lỗi 🔴
- [ ] Hook nằm trong 2–3 dòng đầu
- [ ] Không còn ký tự Markdown
- [ ] Đã giữ đúng ý của bài gốc
