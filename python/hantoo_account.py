##############################################################
# 한국투자증권 계좌 잔고 조회 (웹 서비스용)
# - stdout: JSON 단일 객체 출력
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


def get_balance(token, app_key, app_secret, cano, acnt_prdt_cd):
    url = f"{BASE_URL}/uapi/domestic-stock/v1/trading/inquire-balance"
    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": app_key,
        "appsecret": app_secret,
        "tr_id": "TTTC8434R",
    }
    params = {
        "CANO": cano,
        "ACNT_PRDT_CD": acnt_prdt_cd,
        "AFHR_FLG": "N",
        "OFRT_WTHR_ITMS_CK": "N",
        "PRCS_DVSN": "01",
        "UNPR_DVSN": "01",
        "CTX_AREA_FK100": "",
        "CTX_AREA_NK100": "",
    }
    res = requests.get(url, headers=headers, params=params, timeout=15)
    res.raise_for_status()
    return res.json()


if __name__ == "__main__":
    try:
        app_key, app_secret, cano, acnt_prdt_cd = load_config()
        if not app_key or not cano:
            print(json.dumps({"success": False, "error": "config.json에 HANTOO_APP_KEY, HANTOO_CANO가 설정되지 않았습니다."}, ensure_ascii=False))
            sys.exit(1)

        token  = get_access_token(app_key, app_secret)
        result = get_balance(token, app_key, app_secret, cano, acnt_prdt_cd)

        if result.get("rt_cd") != "0":
            print(json.dumps({"success": False, "error": result.get("msg1", "조회 실패")}, ensure_ascii=False))
            sys.exit(1)

        holdings = [
            {
                "code"    : item["pdno"],
                "name"    : item["prdt_name"],
                "qty"     : item["hldg_qty"],
                "avgPrice": item["pchs_avg_pric"],
                "currPrice": item["prpr"],
                "evalAmt" : item["evlu_amt"],
                "profitRate": item["evlu_pfls_rt"],
                "profitAmt" : item["evlu_pfls_amt"],
            }
            for item in result.get("output1", [])
            if int(item.get("hldg_qty", "0")) > 0
        ]

        summary = result.get("output2", [{}])[0]
        print(json.dumps({
            "success" : True,
            "holdings": holdings,
            "summary" : {
                "totalEval"   : summary.get("tot_evlu_amt", "0"),
                "stockEval"   : summary.get("scts_evlu_amt", "0"),
                "deposit"     : summary.get("dnca_tot_amt", "0"),
                "depositD1"   : summary.get("nxdy_excc_amt", "0"),
                "depositD2"   : summary.get("prvs_rcdl_excc_amt", "0"),
                "withdrawable": summary.get("max_wdrw_amt", "0"),
                "profitAmt"   : summary.get("evlu_pfls_smtl_amt", "0"),
                "profitRate"  : summary.get("asst_icdc_erng_rt", "0"),
            },
        }, ensure_ascii=False))

    except FileNotFoundError:
        print(json.dumps({"success": False, "error": "config.json 파일을 찾을 수 없습니다."}, ensure_ascii=False))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)
