# -*- coding: utf-8 -*-
"""Bo loc TITLE dung chung — ap NGAY khi crawl (LinkedIn + VNW) de chi mang job
marketing/truyen thong ve, khoi ton cong cham diem job khong lien quan."""
import re

# Title PHAI thuoc marketing/truyen thong (hoac dong nghia)
_MKT_TITLE = re.compile(
    r"marketing|mkt|truyền thông|truyen thong|communication|comms|\bpr\b|"
    r"thương hiệu|thuong hieu|\bbrand\b|content|nội dung|noi dung|social|\bmedia\b|"
    r"event|sự kiện|su kien|activation|digital|\bseo\b|\bsem\b|quảng cáo|quang cao|"
    r"\bads?\b|advertising|copywrit|creative|sáng tạo|community|\bkol\b|\bkoc\b|influencer|marcom",
    re.IGNORECASE,
)
# Title co dau hieu SALES/kinh doanh -> loai (ung vien tranh sale)
_SALES_TITLE = re.compile(
    r"\bsales?\b|\bsale\b|bán hàng|ban hang|kinh doanh|business development|\bbd\b|"
    r"telesales|tuyển sinh|tuyen sinh|account executive|account manager",
    re.IGNORECASE,
)
# Title cap quan ly / CTV / intern -> loai
_BAD_LEVEL_TITLE = re.compile(
    r"\bmanager\b|\bdirector\b|\bhead\b|\blead\b|\bleader\b|trưởng nhóm|trưởng phòng|"
    r"\bchief\b|\bcmo\b|giám đốc|\bctv\b|cộng tác viên|collaborator|\bintern\b|thực tập|"
    r"\bsupervisor\b|giám sát|senior expert|\bexpert\b",
    re.IGNORECASE,
)


def title_ok(title: str) -> bool:
    """True neu title thuoc marketing va KHONG phai sales/quan ly."""
    t = title or ""
    return bool(_MKT_TITLE.search(t)) and not _SALES_TITLE.search(t) and not _BAD_LEVEL_TITLE.search(t)
