"""
fb_check.py — Kiểm tra kết nối tới Facebook Page (verify token + thử đăng bài).

Cách dùng:
    # 1) Verify token + liệt kê các Page bạn quản trị (KHÔNG đăng gì)
    python fb_check.py --token "EAAB...token-cua-ban..."

    # 2) Thử ĐĂNG 1 bài test lên Page (ghi thật lên Page!)
    python fb_check.py --token "EAAB..." --post "Bai test tu fb_check.py"

Lưu ý:
    - Bước (2) sẽ đăng bài THẬT lên Page. Bài sẽ hiện công khai (hoặc theo quyền Page).
      Bạn có thể vào Page xoá lại sau. Script sẽ in ra link/post-id để bạn xoá.
    - Token có thể là User Token hoặc Page Token. Script tự xử lý cả 2:
        * User Token  -> gọi /me/accounts để lấy danh sách Page + Page Token riêng.
        * Page Token  -> dùng trực tiếp.
"""
import argparse
import sys
import requests

GRAPH = "https://graph.facebook.com/v21.0"


def get(path, token, **params):
    params["access_token"] = token
    r = requests.get(f"{GRAPH}/{path}", params=params, timeout=20)
    return r.status_code, r.json()


def post(path, token, **data):
    data["access_token"] = token
    r = requests.post(f"{GRAPH}/{path}", data=data, timeout=20)
    return r.status_code, r.json()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--token", required=True, help="Access token (User hoặc Page)")
    ap.add_argument("--post", default=None, help="Nội dung bài test muốn đăng (bỏ trống = chỉ verify)")
    ap.add_argument("--page-id", default=None, help="Chỉ định Page ID nếu bạn quản trị nhiều Page")
    args = ap.parse_args()

    # --- 1) Token này là của ai? -------------------------------------------
    print("=" * 60)
    print("[1] Verify token — token này thuộc về ai?")
    code, me = get("me", args.token, fields="id,name")
    if code != 200:
        print(f"  ❌ Token KHÔNG hợp lệ (HTTP {code}):")
        print("     ", me.get("error", {}).get("message", me))
        sys.exit(1)
    print(f"  ✅ Token sống. Chủ thể: {me.get('name')} (id={me.get('id')})")

    # --- 2) Tìm các Page mà token này quản trị -----------------------------
    print("=" * 60)
    print("[2] Các Page token này quản trị được:")
    code, accts = get("me/accounts", args.token,
                      fields="id,name,access_token,tasks")
    pages = accts.get("data", []) if code == 200 else []

    page_token = None
    page_id = None
    page_name = None

    if pages:
        for p in pages:
            tasks = ",".join(p.get("tasks", []))
            print(f"  • {p['name']} (id={p['id']})  | quyền: {tasks or '—'}")
        # chọn Page
        if args.page_id:
            chosen = next((p for p in pages if p["id"] == args.page_id), None)
        else:
            chosen = pages[0]
        if chosen:
            page_id = chosen["id"]
            page_name = chosen["name"]
            page_token = chosen["access_token"]  # Page Token riêng cho Page này
    else:
        # Có thể token được dán vào ĐÃ là Page Token -> /me chính là Page
        # Thử coi token này như Page token luôn.
        print("  (Không thấy danh sách Page qua /me/accounts —")
        print("   có thể token bạn dán ĐÃ là Page Token. Sẽ thử dùng trực tiếp.)")
        page_id = args.page_id or me.get("id")
        page_name = me.get("name")
        page_token = args.token

    if not page_token:
        print("  ❌ Không xác định được Page để thao tác. Kiểm tra lại token/quyền.")
        sys.exit(1)

    # --- 3) Đọc thử thông tin Page (xác nhận đúng Page) --------------------
    print("=" * 60)
    print(f"[3] Đọc thử thông tin Page đang nhắm tới: {page_name} (id={page_id})")
    code, info = get(page_id, page_token,
                     fields="name,fan_count,followers_count,link,category")
    if code == 200:
        print(f"  ✅ Tên     : {info.get('name')}")
        print(f"     Follower: {info.get('followers_count', info.get('fan_count', '—'))}")
        print(f"     Hạng mục: {info.get('category', '—')}")
        print(f"     Link    : {info.get('link', '—')}")
    else:
        print(f"  ⚠️  Không đọc được Page (HTTP {code}): "
              f"{info.get('error', {}).get('message', info)}")

    # --- 4) Thử ĐĂNG bài (chỉ khi có --post) ------------------------------
    if args.post is None:
        print("=" * 60)
        print("Xong phần verify. Muốn thử ĐĂNG bài test thì chạy lại kèm:")
        print('   --post "Noi dung test"')
        return

    print("=" * 60)
    print(f"[4] Thử ĐĂNG bài test lên Page: {page_name}")
    code, res = post(f"{page_id}/feed", page_token, message=args.post)
    if code == 200 and "id" in res:
        post_id = res["id"]
        print(f"  ✅ ĐĂNG THÀNH CÔNG! Post ID: {post_id}")
        print(f"     Xem: https://www.facebook.com/{post_id}")
        print("     -> Vào Page có thể xoá bài test này nếu muốn.")
    else:
        print(f"  ❌ Đăng THẤT BẠI (HTTP {code}):")
        err = res.get("error", {})
        print("     ", err.get("message", res))
        if err.get("code") == 200 or "permission" in str(err).lower():
            print("     💡 Thiếu quyền 'pages_manage_posts'. Vào Graph API Explorer,")
            print("        thêm scope: pages_show_list, pages_read_engagement,")
            print("        pages_manage_posts -> Generate Access Token lại.")


if __name__ == "__main__":
    main()
