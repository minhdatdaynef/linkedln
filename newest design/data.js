/* Scout — mock data for the prototype (plain JS, attached to window.SCOUT) */
window.SCOUT = (function () {
  const JOBS = [
    {
      id: "j1",
      title: "Senior Marketing Manager",
      company: "Tiki Corporation",
      logo: "TK",
      location: "Quận 1, TP. Hồ Chí Minh",
      posted: "2 ngày trước",
      url: "https://www.linkedin.com/jobs/view/0001",
      salary: "30–45 triệu",
      worktime: "Toàn thời gian",
      experience: "5+ năm",
      seniority: "Mid-Senior",
      mode: "Hybrid",
      requirements: [
        "5+ năm kinh nghiệm marketing, ưu tiên ngành thương mại điện tử",
        "Thành thạo digital marketing, performance & brand",
        "Kỹ năng lãnh đạo đội nhóm 5–10 người",
      ],
      benefits: [
        "Lương tháng 13 + thưởng hiệu suất theo quý",
        "Bảo hiểm sức khỏe cao cấp cho cả gia đình",
        "Ngân sách đào tạo 20 triệu/năm",
      ],
    },
    {
      id: "j2",
      title: "Chuyên viên Truyền thông & Sự kiện",
      company: "VNG Group",
      logo: "VN",
      location: "Quận 7, TP. Hồ Chí Minh",
      posted: "5 giờ trước",
      url: "https://www.linkedin.com/jobs/view/0002",
      salary: "18–25 triệu",
      worktime: "Toàn thời gian",
      experience: "2–4 năm",
      seniority: "Associate",
      mode: "Onsite",
      requirements: [
        "Kinh nghiệm tổ chức sự kiện quy mô 200+ người",
        "Viết content tốt, tư duy storytelling",
        "Quản lý quan hệ báo chí & KOL",
      ],
      benefits: [
        "Môi trường trẻ, năng động",
        "Cơ hội làm việc với các dự án lớn",
        "Du lịch công ty 2 lần/năm",
      ],
    },
    {
      id: "j3",
      title: "Growth Marketing Lead",
      company: "MoMo (M_Service)",
      logo: "MM",
      location: "Hà Nội",
      posted: "1 tuần trước",
      url: "https://www.linkedin.com/jobs/view/0003",
      salary: "Thương lượng",
      worktime: "Toàn thời gian",
      experience: "4+ năm",
      seniority: "Mid-Senior",
      mode: "Remote",
      requirements: [
        "Kinh nghiệm growth/performance trong fintech hoặc app",
        "Thành thạo phân tích dữ liệu, A/B testing",
        "Tư duy data-driven & tối ưu CAC/LTV",
      ],
      benefits: [
        "ESOP cho vị trí lead",
        "Làm việc từ xa linh hoạt 100%",
        "MacBook + ngân sách thiết bị",
      ],
    },
    {
      id: "j4",
      title: "Brand Communications Executive",
      company: "Unilever Vietnam",
      logo: "UL",
      location: "Quận 1, TP. Hồ Chí Minh",
      posted: "3 ngày trước",
      url: "https://www.linkedin.com/jobs/view/0004",
      salary: "20–28 triệu",
      worktime: "Toàn thời gian",
      experience: "Mới ra trường",
      seniority: "Entry",
      mode: "Hybrid",
      requirements: [
        "Tốt nghiệp Marketing / Truyền thông / Báo chí",
        "Tiếng Anh giao tiếp tốt (IELTS 6.5+)",
        "Đam mê xây dựng thương hiệu",
      ],
      benefits: [
        "Chương trình Management Trainee danh tiếng",
        "Lộ trình thăng tiến rõ ràng",
        "Mentor 1:1 từ lãnh đạo cấp cao",
      ],
    },
  ];

  // A demo CV (parsed text) used when the user "attaches" a sample file.
  const SAMPLE_CV = `NGUYỄN MINH ANH
Marketing Executive · TP. Hồ Chí Minh · minhanh@email.com · 0901 234 567

MỤC TIÊU NGHỀ NGHIỆP
Marketing executive với 3 năm kinh nghiệm, mong muốn phát triển ở vị trí
quản lý marketing. Muốn áp dụng kỹ năng content và digital để tạo tăng trưởng.

KINH NGHIỆM
Marketing Executive — Công ty TNHH ABC (2022–nay)
• Quản lý kênh social media, tăng follower từ 10k lên 45k
• Lên kế hoạch nội dung hàng tháng
• Phối hợp với team design làm ấn phẩm truyền thông

Marketing Intern — Startup XYZ (2021–2022)
• Hỗ trợ chạy quảng cáo Facebook
• Viết bài blog SEO

KỸ NĂNG
Content writing, Facebook Ads, Canva, SEO cơ bản, Tiếng Anh

HỌC VẤN
Đại học Kinh tế TP.HCM — Cử nhân Marketing (2017–2021)`;

  // Precomputed AI analysis shown in the output panel for the demo.
  const ANALYSIS = {
    score: 68,
    summary:
      "CV của bạn có nền tảng marketing vững và thành tích social media ấn tượng. Tuy nhiên so với JD vị trí Senior Marketing Manager, bạn còn thiếu kinh nghiệm quản lý đội nhóm và các keyword về performance marketing. Với một vài điều chỉnh, mức độ phù hợp có thể lên trên 80%.",
    strengths: [
      "Thành tích định lượng rõ ràng (follower 10k → 45k)",
      "Nền tảng content & digital marketing vững",
      "Kinh nghiệm xuyên suốt trong ngành đúng chuyên môn",
    ],
    improvements: [
      "Chưa thể hiện kinh nghiệm quản lý / dẫn dắt đội nhóm",
      "Thiếu các keyword về performance marketing (CAC, ROAS, A/B testing)",
      "Mục tiêu nghề nghiệp còn chung chung, chưa gắn với vị trí ứng tuyển",
    ],
    suggestions: [
      "Viết lại mục tiêu nghề nghiệp hướng thẳng tới vai trò Senior Marketing Manager",
      "Bổ sung mọi trải nghiệm điều phối / dẫn dắt (dù là dự án nhỏ) để thể hiện leadership",
      "Lượng hóa thêm kết quả: ngân sách quảng cáo đã quản lý, ROAS, doanh thu đóng góp",
      "Thêm mục 'Kỹ năng chuyên môn' tách riêng với công cụ và nền tảng cụ thể",
    ],
    keywords: [
      "Performance Marketing",
      "Team Leadership",
      "ROAS",
      "Marketing Strategy",
      "Budget Management",
      "A/B Testing",
      "Stakeholder Management",
    ],
  };

  const IMPROVED_CV = `NGUYỄN MINH ANH
Senior Marketing Specialist · TP. Hồ Chí Minh
minhanh@email.com · 0901 234 567 · linkedin.com/in/minhanh

MỤC TIÊU NGHỀ NGHIỆP
Marketing specialist 3 năm kinh nghiệm trong digital & content marketing,
sở hữu thành tích tăng trưởng kênh social 350%. Hướng tới vai trò Senior
Marketing Manager, nơi tôi có thể dẫn dắt chiến lược thương hiệu và đội ngũ
để thúc đẩy tăng trưởng bền vững dựa trên dữ liệu.

KINH NGHIỆM
Marketing Executive — Công ty TNHH ABC (2022–nay)
• Tăng trưởng cộng đồng social media 350% (10k → 45k) trong 18 tháng thông
  qua chiến lược nội dung định hướng dữ liệu
• Điều phối kế hoạch nội dung đa kênh hàng tháng, làm việc liên phòng ban
  với design, sales và đối tác bên ngoài
• Dẫn dắt 2 cộng tác viên content, xây dựng quy trình duyệt bài & lịch đăng
• Tối ưu hiệu suất quảng cáo Facebook, cải thiện ROAS qua A/B testing

Marketing Intern — Startup XYZ (2021–2022)
• Vận hành chiến dịch quảng cáo Facebook với ngân sách thử nghiệm
• Sản xuất nội dung blog chuẩn SEO, tăng traffic tự nhiên

KỸ NĂNG CHUYÊN MÔN
Performance Marketing · Marketing Strategy · Content Strategy · A/B Testing
Facebook Ads Manager · Google Analytics · SEO · Canva · Budget Management

KỸ NĂNG MỀM
Team Leadership · Stakeholder Management · Project Coordination

HỌC VẤN
Đại học Kinh tế TP.HCM — Cử nhân Marketing (2017–2021)`;

  return { JOBS, SAMPLE_CV, ANALYSIS, IMPROVED_CV };
})();
