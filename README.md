# QUẢN LÝ NỘI BỘ HOMIE CRM

Bản CRM web thật để triển khai lâu dài.

## Chức năng có sẵn

- Đăng nhập mẫu / phân quyền: Admin, HR, Kế toán, Leader, Sale
- Dashboard
- Quản lý Team
- Quản lý Nhân sự
- Mã nhân viên:
  - Sale: H01, H02...
  - Leader: LD01, LD02...
  - HR: HR01, HR02...
  - Kế toán: KT01, KT02...
  - Admin: AD01, AD02...
- Có thể nhập mã NV thủ công
- Kiểm tra trùng mã NV
- Team xem được danh sách nhân sự bên trong
- Tuyển dụng lưu người tuyển
- Dự án lấy về
- Thưởng nguồn: 5% hoa hồng sale chốt + 2% phần công ty
- Thưởng tuyển dụng
- Báo cáo tháng
- Xuất Excel
- Chạy được trên máy tính và điện thoại

## Cách chạy thử trên máy

1. Cài NodeJS
2. Mở thư mục project
3. Chạy:

```bash
npm install
npm run dev
```

4. Mở link hiện ra trên trình duyệt.

## Kết nối Supabase

1. Tạo project Supabase
2. Vào SQL Editor
3. Chạy file `supabase/schema.sql`
4. Copy `.env.example` thành `.env`
5. Điền URL và ANON KEY của Supabase

Nếu chưa cấu hình Supabase, app vẫn có thể chạy demo bằng localStorage.
