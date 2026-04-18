##############################################################
# 한국투자증권 주식일별주문체결조회 (웹 서비스용)
# argv[1]: 조회시작일 YYYYMMDD
# argv[2]: 조회종료일 YYYYMMDD
# argv[3]: 매도매수구분 00=전체 01=매도 02=매수
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


def get_history(token, app_key, app_secret, cano, acnt_prdt_cd, start_dt, end_dt, sll_buy_dvsn_cd):
    url = f"{BASE_URL}/uapi/domestic-stock/v1/trading/inquire-daily-ccld"

    # 3개월 이전 여부 판단
    three_months_ago = (datetime.datetime.now() - datetime.timedelta(days=90)).strftime("%Y%m%d")
    tr_id = "CTSC9215R" if start_dt < three_months_ago else "TTTC0081R"

    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": app_key,
        "appsecret": app_secret,
        "tr_id": tr_id,
        "custtype": "P",
        "tr_cont": "",
    }

    all_items = []
    ctx_area_fk100 = ""
    ctx_area_nk100 = ""

    for _ in range(10):  # 최대 10페이지 (1000건)
        params = {
            "CANO": cano,
            "ACNT_PRDT_CD": acnt_prdt_cd,
            "INQR_STRT_DT": start_dt,
            "INQR_END_DT": end_dt,
            "SLL_BUY_DVSN_CD": sll_buy_dvsn_cd,
            "INQR_DVSN": "00",
            "PDNO": "",
            "CCLD_DVSN": "01",
            "ORD_GNO_BRNO": "",
            "ODNO": "",
            "INQR_DVSN_3": "00",
            "INQR_DVSN_1": "",
            "CTX_AREA_FK100": ctx_area_fk100,
            "CTX_AREA_NK100": ctx_area_nk100,
            "EXCG_ID_DVSN_CD": "ALL",
        }

        res = requests.get(url, headers=headers, params=params, timeout=15)
        res.raise_for_status()
        data = res.json()

        if data.get("rt_cd") != "0":
            raise Exception(data.get("msg1", "조회 실패"))

        items = data.get("output1", [])
        all_items.extend(items)

        # 연속 조회 여부
        tr_cont = res.headers.get("tr_cont", "D")
        if tr_cont not in ("M", "F"):
            break

        ctx_area_fk100 = data.get("ctx_area_fk100", "").strip()
        ctx_area_nk100 = data.get("ctx_area_nk100", "").strip()
        if not ctx_area_fk100:
            break
        headers["tr_cont"] = "N"

    output2 = data.get("output2", {})

    trades = []
    for item in all_items:
        qty  = int(item.get("tot_ccld_qty", "0") or "0")
        if qty == 0:
            continue
        amt  = int(item.get("tot_ccld_amt", "0") or "0")
        fee  = int(item.get("prsm_tlex_smtl", "0") or "0")
        trades.append({
            "date"    : item.get("ord_dt", ""),
            "side"    : item.get("sll_buy_dvsn_cd_name", ""),
            "sideCode": item.get("sll_buy_dvsn_cd", ""),
            "name"    : item.get("prdt_name", "").strip(),
            "code"    : item.get("pdno", "").strip(),
            "qty"     : qty,
            "unitPrice": int(item.get("avg_prvs", "0") or "0"),
            "amount"  : amt,
            "fee"     : fee,
            "total"   : amt + fee,
        })

    return {
        "success": True,
        "trades" : trades,
        "summary": {
            "totOrdQty" : output2.get("tot_ord_qty", "0"),
            "totCcldQty": output2.get("tot_ccld_qty", "0"),
            "totCcldAmt": output2.get("prsm_tlex_smtl", "0"),
            "totFee"    : output2.get("pchs_avg_pric", "0"),
        },
    }


if __name__ == "__main__":
    try:
        start_dt       = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now().strftime("%Y%m%d")
        end_dt         = sys.argv[2] if len(sys.argv) > 2 else start_dt
        sll_buy_dvsn   = sys.argv[3] if len(sys.argv) > 3 else "00"

        app_key, app_secret, cano, acnt_prdt_cd = load_config()
        if not app_key or not cano:
            print(json.dumps({"success": False, "error": "config.json에 HANTOO_APP_KEY, HANTOO_CANO가 설정되지 않았습니다."}, ensure_ascii=False))
            sys.exit(1)

        token  = get_access_token(app_key, app_secret)
        result = get_history(token, app_key, app_secret, cano, acnt_prdt_cd, start_dt, end_dt, sll_buy_dvsn)
        print(json.dumps(result, ensure_ascii=False))

    except FileNotFoundError:
        print(json.dumps({"success": False, "error": "config.json 파일을 찾을 수 없습니다."}, ensure_ascii=False))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)
