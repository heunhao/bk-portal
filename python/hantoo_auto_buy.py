##############################################################
# 한국투자증권 RSI 골든크로스 자동 매수 스케줄러
# - 15:00 ~ 15:25 (KST), 5분 간격, 평일만 동작
# - RSI Cutler 골든크로스(돌파) 조건 도달 시 시장가 매수
# - 스캔 대상 종목: bk-portal 설정 페이지에서 관리
# - 자동 매매 ON/OFF: monitor_config.json autoTradeEnabled
# - 주문 결과(성공/실패) 텔레그램 알림
#
# 실행:
#   python hantoo_auto_buy.py          ← 스케줄러 모드
#   python hantoo_auto_buy.py --once   ← 1회 실행 (cron용)
##############################################################

import os
import sys
import json
import datetime
import logging
import requests
import numpy as np

try:
    import FinanceDataReader as fdr
except ImportError:
    print("FinanceDataReader 미설치: pip install FinanceDataReader")
    sys.exit(1)

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "config.json")
MONITOR_CFG = os.path.join(SCRIPT_DIR, "monitor_config.json")
TOKEN_FILE  = os.path.join(SCRIPT_DIR, "hantoo_token.dat")
LOG_FILE    = os.path.join(SCRIPT_DIR, "auto_buy.log")
BASE_URL    = "https://openapi.koreainvestment.com:9443"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)


# ── 설정 ──────────────────────────────────────────────────

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
        int(cfg.get("AUTO_BUY_AMOUNT", 1000000)),
        cfg.get("TELEGRAM_TOKEN", ""),
        cfg.get("TELEGRAM_CHAT_ID", ""),
    )


def is_auto_trade_enabled():
    try:
        with open(MONITOR_CFG, "r", encoding="utf-8") as f:
            return json.load(f).get("autoTradeEnabled", True)
    except Exception:
        return True


def is_auto_buy_time():
    now = datetime.datetime.now()
    if now.weekday() >= 5:
        return False
    t = now.time()
    return datetime.time(15, 0) <= t <= datetime.time(15, 25)


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


def notify_buy_success(tg_token, chat_id, name, code, qty, price, rsi, signal, order_no):
    msg = (
        f"✅ <b>자동 매수 완료</b>\n"
        f"종목: <b>{name}</b> ({code})\n"
        f"수량: {qty:,}주  기준가: {price:,.0f}원\n"
        f"RSI: {rsi:.2f}  Signal: {signal:.2f}\n"
        f"주문번호: {order_no}"
    )
    send_telegram(tg_token, chat_id, msg)


def notify_buy_fail(tg_token, chat_id, name, code, qty, price, rsi, signal, rt_cd, reason):
    msg = (
        f"❌ <b>자동 매수 실패</b>\n"
        f"종목: <b>{name}</b> ({code})\n"
        f"시도 수량: {qty:,}주  기준가: {price:,.0f}원\n"
        f"RSI: {rsi:.2f}  Signal: {signal:.2f}\n"
        f"오류코드: {rt_cd}\n"
        f"실패 사유: {reason}"
    )
    send_telegram(tg_token, chat_id, msg)


# ── 포털 API ──────────────────────────────────────────────

def _headers(secret):
    return {"Content-Type": "application/json", "x-monitor-secret": secret}


def get_target_codes(portal_url, secret):
    try:
        res = requests.get(
            f"{portal_url}/api/hantoo/auto-buy/targets",
            headers={"x-monitor-secret": secret},
            timeout=10,
        )
        return [(t["stockCode"], t["stockName"]) for t in res.json().get("targets", [])]
    except Exception as e:
        log.error(f"스캔 대상 종목 조회 실패: {e}")
        return []


def is_already_bought_today(portal_url, secret, code):
    today = datetime.date.today().isoformat()
    try:
        res = requests.get(
            f"{portal_url}/api/hantoo/auto-buy/orders",
            headers={"x-monitor-secret": secret},
            params={"date": today, "code": code, "check": "1"},
            timeout=10,
        )
        return res.json().get("exists", False)
    except Exception as e:
        log.warning(f"당일 매수 확인 실패 ({code}): {e}")
        return False


def save_buy_order(portal_url, secret, data):
    try:
        res = requests.post(
            f"{portal_url}/api/hantoo/auto-buy/orders",
            headers=_headers(secret),
            json=data,
            timeout=10,
        )
        if res.status_code != 200:
            log.error(f"매수 주문 저장 실패: {res.text}")
    except Exception as e:
        log.error(f"매수 주문 저장 오류: {e}")


# ── RSI Cutler 골든크로스 ─────────────────────────────────

def rsi_cutler(series, window=14):
    delta = series.diff()
    up    = delta.clip(lower=0)
    down  = -delta.clip(upper=0)
    ma_up   = up.rolling(window).mean()
    ma_down = down.rolling(window).mean().replace(0, np.nan)
    return 100 - (100 / (1 + ma_up / ma_down))


def check_golden_cross(code):
    try:
        start = (datetime.datetime.now() - datetime.timedelta(days=120)).strftime("%Y-%m-%d")
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        df = fdr.DataReader(code, start=start, end=today)
        if df is None or len(df) < 30:
            return None

        df["RSI"]    = rsi_cutler(df["Close"])
        df["Signal"] = df["RSI"].rolling(9).mean()
        df["Diff"]   = df["RSI"] - df["Signal"]
        df.dropna(inplace=True)
        if len(df) < 2:
            return None

        curr = df.iloc[-1]
        prev = df.iloc[-2]
        if prev["Diff"] < 0 and curr["Diff"] > 0:
            return (float(curr["Close"]), round(float(curr["RSI"]), 2), round(float(curr["Signal"]), 2))
    except Exception as e:
        log.debug(f"[{code}] RSI 계산 오류: {e}")
    return None


# ── KIS API ───────────────────────────────────────────────

def get_access_token(app_key, app_secret):
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "r", encoding="utf-8") as f:
            try:
                td  = json.load(f)
                exp = datetime.datetime.strptime(td["expire_time"], "%Y-%m-%d %H:%M:%S")
                if exp > datetime.datetime.now() + datetime.timedelta(hours=2):
                    return td["access_token"]
            except Exception:
                pass
    res = requests.post(
        f"{BASE_URL}/oauth2/tokenP",
        headers={"content-type": "application/json"},
        data=json.dumps({"grant_type": "client_credentials", "appkey": app_key, "appsecret": app_secret}),
        timeout=10,
    )
    res.raise_for_status()
    token   = res.json()["access_token"]
    exp_str = (datetime.datetime.now() + datetime.timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
    with open(TOKEN_FILE, "w", encoding="utf-8") as f:
        json.dump({"access_token": token, "expire_time": exp_str}, f)
    return token


def buy_market_order(token, app_key, app_secret, cano, acnt_prdt_cd, code, qty):
    res = requests.post(
        f"{BASE_URL}/uapi/domestic-stock/v1/trading/order-cash",
        headers={
            "Content-Type": "application/json",
            "authorization": f"Bearer {token}",
            "appkey": app_key, "appsecret": app_secret,
            "tr_id": "TTTC0012U", "custtype": "P",
        },
        data=json.dumps({
            "CANO": cano, "ACNT_PRDT_CD": acnt_prdt_cd,
            "PDNO": code, "ORD_DVSN": "01", "ORD_QTY": str(qty), "ORD_UNPR": "0",
        }),
        timeout=15,
    )
    res.raise_for_status()
    return res.json()


# ── 핵심 로직 ─────────────────────────────────────────────

def check_and_buy():
    if not is_auto_trade_enabled():
        log.info("자동 매매 OFF 상태 — 매수 건너뜀")
        return

    now        = datetime.datetime.now()
    order_time = now.strftime("%Y-%m-%dT%H:%M:%S")
    log.info(f"=== RSI 골든크로스 매수 확인: {order_time} ===")

    (app_key, app_secret, cano, acnt_prdt_cd,
     secret, portal_url, buy_amount, tg_token, tg_chat) = load_config()

    targets = get_target_codes(portal_url, secret)
    if not targets:
        log.warning("스캔 대상 종목 없음. 설정 페이지에서 종목을 추가하세요.")
        return

    log.info(f"스캔 대상: {len(targets)}종목")
    token = get_access_token(app_key, app_secret)

    for code, name in targets:
        result = check_golden_cross(code)
        if result is None:
            continue

        price, rsi, signal = result
        log.info(f"  ★ RSI 돌파 [{code}] {name}  RSI={rsi:.2f}  Signal={signal:.2f}  현재가={price:,.0f}원")

        if is_already_bought_today(portal_url, secret, code):
            log.info(f"  → 당일 이미 매수 완료 ({code}), 건너뜀")
            continue

        qty = max(1, int(buy_amount / price)) if price > 0 else 1
        log.info(f"  → 시장가 매수 {qty}주 (기준금액 {buy_amount:,}원)")

        try:
            order_result = buy_market_order(token, app_key, app_secret, cano, acnt_prdt_cd, code, qty)
        except Exception as e:
            err_msg = str(e)
            log.error(f"  ✗ API 호출 오류: {err_msg}")
            save_buy_order(portal_url, secret, {
                "orderTime": order_time, "stockCode": code, "stockName": name,
                "orderQty": qty, "refPrice": price, "rsiValue": rsi, "signalValue": signal,
                "orderNo": None, "resultCode": "ERR", "resultMsg": err_msg,
            })
            notify_buy_fail(tg_token, tg_chat, name, code, qty, price, rsi, signal, "ERR", err_msg)
            continue

        order_no = order_result.get("output", {}).get("ODNO", "")
        rt_cd    = order_result.get("rt_cd", "")
        msg      = order_result.get("msg1", "")

        save_buy_order(portal_url, secret, {
            "orderTime": order_time, "stockCode": code, "stockName": name,
            "orderQty": qty, "refPrice": price, "rsiValue": rsi, "signalValue": signal,
            "orderNo": order_no, "resultCode": rt_cd, "resultMsg": msg,
        })

        if rt_cd == "0":
            log.info(f"  ✓ 매수 성공  주문번호: {order_no}")
            notify_buy_success(tg_token, tg_chat, name, code, qty, price, rsi, signal, order_no)
        else:
            log.error(f"  ✗ 매수 실패: {msg}")
            notify_buy_fail(tg_token, tg_chat, name, code, qty, price, rsi, signal, rt_cd, msg)

    log.info("=== 매수 확인 완료 ===\n")


# ── 진입점 ────────────────────────────────────────────────

def run_scheduler():
    from apscheduler.schedulers.blocking import BlockingScheduler
    from apscheduler.triggers.cron import CronTrigger

    log.info("RSI 골든크로스 자동 매수 스케줄러 시작 (평일 15:00~15:25, 5분 간격)")
    scheduler = BlockingScheduler(timezone="Asia/Seoul")
    scheduler.add_job(
        check_and_buy,
        CronTrigger(day_of_week="mon-fri", hour=15, minute="0,5,10,15,20,25", timezone="Asia/Seoul"),
    )
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("스케줄러 종료")


if __name__ == "__main__":
    if "--once" in sys.argv:
        if is_auto_buy_time():
            try:
                check_and_buy()
            except Exception as e:
                log.error(f"오류: {e}", exc_info=True)
                sys.exit(1)
        else:
            log.info(f"자동 매수 시간 외 종료 ({datetime.datetime.now().strftime('%H:%M')})")
    else:
        try:
            run_scheduler()
        except Exception as e:
            log.error(f"오류: {e}", exc_info=True)
            sys.exit(1)
