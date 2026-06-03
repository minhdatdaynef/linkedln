"""
Doc tat ca LinkedIn cookies tu Chrome (khong can dong Chrome)
Luu vao .env tu dong
"""
import browser_cookie3
import json

def extract_linkedin_cookies():
    print("Doc LinkedIn cookies tu Chrome...")
    try:
        jar = browser_cookie3.chrome(domain_name=".linkedin.com")
        cookies = {c.name: c.value for c in jar}

        if not cookies:
            print("Khong tim thay cookie nao. Hay dang nhap LinkedIn tren Chrome truoc.")
            return

        print(f"Tim thay {len(cookies)} cookies:")
        for name in cookies:
            val_preview = cookies[name][:20] + "..." if len(cookies[name]) > 20 else cookies[name]
            print(f"  {name} = {val_preview}")

        # Cac cookie can thiet
        needed = ["li_at", "JSESSIONID", "bcookie", "bscookie", "lang"]
        env_lines = []
        for key in needed:
            if key in cookies:
                env_lines.append(f'{key}={cookies[key]}')
                print(f"  [OK] {key}")
            else:
                print(f"  [--] {key} khong co")

        # Ghi vao file cookie_values.txt
        with open("cookie_values.txt", "w") as f:
            f.write("\n".join(env_lines))
        print("\nDa luu vao cookie_values.txt")
        print("Copy cac gia tri nay vao file .env cua ban.")

    except Exception as e:
        print(f"Loi: {e}")

if __name__ == "__main__":
    extract_linkedin_cookies()
