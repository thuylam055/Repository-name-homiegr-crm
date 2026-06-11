# QUẢN LÝ NỘI BỘ HOMIE - BẢN HOÀN CHỈNH

## Module có sẵn

- Dashboard
- Team
- Nhân sự
- Tuyển dụng
- Chủ nhà
- Dự án
- Báo cọc
- GDTC
- Thưởng nguồn
- Nhật ký hệ thống
- Xuất Excel
- Tất cả module có Thêm / Sửa / Xóa

## Mã nhân sự

- Sale: H01, H02...
- Leader: LD01, LD02...
- HR: HR01, HR02...
- Kế toán: KT01, KT02...
- Admin: AD01, AD02...
- Có thể tự nhập mã thủ công.

## Thưởng nguồn

- Mặc định: 100.000đ
- Báo cáo gồm:
  - Người lấy nguồn
  - Người chốt
  - Ngày lấy về
  - Ngày chốt
  - Dự án
  - Tiền thưởng
  - Trạng thái thanh toán

## Chạy local

```bash
npm install
npm run dev
```

## Kết nối Supabase

1. Vào Supabase > SQL Editor.
2. Chạy file `supabase/schema.sql`.
3. Tạo file `.env` từ `.env.example`.
4. Điền:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
5. Chạy lại:
```bash
npm run dev
```

## Deploy Vercel

Push lên GitHub, Vercel sẽ tự build.
