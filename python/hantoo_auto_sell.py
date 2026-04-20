##############################################################
# 한국투자증권 자동 매도 스케줄러
# - 14:00 ~ 15:25 (KST), 5분 간격, 평일만 동작
# - 평가손익율 +10% 이상 → 익절 매도
# - 평가손익율  -8% 이하 → 손절 매도
# - 잔고 확인 및 주문 이력을 bk-portal DB에 저장
# - 자동 매매 ON/OFF: monitor_config.json autoTradeEnabled
# - 주문 결과(성공/실패) 텔레그램 알림
#
# 실행 방법:
#   python hantoo_auto_sell.py          ← 스케줄러 모드 (계속 실행)
#   python hantoo_auto_sell.py --once   ← 1회 실행 모드 (cron용)
#
# 필요 패키지: pip install requests apscheduler
##############################################################

import os
import sys
import json
import datetime
import logging
import requests

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "config.json")
MONITOR_CFG = os.path.join(SCRIPT_DIR, "monitor_config.json")
TOKEN_FILE  = os.path.join(SCRIPT_DIR, "hantoo_token.dat")
LOG_FILE    = os.path.join(SCRIPT_DIR, "auto_sell.log")
BASE_URL    = "https://openapi.koreainvestment.com:9443"

SELL_PROFIT_RATE = 10.0   # 익절 기준 (%)
SELL_LOSS_RATE   = -8.0   # 손절 기준 (%)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)


# ── 설정 로드 ─────────────────────────────────────────────

def load_config():
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    return (
        cfg.get("HANTOO_APP_KEY", ""),
        cfg.get("HANTOO_APP_SECRET", ""),
        cfg.get("HANTOO_CANO", ""),
        cfg.get("HANTOO_ACNT_PRDT_CD", "01"),
        cfg.get("MONITOR_SECRET", ""),
        cfg.get("PORTAL_URL", "http://localhost:3000"),
        cfg.get("TELEGRAM_TOKEN", ""),
        cfg.get("TELEGRAM_CHAT_ID", ""),
    )


def is_auto_trade_enabled():
    try:
        with open(MONITOR_CFG, "r", encoding="utf-8") as f:
            return json.load(f).get("autoTradeEnabled", True)
    except Exception:
        return True


# ── 텔레그램 ──────────────────────────────────────────────

def send_telegram(tg_token, chat_id, message):
    if not tg_token or not chat_id:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{tg_token}/sendMessage",
            data={"chat_id": chat_id, "text": message, "parse_mode": "HTML"},
            timeout=10,
        )
    except Exception as e:
        log.warning(f"텔레그램 전송 실패: {e}")


def is_auto_sell_time():
    now = datetime.datetime.now()
    if now.weekday() >= 5:
        return False
    t = now.time()
    return datetime.time(14, 0) <= t <= datetime.time(15, 25)


# ── KIS API ───────────────────────────────────────────────

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
        data=json.dumps({
            "grant_type": "client_credentials",
            "appkey": app_key,
            "appsecret": app_secret,
        }),
        timeout=10,
    )
    res.raise_for_status()
    token = res.json()["access_token"]
    exp_str = (datetime.datetime.now() + datetime.timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
    with open(TOKEN_FILE, "w", encoding="utf-8") as f:
        json.dump({"access_token": token, "expire_time": exp_str}, f)
    return token


def get_balance(token, app_key, app_secret, cano, acnt_prdt_cd):
    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": app_key,
        "appsecret": app_secret,
        "tr_id": "TTTC8434R",
        "custtype": "P",
    }
    params = {
        "CANO": cano,
        "ACNT_PRDT_CD": acnt_prdt_cd,
        "AFHR_FLPR_YN": "N",
        "OFL_YN": "",
        "INQR_DVSN": "01",
        "UNPR_DVSN": "01",
        "FUND_STTL_ICLD_YN": "N",
        "FNCG_AMT_AUTO_RDPT_YN": "N",
        "PRCS_DVSN": "01",
        "CTX_AREA_FK100": "",
        "CTX_AREA_NK100": "",
    }
    res = requests.get(
        f"{BASE_URL}/uapi/domestic-stock/v1/trading/inquire-balance",
        headers=headers,
        params=params,
        timeout=15,
    )
    res.raise_for_status()
    data = res.json()
    if data.get("rt_cd") != "0":
        raise Exception(f"잔고 조회 실패: {data.get('msg1', '')}")
    return data.get("output1", [])


def sell_market_order(token, app_key, app_secret, cano, acnt_prdt_cd, stock_code, qty):
    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": app_key,
        "appsecret": app_secret,
        "tr_id": "TTTC0011U",  # 실전 매도
        "custtype": "P",
    }
    payload = {
        "CANO": cano,
        "ACNT_PRDT_CD": acnt_prdt_cd,
        "PDNO": stock_code,
        "ORD_DVSN": "01",   # 시장가
        "ORD_QTY": str(qty),
        "ORD_UNPR": "0",    # 시장가는 0
    }
    res = requests.post(
        f"{BASE_URL}/uapi/domestic-stock/v1/trading/order-cash",
        headers=headers,
        data=json.dumps(payload),
        timeout=15,
    )
    res.raise_for_status()
    return res.json()


# ── bk-portal API 연동 ────────────────────────────────────

def _monitor_headers(secret):
    return {"Content-Type": "application/json", "x-monitor-secret": secret}


def is_already_sold_today(portal_url, secret, stock_code):
    today = datetime.date.today().isoformat()
    try:
        res = requests.get(
            f"{portal_url}/api/hantoo/auto-sell/orders",
            headers={"x-monitor-secret": secret},
            params={"date": today, "code": stock_code, "check": "1"},
            timeout=10,
        )
        return res.json().get("exists", False)
    except Exception as e:
        log.warning(f"당일 매도 확인 실패 ({stock_code}): {e}")
        return False


def save_checks(portal_url, secret, check_time, stocks_data, triggered_codes):
    try:
        res = requests.post(
            f"{portal_url}/api/hantoo/auto-sell/checks",
            headers=_monitor_headers(secret),
            json={
                "checkTime": check_time,
                "stocks": stocks_data,
                "triggeredCodes": list(triggered_codes),
            },
            timeout=10,
        )
        if res.status_code != 200:
            log.error(f"잔고 저장 실패 (HTTP {res.status_code}): {res.text}")
    except Exception as e:
        log.error(f"잔고 저장 오류: {e}")


def save_order(portal_url, secret, order_data):
    try:
        res = requests.post(
            f"{portal_url}/api/hantoo/auto-sell/orders",
            headers=_monitor_headers(secret),
            json=order_data,
            timeout=10,
        )
        if res.status_code != 200:
            log.error(f"주문 저장 실패 (HTTP {res.status_code}): {res.text}")
    except Exception as e:
        log.error(f"주문 저장 오류: {e}")


# ── 핵심 로직 ─────────────────────────────────────────────

def check_and_sell():
    if not is_auto_trade_enabled():
        log.info("자동 매매 OFF 상태 — 매도 건너뜀")
        return

    now = datetime.datetime.now()
    check_time = now.strftime("%Y-%m-%dT%H:%M:%S")
    log.info(f"=== 평가손익 확인 시작: {check_time} ===")

    (app_key, app_secret, cano, acnt_prdt_cd,
     secret, portal_url, tg_token, tg_chat) = load_config()
    token  = get_access_token(app_key, app_secret)
    items  = get_balance(token, app_key, app_secret, cano, acnt_prdt_cd)

    if not items:
        log.info("보유 종목 없음")
        save_checks(portal_url, secret, check_time, [], [])
        return

    triggered_codes = set()
    stocks_data = []

    for item in items:
        qty = int(item.get("hldg_qty", "0") or "0")
        if qty <= 0:
            continue

        code       = item.get("pdno", "").strip()
        name       = item.get("prdt_name", "").strip()
        avail_qty  = int(item.get("ord_psbl_qty", "0") or "0")
        avg_price  = float(item.get("pchs_avg_pric", "0") or "0")
        curr_price = float(item.get("prpr", "0") or "0")
        eval_amt   = float(item.get("evlu_amt", "0") or "0")
        pfls_amt   = float(item.get("evlu_pfls_amt", "0") or "0")
        pfls_rt    = float(item.get("evlu_pfls_rt", "0") or "0")

        log.info(f"  [{code}] {name}: {pfls_rt:+.2f}%  보유 {qty}주  주문가능 {avail_qty}주")

        stocks_data.append({
            "stockCode":     code,
            "stockName":     name,
            "holdQty":       qty,
            "avgPrice":      avg_price,
            "currentPrice":  curr_price,
            "evalAmount":    eval_amt,
            "evalPflsAmount": pfls_amt,
            "evalPflsRate":  pfls_rt,
        })

        should_sell = pfls_rt >= SELL_PROFIT_RATE or pfls_rt <= SELL_LOSS_RATE
        if not should_sell or avail_qty <= 0:
            continue

        if is_already_sold_today(portal_url, secret, code):
            log.info(f"  → {name}({code}) 당일 이미 매도 완료, 건너뜀")
            continue

        reason = "익절" if pfls_rt >= SELL_PROFIT_RATE else "손절"
        log.info(f"  ★ {name}({code}) {reason} 조건 도달 ({pfls_rt:+.2f}%) → 시장가 매도 {avail_qty}주")

        result    = sell_market_order(token, app_key, app_secret, cano, acnt_prdt_cd, code, avail_qty)
        order_no  = result.get("output", {}).get("ODNO", "")
        rt_cd     = result.get("rt_cd", "")
        msg       = result.get("msg1", "")

        triggered_codes.add(code)
        save_order(portal_url, secret, {
            "orderTime":   check_time,
            "stockCode":   code,
            "stockName":   name,
            "orderQty":    avail_qty,
            "triggerRate": pfls_rt,
            "orderNo":     order_no,
            "resultCode":  rt_cd,
            "resultMsg":   msg,
        })

        if rt_cd == "0":
            log.info(f"  ✓ 주문 성공  주문번호: {order_no}")
            send_telegram(tg_token, tg_chat,
                f"✅ <b>자동 매도 완료</b> ({reason})\n"
                f"종목: <b>{name}</b> ({code})\n"
                f"수량: {avail_qty:,}주  손익율: {pfls_rt:+.2f}%\n"
                f"주문번호: {order_no}"
            )
        else:
            log.error(f"  ✗ 주문 실패: {msg}")
            send_telegram(tg_token, tg_chat,
                f"❌ <b>자동 매도 실패</b> ({reason})\n"
                f"종목: <b>{name}</b> ({code})\n"
                f"시도 수량: {avail_qty:,}주  손익율: {pfls_rt:+.2f}%\n"
                f"현재가: {curr_price:,.0f}원\n"
                f"오류코드: {rt_cd}\n"
                f"실패 사유: {msg}"
            )

    save_checks(portal_url, secret, check_time, stocks_data, list(triggered_codes))
    log.info(f"=== 완료: {len(stocks_data)}종목 확인, {len(triggered_codes)}종목 매도 ===\n")


# ── 스케줄러 / 진입점 ─────────────────────────────────────

def run_scheduler():
    from apscheduler.schedulers.blocking import BlockingScheduler
    from apscheduler.triggers.cron import CronTrigger

    log.info("자동 매도 스케줄러 시작")
    log.info(f"조건: +{SELL_PROFIT_RATE}% 이상 (익절) 또는 {SELL_LOSS_RATE}% 이하 (손절)")
    log.info("실행 시간: 평일 14:00 ~ 15:25, 5분 간격")

    scheduler = BlockingScheduler(timezone="Asia/Seoul")
    # 14:00 ~ 14:55
    scheduler.add_job(
        check_and_sell,
        CronTrigger(day_of_week="mon-fri", hour=14, minute="*/5", timezone="Asia/Seoul"),
    )
    # 15:00 ~ 15:25
    scheduler.add_job(
        check_and_sell,
        CronTrigger(day_of_week="mon-fri", hour=15, minute="0,5,10,15,20,25", timezone="Asia/Seoul"),
    )
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("스케줄러 종료")


if __name__ == "__main__":
    if "--once" in sys.argv:
        # cron 모드: 시간 확인 후 1회 실행
        if is_auto_sell_time():
            try:
                check_and_sell()
            except Exception as e:
                log.error(f"오류: {e}", exc_info=True)
                sys.exit(1)
        else:
            log.info(f"자동 매도 시간 외 종료 ({datetime.datetime.now().strftime('%H:%M')})")
    else:
        try:
            run_scheduler()
        except Exception as e:
            log.error(f"스케줄러 오류: {e}", exc_info=True)
            sys.exit(1)
