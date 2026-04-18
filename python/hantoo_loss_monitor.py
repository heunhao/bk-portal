##############################################################
# 한국투자증권 보유 종목 손실률 모니터 (cron용)
# - 거래시간(09:00~15:30 KST) 중에만 동작
# - 손실률이 monitor_config.json의 lossThreshold 이상이면 텔레그램 알림
# - 알림 이력은 loss_alerts.json에 저장 (당일 종목당 1회)
##############################################################

import os
import sys
import json
import datetime
import requests

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE  = os.path.join(SCRIPT_DIR, "config.json")
MONITOR_CFG  = os.path.join(SCRIPT_DIR, "monitor_config.json")
TOKEN_FILE   = os.path.join(SCRIPT_DIR, "hantoo_token.dat")
ALERTS_FILE  = os.path.join(SCRIPT_DIR, "loss_alerts.json")
BASE_URL     = "https://openapi.koreainvestment.com:9443"


# ── 거래시간 체크 (KST 09:00 ~ 15:30, 평일) ──────────────────
def is_trading_time():
    now_kst = datetime.datetime.utcnow() + datetime.timedelta(hours=9)
    if now_kst.weekday() >= 5:
        return False
    t = now_kst.time()
    return datetime.time(9, 0) <= t <= datetime.time(15, 30)


# ── 설정 로드 ─────────────────────────────────────────────────
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
    )


def load_threshold():
    try:
        with open(MONITOR_CFG, "r", encoding="utf-8") as f:
            return float(json.load(f).get("lossThreshold", 3.0))
    except Exception:
        return 3.0


# ── 토큰 ─────────────────────────────────────────────────────
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


# ── 보유잔고_실현손익 조회 (TTTC8494R) ───────────────────────
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


# ── 알림 이력 관리 ────────────────────────────────────────────
def load_alerts():
    if not os.path.exists(ALERTS_FILE):
        return []
    with open(ALERTS_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception:
            return []


def save_alerts(alerts):
    with open(ALERTS_FILE, "w", encoding="utf-8") as f:
        json.dump(alerts, f, ensure_ascii=False, indent=2)


def already_alerted_today(alerts, code):
    today = datetime.date.today().isoformat()
    return any(a["date"] == today and a["code"] == code for a in alerts)


# ── 텔레그램 ─────────────────────────────────────────────────
def send_telegram(token, chat_id, message):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    requests.post(url, data={"chat_id": chat_id, "text": message, "parse_mode": "HTML"},
                  timeout=10)


# ── 메인 ─────────────────────────────────────────────────────
def main():
    if not is_trading_time():
        print("거래시간 외 - 종료")
        return

    app_key, app_secret, cano, acnt_prdt_cd, tg_token, tg_chat = load_config()
    threshold = load_threshold()

    token    = get_access_token(app_key, app_secret)
    holdings = get_holdings(token, app_key, app_secret, cano, acnt_prdt_cd)
    alerts   = load_alerts()

    triggered = []
    for item in holdings:
        qty = int(item.get("hldg_qty", "0") or "0")
        if qty <= 0:
            continue

        code      = item.get("pdno", "")[-6:]
        name      = item.get("prdt_name", "").strip()
        loss_rate = float(item.get("evlu_pfls_rt", "0") or "0")
        price     = int(item.get("prpr", "0") or "0")

        if loss_rate <= -threshold and not already_alerted_today(alerts, code):
            triggered.append({
                "date"      : datetime.date.today().isoformat(),
                "code"      : code,
                "name"      : name,
                "lossRate"  : round(loss_rate, 2),
                "price"     : price,
                "threshold" : threshold,
                "alertedAt" : datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            })

    if triggered:
        alerts.extend(triggered)
        # 최근 180일 이력만 유지
        cutoff = (datetime.date.today() - datetime.timedelta(days=180)).isoformat()
        alerts = [a for a in alerts if a["date"] >= cutoff]
        save_alerts(alerts)

        lines = [f"⚠️ <b>손실률 경보 ({threshold}% 초과)</b>\n"]
        for t in triggered:
            sign = "▼"
            lines.append(f"{sign} <b>{t['name']}</b> ({t['code']})")
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
