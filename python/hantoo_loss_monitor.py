##############################################################
# 한국투자증권 보유 종목 손실률 모니터 (cron용)
# - 거래시간(09:00~15:30 KST) 평일에만 동작
# - 손실률이 monitor_config.json의 lossThreshold 이상이면 텔레그램 알림
# - 알림 이력은 DB에 저장 (PORTAL_URL + MONITOR_SECRET via config.json)
# - 당일 종목당 1회만 알림
##############################################################

import os
import sys
import json
import datetime
import requests

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "config.json")
MONITOR_CFG = os.path.join(SCRIPT_DIR, "monitor_config.json")
TOKEN_FILE  = os.path.join(SCRIPT_DIR, "hantoo_token.dat")
BASE_URL    = "https://openapi.koreainvestment.com:9443"


def is_trading_time():
    now_kst = datetime.datetime.utcnow() + datetime.timedelta(hours=9)
    if now_kst.weekday() >= 5:
        return False
    t = now_kst.time()
    return datetime.time(9, 0) <= t <= datetime.time(15, 30)


def load_config():
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    return (
        cfg.get("HANTOO_APP_KEY", ""),
        cfg.get("HANTOO_APP_SECRET", ""),
        cfg.get("HANTOO_CANO", ""),
        cfg.get("HANTOO_ACNT_PRDT_CD", "01"),
        cfg.get("TELEGRAM_TOKEN", ""),
        cfg.get("TELEGRAM_CHAT_ID", ""),
        cfg.get("MONITOR_SECRET", ""),
        cfg.get("PORTAL_URL", "http://localhost:3000"),
    )


def load_threshold():
    try:
        with open(MONITOR_CFG, "r", encoding="utf-8") as f:
            return float(json.load(f).get("lossThreshold", 3.0))
    except Exception:
        return 3.0


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
    res = requests.post(
        f"{BASE_URL}/oauth2/tokenP",
        headers={"content-type": "application/json"},
        data=json.dumps({"grant_type": "client_credentials",
                         "appkey": app_key, "appsecret": app_secret}),
        timeout=10,
    )
    res.raise_for_status()
    token = res.json()["access_token"]
    exp_str = (datetime.datetime.now() + datetime.timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
    with open(TOKEN_FILE, "w", encoding="utf-8") as f:
        json.dump({"access_token": token, "expire_time": exp_str}, f)
    return token


def get_holdings(token, app_key, app_secret, cano, acnt_prdt_cd):
    url = f"{BASE_URL}/uapi/domestic-stock/v1/trading/inquire-balance-rlz-pl"
    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": app_key,
        "appsecret": app_secret,
        "tr_id": "TTTC8494R",
        "custtype": "P",
        "tr_cont": "",
    }
    params = {
        "CANO": cano,
        "ACNT_PRDT_CD": acnt_prdt_cd,
        "AFHR_FLPR_YN": "N",
        "OFL_YN": "",
        "INQR_DVSN": "00",
        "UNPR_DVSN": "01",
        "FUND_STTL_ICLD_YN": "N",
        "FNCG_AMT_AUTO_RDPT_YN": "N",
        "PRCS_DVSN": "01",
        "COST_ICLD_YN": "Y",
        "CTX_AREA_FK100": "",
        "CTX_AREA_NK100": "",
    }
    res = requests.get(url, headers=headers, params=params, timeout=15)
    res.raise_for_status()
    data = res.json()
    if data.get("rt_cd") != "0":
        raise Exception(data.get("msg1", "잔고 조회 실패"))
    return data.get("output1", [])


def save_alert_to_db(portal_url, secret, alert):
    """DB에 알림 저장 (Next.js API 호출)"""
    try:
        res = requests.post(
            f"{portal_url}/api/hantoo/alerts",
            headers={"Content-Type": "application/json", "x-monitor-secret": secret},
            json=alert,
            timeout=10,
        )
        return res.status_code == 200
    except Exception as e:
        print(f"DB 저장 실패: {e}", file=sys.stderr)
        return False


def is_alerted_today(portal_url, secret, code):
    """오늘 이미 알림 발송 여부 확인"""
    today = datetime.date.today().isoformat()
    try:
        res = requests.get(
            f"{portal_url}/api/hantoo/alerts/check",
            headers={"x-monitor-secret": secret},
            params={"date": today, "code": code},
            timeout=10,
        )
        return res.json().get("exists", False)
    except Exception:
        return False


def send_telegram(token, chat_id, message):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    requests.post(url, data={"chat_id": chat_id, "text": message, "parse_mode": "HTML"},
                  timeout=10)


def main():
    if not is_trading_time():
        print("거래시간 외 - 종료")
        return

    app_key, app_secret, cano, acnt_prdt_cd, tg_token, tg_chat, secret, portal_url = load_config()
    threshold = load_threshold()

    token    = get_access_token(app_key, app_secret)
    holdings = get_holdings(token, app_key, app_secret, cano, acnt_prdt_cd)

    triggered = []
    for item in holdings:
        qty = int(item.get("hldg_qty", "0") or "0")
        if qty <= 0:
            continue

        code      = item.get("pdno", "")[-6:]
        name      = item.get("prdt_name", "").strip()
        loss_rate = float(item.get("evlu_pfls_rt", "0") or "0")
        price     = int(item.get("prpr", "0") or "0")

        if loss_rate <= -threshold and not is_alerted_today(portal_url, secret, code):
            alert = {
                "date"     : datetime.date.today().isoformat(),
                "code"     : code,
                "name"     : name,
                "lossRate" : round(loss_rate, 2),
                "price"    : price,
                "threshold": threshold,
            }
            if save_alert_to_db(portal_url, secret, alert):
                triggered.append(alert)

    if triggered:
        lines = [f"⚠️ <b>손실률 경보 ({threshold}% 초과)</b>\n"]
        for t in triggered:
            lines.append(f"▼ <b>{t['name']}</b> ({t['code']})")
            lines.append(f"   현재가: {t['price']:,}원 / 손실률: {t['lossRate']:.2f}%\n")
        send_telegram(tg_token, tg_chat, "\n".join(lines))

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now_str}] 점검 완료 - 보유 {len(holdings)}종목, 경보 {len(triggered)}종목")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"오류: {e}", file=sys.stderr)
        sys.exit(1)
