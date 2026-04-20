##############################################################
# RSI 골든크로스(돌파) 종목 스캔 - 웹 서비스용
# - bk-portal 설정 페이지에 등록된 종목 대상으로 스캔
# - RSI Cutler(14) 골든크로스 → 직전 음수에서 양수로 전환
# - stdout: JSON 라인 스트리밍 (type: start|scanning|result|done)
#
# 사용법: python hantoo_rsi_golden.py [YYYY-MM-DD] [portal_url] [monitor_secret]
##############################################################

import sys
import os
import json
import datetime
import requests
import numpy as np

try:
    import FinanceDataReader as fdr
except ImportError:
    print(json.dumps({"type": "error", "message": "FinanceDataReader 미설치: pip install FinanceDataReader"}, ensure_ascii=False))
    sys.exit(1)

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "config.json")


def load_config():
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    return cfg.get("MONITOR_SECRET", ""), cfg.get("PORTAL_URL", "http://localhost:3000")


def emit(data):
    print(json.dumps(data, ensure_ascii=False), flush=True)


def get_target_codes(portal_url, secret):
    try:
        res = requests.get(
            f"{portal_url}/api/hantoo/auto-buy/targets",
            headers={"x-monitor-secret": secret},
            timeout=10,
        )
        return [(t["stockCode"], t["stockName"]) for t in res.json().get("targets", [])]
    except Exception as e:
        emit({"type": "error", "message": f"종목 목록 조회 실패: {e}"})
        return []


def rsi_cutler(series, window=14):
    delta = series.diff()
    up    = delta.clip(lower=0)
    down  = -delta.clip(upper=0)
    ma_up   = up.rolling(window).mean()
    ma_down = down.rolling(window).mean().replace(0, np.nan)
    return 100 - (100 / (1 + ma_up / ma_down))


def check_golden_cross(code, target_date):
    try:
        start = (datetime.datetime.strptime(target_date, "%Y-%m-%d") - datetime.timedelta(days=120)).strftime("%Y-%m-%d")
        df = fdr.DataReader(code, start=start, end=target_date)
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
            return {
                "price":   int(curr["Close"]),
                "rsi":     round(float(curr["RSI"]), 2),
                "signal":  round(float(curr["Signal"]), 2),
                "rsiDiff": round(float(curr["Diff"]), 2),
                "ma5":     round(float(df["Close"].rolling(5).mean().iloc[-1]), 0),
            }
    except Exception:
        pass
    return None


if __name__ == "__main__":
    target_date  = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now().strftime("%Y-%m-%d")
    secret_arg   = sys.argv[2] if len(sys.argv) > 2 else None
    portal_arg   = sys.argv[3] if len(sys.argv) > 3 else None

    secret, portal_url = load_config()
    if secret_arg:
        secret = secret_arg
    if portal_arg:
        portal_url = portal_arg

    targets = get_target_codes(portal_url, secret)
    if not targets:
        emit({"type": "error", "message": "설정 페이지에 스캔 대상 종목이 없습니다."})
        sys.exit(1)

    emit({"type": "start", "total": len(targets), "date": target_date})

    results = []
    for i, (code, name) in enumerate(targets):
        emit({"type": "scanning", "index": i + 1, "total": len(targets), "code": code, "name": name})

        res = check_golden_cross(code, target_date)
        if res:
            result = {
                "code":    code,
                "name":    name,
                "price":   res["price"],
                "rsi":     res["rsi"],
                "signal":  res["signal"],
                "rsiDiff": res["rsiDiff"],
                "ma5":     res["ma5"],
            }
            results.append(result)
            emit({"type": "result", **result})

    emit({"type": "done", "count": len(results), "results": results})
