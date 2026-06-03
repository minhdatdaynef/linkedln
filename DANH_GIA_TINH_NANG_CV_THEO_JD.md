# Bản đánh giá tính năng "Xây dựng CV theo JD"
**Góc nhìn: Sinh viên cần update CV để apply theo một JD cụ thể**
Ngày đánh giá: 2026-06-03

---

## 1. Hiện trạng — Tính năng đang có gì

Tính năng nằm trong tab **"📄 Phân tích CV"** của web app, hoạt động như một **chatbot HR Consultant** (model Groq `llama-3.3-70b-versatile`).

| Thành phần | File | Chức năng |
|---|---|---|
| Chatbot tư vấn | `web/app/api/cv-chat/route.ts` | Chat + sinh khối `<analysis>` và `<improved_cv>` |
| Chấm điểm 1 lần | `web/app/api/cv-review/route.ts` | Trả `match_score`, strengths, gaps, suggestions, keywords |
| Lấy JD từ link | `web/app/api/fetch-jd/route.ts` | Bóc JD từ URL `linkedin.com/jobs/view/<id>` |
| Giao diện | `web/app/page.tsx` | Chat panel + panel phân tích, tracker 3 bước |

**Luồng người dùng hiện tại:**
1. Upload CV (PDF/DOCX/TXT) hoặc dán text
2. Thêm JD (file / dán text / link LinkedIn / chọn từ job đã crawl)
3. AI trả về: điểm phù hợp (%), điểm mạnh, điểm thiếu, gợi ý sửa, keywords ATS
4. Tab "CV cải thiện" cho phép xem bản gốc vs bản AI viết lại, Copy / Tải .txt
5. Quick actions: "Viết lại phần Kỹ năng", "Thêm keywords", "Rút gọn 1 trang"...

**Điểm đã làm tốt:**
- ✅ Trải nghiệm hội thoại tự nhiên, có quick action gợi ý
- ✅ Nhận nhiều định dạng input (file, text, link)
- ✅ Có so sánh Before/After và match score trực quan
- ✅ Đã cảnh báo "AI có thể thêm chi tiết chưa chính xác"
- ✅ Tracker 3 bước giúp người mới biết cần làm gì

---

## 2. Đánh giá theo nhu cầu thực tế của sinh viên

> Sinh viên thường: CV còn mỏng, ít kinh nghiệm, apply **nhiều JD khác nhau**, cần file đẹp để nộp ngay, lo qua được vòng lọc ATS, và **không biết viết gì cho "kêu"**.

### Mức độ đáp ứng hiện tại: ~5.5/10

| Nhu cầu của sinh viên | Hiện trạng | Đánh giá |
|---|---|---|
| Biết CV hợp JD bao nhiêu % | Có match_score | 🟢 Tốt |
| Biết thiếu gì, sửa gì | Có gaps + suggestions | 🟢 Tốt |
| Có bản CV sửa sẵn để dùng | Có `<improved_cv>` nhưng **chỉ là text thô** | 🟡 Yếu |
| **Tải về file CV đẹp (PDF/DOCX)** | **Chỉ có .txt** | 🔴 Thiếu |
| So sánh chính xác chỗ nào đổi | Toggle Before/After, **không highlight diff** | 🟡 Yếu |
| Lưu / quản lý nhiều phiên bản theo từng JD | **Không có** (mất hết khi refresh) | 🔴 Thiếu |
| Chống "bịa" thông tin | Chỉ cảnh báo bằng chữ | 🟡 Rủi ro cao |
| Qua vòng ATS thật | Chỉ gợi ý keyword chung chung | 🟡 Trung bình |

---

## 3. Các tính năng CẦN BỔ SUNG (ưu tiên theo tác động)

### 🔴 P0 — Bắt buộc, tác động lớn nhất

**3.1. Xuất CV ra file PDF/DOCX có định dạng đẹp**
- *Vấn đề:* Hiện chỉ tải được `.txt` (page.tsx dòng 820–831) — sinh viên **không thể nộp .txt** cho nhà tuyển dụng.
- *Đề xuất:* Tái sử dụng logic trong `gen_cv.py` (đã sinh được .docx đẹp với màu, bảng kỹ năng, divider). Cho AI trả về CV **có cấu trúc JSON theo section** (mục tiêu, kinh nghiệm, kỹ năng, học vấn...) thay vì text thô, rồi render thành .docx/.pdf qua template.
- *Lợi ích:* Biến công cụ từ "tư vấn" thành "tạo ra sản phẩm dùng được ngay".

**3.2. Highlight diff — chỉ rõ AI đã đổi gì**
- *Vấn đề:* Toggle "CV gốc / CV cải thiện" để cạnh nhau nhưng người dùng phải tự dò. Sinh viên không phân biệt được phần nào AI thêm mới (dễ vô tình nộp thông tin sai).
- *Đề xuất:* Highlight inline (xanh = thêm, đỏ gạch = bỏ) hoặc liệt kê "Những thay đổi chính: 1... 2...".

**3.3. Chống bịa thông tin (hallucination guard)**
- *Vấn đề:* Prompt yêu cầu AI "làm nổi bật thành tích bằng số liệu" (`cv-chat` dòng 32) → AI dễ **bịa số liệu** mà sinh viên không có. Đây là rủi ro nghiêm trọng nhất khi nộp CV thật.
- *Đề xuất:*
  - Tách rõ "đề xuất câu chữ" vs "chỗ cần BẠN điền số liệu thật" (dùng placeholder `[điền số liệu của bạn]`).
  - Khi AI thêm thành tích định lượng → đánh dấu `⚠️ cần xác nhận`.
  - Bổ sung chỉ thị trong system prompt: "Không được bịa con số, công ty, mốc thời gian mà CV gốc không có".

### 🟠 P1 — Tăng giá trị rõ rệt

**3.4. Lưu & quản lý nhiều phiên bản CV theo từng JD**
- *Vấn đề:* Mọi state nằm trong React useState → **refresh là mất sạch** (page.tsx dòng 111–126). Sinh viên apply 10 JD cần 10 CV khác nhau.
- *Đề xuất:* Lưu localStorage hoặc DB nhẹ: "CV cho [JD Marketing - ABC]", "CV cho [JD Content - XYZ]", kèm match score của từng bản.

**3.5. ATS Score thật + kiểm tra format**
- *Vấn đề:* `keywords_to_add` chỉ là gợi ý từ khóa, chưa phải đánh giá ATS thực.
- *Đề xuất:* Thêm checklist ATS: mật độ keyword, có dùng heading chuẩn, tránh bảng/ảnh phá parser, độ dài phù hợp, có động từ hành động.

**3.6. Cải thiện theo từng SECTION thay vì viết lại cả CV**
- *Vấn đề:* `<improved_cv>` viết lại toàn bộ → khó kiểm soát, dễ mất phần sinh viên thích.
- *Đề xuất:* Cho sửa & "Apply" từng phần (Mục tiêu / Kinh nghiệm / Kỹ năng) độc lập, mỗi phần có nút "Dùng bản này".

### 🟡 P2 — Nâng cao trải nghiệm

**3.7. Cover letter theo JD** — sinh viên rất cần, dùng lại data CV+JD đã có.
**3.8. Gợi ý câu hỏi phỏng vấn** dựa trên gaps đã phát hiện.
**3.9. Streaming response** — hiện chờ cả khối trả về (chậm với CV dài 4096 token).
**3.10. Đa ngôn ngữ** — CV song ngữ Anh/Việt cho vị trí quốc tế.

---

## 4. Lỗi & rủi ro kỹ thuật phát hiện được

| Vấn đề | Vị trí | Mức độ |
|---|---|---|
| Tên env var là `GROG_API_KEY` (sai chính tả "GROQ") | `cv-chat:61`, `cv-review:62` | 🟡 Gây nhầm lẫn khi cấu hình |
| CV bị cắt cứng 5000–6000 ký tự | `cv-chat:93`, `cv-review:105` | 🟠 CV dài bị mất nội dung âm thầm |
| `fetch-jd` parse HTML bằng regex, LinkedIn hay chặn server | `fetch-jd:60–78` | 🟠 Dễ fail, phụ thuộc HTML LinkedIn |
| Không validate kích thước/loại file upload | `cv-chat:78–81` | 🟡 File lớn/sai định dạng có thể lỗi |
| Mất toàn bộ dữ liệu khi refresh trang | `page.tsx` (useState) | 🟠 Trải nghiệm khó chịu |
| `cv-review` route gần như **không được UI dùng** (UI dùng `cv-chat`) | — | 🟡 Code trùng lặp, nên hợp nhất |

---

## 5. Lộ trình đề xuất (cho 1 sinh viên/dev tự làm)

**Giai đoạn 1 (giá trị cao, dễ làm trước):**
1. Xuất CV ra **.docx đẹp** (tái dùng `gen_cv.py`) — _P0_
2. Sửa system prompt **chống bịa số liệu** + dùng placeholder — _P0_
3. Lưu **localStorage** để không mất dữ liệu khi refresh — _P1_

**Giai đoạn 2:**
4. Highlight diff Before/After — _P0_
5. Quản lý nhiều phiên bản CV theo JD — _P1_
6. ATS checklist thật — _P1_

**Giai đoạn 3:**
7. Cover letter + câu hỏi phỏng vấn — _P2_
8. Streaming + xuất PDF — _P2_

---

## 6. Kết luận

Tính năng đã có **nền tảng tốt** (luồng chat, chấm điểm, gợi ý, so sánh) nhưng còn dừng ở mức **"tư vấn"** chứ chưa tới mức **"tạo ra CV dùng được"**. Với sinh viên, ba việc quan trọng nhất cần làm ngay là:

> **(1) Xuất file CV đẹp (.docx/.pdf)** thay vì .txt — **(2) Chống AI bịa thông tin** — **(3) Lưu nhiều phiên bản CV theo từng JD.**

Làm xong 3 điểm này, công cụ sẽ chuyển từ "thú vị để thử" sang "thực sự dùng để đi xin việc".
