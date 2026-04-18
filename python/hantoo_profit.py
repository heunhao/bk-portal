##############################################################
# 한국투자증권 기간별매매손익현황조회 (웹 서비스용)
# argv[1]: 조회시작일 YYYYMMDD
# argv[2]: 조회종료일 YYYYMMDD
# stdout : JSON 단일 객체 출력
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


def get_profit(token, app_key, app_secret, cano, acnt_prdt_cd, start_dt, end_dt):
    url = f"{BASE_URL}/uapi/domestic-stock/v1/trading/inquire-period-trade-profit"

    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": app_key,
        "appsecret": app_secret,
        "tr_id": "TTTC8715R",
        "custtype": "P",
        "tr_cont": "",
    }

    all_items = []
    ctx_area_fk100 = ""
    ctx_area_nk100 = ""
    data = {}

    for _ in range(10):  # 최대 10페이지
        params = {
            "CANO": cano,
            "ACNT_PRDT_CD": acnt_prdt_cd,
            "PDNO": "",
            "INQR_STRT_DT": start_dt,
            "INQR_END_DT": end_dt,
            "SORT_DVSN": "00",
            "CBLC_DVSN": "00",
            "CTX_AREA_FK100": ctx_area_fk100,
            "CTX_AREA_NK100": ctx_area_nk100,
        }

        res = requests.get(url, headers=headers, params=params, timeout=15)
        res.raise_for_status()
        data = res.json()

        if data.get("rt_cd") != "0":
            raise Exception(data.get("msg1", "조회 실패"))

        items = data.get("output1", [])
        all_items.extend(items)

        tr_cont = res.headers.get("tr_cont", "D")
        if tr_cont not in ("M", "F"):
            break

        ctx_area_fk100 = data.get("ctx_area_fk100", "").strip()
        ctx_area_nk100 = data.get("ctx_area_nk100", "").strip()
        if not ctx_area_fk100:
            break
        headers["tr_cont"] = "N"

    output2 = data.get("output2", {})

    stocks = []
    for item in all_items:
        sll_amt = int(item.get("sll_amt", "0") or "0")
        if sll_amt == 0:
            continue
        stocks.append({
            "name"    : item.get("prdt_name", "").strip(),
            "code"    : item.get("pdno", "").strip()[-6:],
            "buyAmt"  : int(item.get("buy_amt", "0") or "0"),
            "sllAmt"  : sll_amt,
            "profit"  : int(item.get("rlzt_pfls", "0") or "0"),
            "profitRt": item.get("pfls_rt", "0"),
            "fee"     : int(item.get("fee", "0") or "0"),
            "tax"     : int(item.get("tl_tax", "0") or "0"),
        })

    def _int(v): return int(v or "0")

    return {
        "success": True,
        "stocks" : stocks,
        "summary": {
            "totRlztPfls" : _int(output2.get("tot_rlzt_pfls")),
            "totPftrt"    : output2.get("tot_pftrt", "0"),
            "sllTrAmt"    : _int(output2.get("sll_tr_amt_smtl")),
            "buyTrAmt"    : _int(output2.get("buy_tr_amt_smtl")),
            "totFee"      : _int(output2.get("tot_fee")),
            "totTax"      : _int(output2.get("tot_tltx")),
        },
    }


if __name__ == "__main__":
    try:
        start_dt = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now().strftime("%Y%m%d")
        end_dt   = sys.argv[2] if len(sys.argv) > 2 else start_dt

        app_key, app_secret, cano, acnt_prdt_cd = load_config()
        if not app_key or not cano:
            print(json.dumps({"success": False, "error": "config.json에 HANTOO 키가 설정되지 않았습니다."}, ensure_ascii=False))
            sys.exit(1)

        token  = get_access_token(app_key, app_secret)
        result = get_profit(token, app_key, app_secret, cano, acnt_prdt_cd, start_dt, end_dt)
        print(json.dumps(result, ensure_ascii=False))

    except FileNotFoundError:
        print(json.dumps({"success": False, "error": "config.json 파일을 찾을 수 없습니다."}, ensure_ascii=False))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)
