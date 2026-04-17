##############################################################
# 한국투자증권 주식 주문 (웹 서비스용)
# - argv[1]: 종목코드 (6자리)
# - argv[2]: 주문수량
# - argv[3]: 구분 "BUY" | "SELL"
# - argv[4]: 주문유형 "00"(지정가) | "01"(시장가)
# - argv[5]: 주문단가 (시장가일 경우 "0")
# - stdout : JSON 단일 객체 출력
##############################################################

import sys
import os
import json
import requests
import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "config.json")
TOKEN_FILE  = os.path.join(SCRIPT_DIR, "hantoo_token.dat")
BASE_URL    = "https://openapi.koreainvestment.com:9443"


def load_config():
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    return (
        cfg.get("HANTOO_APP_KEY", ""),
        cfg.get("HANTOO_APP_SECRET", ""),
        cfg.get("HANTOO_CANO", ""),
        cfg.get("HANTOO_ACNT_PRDT_CD", "01"),
    )


def get_access_token(app_key, app_secret):
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "r", encoding="utf-8") as f:
            try:
                td = json.load(f)
                exp = datetime.datetime.strptime(td["expire_time"], "%Y-%m-%d %H:%M:%S")
                if exp > datetime.datetime.now() + datetime.timedelta(hours=2):
                    return td["access_token"]
            except Exception:
                pass

    url = f"{BASE_URL}/oauth2/tokenP"
    res = requests.post(
        url,
        headers={"content-type": "application/json"},
        data=json.dumps({"grant_type": "client_credentials", "appkey": app_key, "appsecret": app_secret}),
        timeout=10,
    )
    res.raise_for_status()
    token = res.json()["access_token"]
    exp_str = (datetime.datetime.now() + datetime.timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
    with open(TOKEN_FILE, "w", encoding="utf-8") as f:
        json.dump({"access_token": token, "expire_time": exp_str}, f)
    return token


def send_order(token, app_key, app_secret, cano, acnt_prdt_cd,
               stock_code, qty, side, order_type, price):
    url   = f"{BASE_URL}/uapi/domestic-stock/v1/trading/order-cash"
    tr_id = "TTTC0012U" if side == "BUY" else "TTTC0011U"
    final_price = "0" if order_type == "01" else str(price)

    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": app_key,
        "appsecret": app_secret,
        "tr_id": tr_id,
        "custtype": "P",
    }
    payload = {
        "CANO": cano,
        "ACNT_PRDT_CD": acnt_prdt_cd,
        "PDNO": stock_code,
        "ORD_DVSN": order_type,
        "ORD_QTY": str(qty),
        "ORD_UNPR": final_price,
    }
    res = requests.post(url, headers=headers, data=json.dumps(payload), timeout=15)
    res.raise_for_status()
    return res.json()


if __name__ == "__main__":
    if len(sys.argv) < 6:
        print(json.dumps({"success": False, "error": "인자 부족: code qty side orderType price"}, ensure_ascii=False))
        sys.exit(1)

    stock_code = sys.argv[1]
    qty        = sys.argv[2]
    side       = sys.argv[3].upper()
    order_type = sys.argv[4]
    price      = sys.argv[5]

    if side not in ("BUY", "SELL"):
        print(json.dumps({"success": False, "error": "side는 BUY 또는 SELL 이어야 합니다."}, ensure_ascii=False))
        sys.exit(1)

    try:
        app_key, app_secret, cano, acnt_prdt_cd = load_config()
        if not app_key or not cano:
            print(json.dumps({"success": False, "error": "config.json에 HANTOO 설정이 없습니다."}, ensure_ascii=False))
            sys.exit(1)

        token  = get_access_token(app_key, app_secret)
        result = send_order(token, app_key, app_secret, cano, acnt_prdt_cd,
                            stock_code, qty, side, order_type, price)

        if result.get("rt_cd") == "0":
            print(json.dumps({
                "success"  : True,
                "orderNo"  : result.get("output", {}).get("ODNO", ""),
                "message"  : result.get("msg1", "주문이 접수되었습니다."),
            }, ensure_ascii=False))
        else:
            print(json.dumps({
                "success": False,
                "error"  : result.get("msg1", "주문 실패"),
            }, ensure_ascii=False))

    except FileNotFoundError:
        print(json.dumps({"success": False, "error": "config.json 파일을 찾을 수 없습니다."}, ensure_ascii=False))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)
