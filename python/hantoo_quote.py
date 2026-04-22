"""
한국투자증권 주식 현재가 + 호가 조회
  python hantoo_quote.py <종목코드>
  → JSON 출력: { price, change, changeRate, volume, askPrices, bidPrices, stockName }
"""
import sys, os, json, datetime, requests

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "config.json")
TOKEN_FILE  = os.path.join(SCRIPT_DIR, "hantoo_token.dat")
BASE_URL    = "https://openapi.koreainvestment.com:9443"

def load_config():
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    return cfg["HANTOO_APP_KEY"], cfg["HANTOO_APP_SECRET"], cfg["HANTOO_CANO"], cfg["HANTOO_ACNT_PRDT_CD"]

def get_token(app_key, app_secret):
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "r", encoding="utf-8") as f:
            try:
                td = json.load(f)
                exp = datetime.datetime.strptime(td["expire_time"], "%Y-%m-%d %H:%M:%S")
                if exp > datetime.datetime.now() + datetime.timedelta(hours=2):
                    return td["access_token"]
            except Exception:
                pass
    res = requests.post(f"{BASE_URL}/oauth2/tokenP",
        headers={"content-type": "application/json"},
        data=json.dumps({"grant_type": "client_credentials", "appkey": app_key, "appsecret": app_secret}),
        timeout=10)
    res.raise_for_status()
    token = res.json()["access_token"]
    exp_str = (datetime.datetime.now() + datetime.timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
    with open(TOKEN_FILE, "w", encoding="utf-8") as f:
        json.dump({"access_token": token, "expire_time": exp_str}, f)
    return token

def get_quote(token, app_key, app_secret, code):
    headers = {
        "content-type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": app_key,
        "appsecret": app_secret,
        "tr_id": "FHKST01010100",
    }
    res = requests.get(f"{BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price",
        headers=headers,
        params={"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": code},
        timeout=10)
    res.raise_for_status()
    d = res.json()
    if d.get("rt_cd") != "0":
        raise Exception(d.get("msg1", "시세 조회 실패"))
    o = d["output"]
    return {
        "stockName": o.get("hts_kor_isnm", ""),
        "price":     int(o.get("stck_prpr", "0") or "0"),
        "change":    int(o.get("prdy_vrss", "0") or "0"),
        "changeSign": o.get("prdy_vrss_sign", "3"),
        "changeRate": float(o.get("prdy_ctrt", "0") or "0"),
        "volume":    int(o.get("acml_vol", "0") or "0"),
        "highPrice": int(o.get("stck_hgpr", "0") or "0"),
        "lowPrice":  int(o.get("stck_lwpr", "0") or "0"),
        "upperLimit": int(o.get("stck_mxpr", "0") or "0"),
        "lowerLimit": int(o.get("stck_llam", "0") or "0"),
    }

def get_orderbook(token, app_key, app_secret, code):
    headers = {
        "content-type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": app_key,
        "appsecret": app_secret,
        "tr_id": "FHKST01010200",
    }
    res = requests.get(f"{BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-asking-price-exp-ccn",
        headers=headers,
        params={"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": code},
        timeout=10)
    res.raise_for_status()
    d = res.json()
    if d.get("rt_cd") != "0":
        return [], []
    o = d.get("output1", {})
    # 매도호가 (askp1~5: 낮은가격이 1번, 화면에는 역순으로 표시)
    asks = []
    for i in range(5, 0, -1):
        p = int(o.get(f"askp{i}", "0") or "0")
        v = int(o.get(f"askp_rsqn{i}", "0") or "0")
        if p > 0:
            asks.append({"price": p, "qty": v})
    # 매수호가 (bidp1~5: 높은가격이 1번)
    bids = []
    for i in range(1, 6):
        p = int(o.get(f"bidp{i}", "0") or "0")
        v = int(o.get(f"bidp_rsqn{i}", "0") or "0")
        if p > 0:
            bids.append({"price": p, "qty": v})
    return asks, bids

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "종목코드 필요"}))
        sys.exit(1)
    code = sys.argv[1].strip()
    try:
        app_key, app_secret, _, _ = load_config()
        token  = get_token(app_key, app_secret)
        quote  = get_quote(token, app_key, app_secret, code)
        asks, bids = get_orderbook(token, app_key, app_secret, code)
        print(json.dumps({**quote, "asks": asks, "bids": bids}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
