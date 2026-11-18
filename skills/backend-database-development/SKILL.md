---
name: backend-database-development
description: Dùng khi cần sửa hoặc thêm phần dữ liệu và phía server của PTIT Career Hub – Firebase Authentication, cấu trúc Firestore, Security Rules, API Node.js/Express (gồm API gọi Gemini) – đảm bảo phân quyền và đồng bộ dữ liệu Admin → Sinh viên.
---

# Backend & Database – Firebase, Firestore và API cho PTIT Career Hub

## Mục đích
Giúp AI thay đổi dữ liệu và logic phía server **an toàn**: không mở toang database, không lộ API key, không làm mất dữ liệu cũ, và dữ liệu Admin xuất bản thì sinh viên phải thấy được.

## Khi nào dùng
- Thêm hoặc sửa field, collection trong Firestore.
- Viết hoặc sửa Firestore Security Rules.
- Sửa luồng đăng ký, đăng nhập, phân quyền Admin.
- Viết API Express (ví dụ `/api/cv/analyze` gọi Gemini).
- Lỗi "Admin tạo xong mà sinh viên không thấy", "reload là mất dữ liệu".

## Bối cảnh
- Collection chính: `users`, `majors`, `careerFields`, `careers`, `assessments`, `assessmentResults`, `skills`, `careerPaths`, `roadmapTasks`, `jobs`, `events`, `savedJobs`, `savedEvents`, `userProgress`, `notifications`, `analyticsEvents`.
- Vai trò: `student`, `admin`. Quyền Admin xác định bằng **custom claims** (hoặc document role chỉ backend ghi được), **không** dùng field mà client tự sửa được.
- Nội dung quản trị có trạng thái: `draft` → `published` → `archived` (việc làm có thêm `closed`).

## Quy trình
1. **Mô tả thay đổi dữ liệu** trước khi code: collection, field, kiểu dữ liệu, quan hệ, ai được đọc/ghi.
2. **Đánh giá ảnh hưởng**: dữ liệu cũ có cần migrate không? Trang hoặc service nào đang dùng field này?
3. **Viết Security Rules** cho thay đổi đó, kèm ít nhất 3 tình huống kiểm thử (sinh viên chủ sở hữu, sinh viên khác, admin).
4. **Viết service / API**: hàm trong `services/` (client) hoặc route Express (server), có validate đầu vào và xử lý lỗi.
5. **Kiểm tra đồng bộ**: Admin tạo → lưu Firestore → published → sinh viên thấy → reload vẫn còn.

## Quy ước bắt buộc
- **Không** dùng rule `allow read, write: if request.auth != null;` cho toàn database.
- Sinh viên chỉ ghi được document của chính mình (`request.auth.uid == userId`).
- Sinh viên chỉ đọc nội dung `status == 'published'` của `jobs`, `events`, `careers`, `careerPaths`.
- Không cho client tự ghi field `role`.
- **Gemini API key chỉ nằm ở server** (biến môi trường), client gọi qua API của mình.
- Đổi định hướng nghề nghiệp **không xóa** roadmap cũ, chỉ đánh dấu `archived`.
- Mọi document có `createdAt`, `updatedAt` (serverTimestamp); nội dung quản trị có thêm `createdBy`.
- Trọng số Career Check và Job Matching lưu trong config hoặc collection có `version`, không viết cứng trong code.

## Mẫu đầu ra
```
### Thay đổi dữ liệu
| Collection | Field | Kiểu | Ghi chú |
### Security Rules
### Test rules
| Tình huống | Kỳ vọng |
### Service / API
### Migrate dữ liệu cũ (nếu có)
### Cách kiểm tra đồng bộ
```

## Ví dụ – Rules cho `jobs`
```
match /jobs/{jobId} {
  allow read: if resource.data.status == 'published' || isAdmin();
  allow create, update, delete: if isAdmin();
}
function isAdmin() {
  return request.auth != null && request.auth.token.admin == true;
}
```
| Tình huống | Kỳ vọng |
|---|---|
| Sinh viên đọc job `published` | Cho phép |
| Sinh viên đọc job `draft` | Từ chối |
| Sinh viên sửa job | Từ chối |
| Admin tạo job | Cho phép |

## Checklist
- [ ] Đã mô tả thay đổi dữ liệu và ảnh hưởng
- [ ] Rules không mở toàn database; có test 3 vai trò
- [ ] Không lộ API key ra client
- [ ] Không xóa dữ liệu lịch sử của sinh viên
- [ ] Admin xuất bản → sinh viên thấy → reload vẫn còn
