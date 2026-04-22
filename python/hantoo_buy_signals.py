##############################################################
# 매수 신호 스캔 - 설정 등록 종목 전체의 RSI Cutler 분석
# - argv[1]: 기준일 (YYYY-MM-DD)
# - stdout : JSON { success, results: [...], date }
# 결과: 전체 종목 + RSI_Cutler, Signal_Cutler, RSI골든크로스, 매수대상
##############################################################

import sys
import json
import datetime
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import FinanceDataReader as fdr
    import pandas as pd
except ImportError as e:
    print(json.dumps({"success": False, "error": f"패키지 미설치: {e}"}, ensure_ascii=False))
    sys.exit(1)


def rsi_cutler(close, period=14):
    delta    = close.diff()
    up       = delta.clip(lower=0)
    down     = (-delta).clip(lower=0)
    avg_up   = up.rolling(window=period, min_periods=period).mean()
    avg_down = down.rolling(window=period, min_periods=period).mean()
    data_ok  = avg_up.notna() & avg_down.notna()
    with np.errstate(divide="ignore", invalid="ignore"):
        rs = np.where(avg_down == 0, np.inf, avg_up / avg_down)
    rs  = pd.Series(rs, index=close.index)
    rsi = 100 - (100 / (1 + rs))
    return rsi.where(data_ok, np.nan)


def process_stock(code, name, date_str):
    try:
        start = (datetime.datetime.strptime(date_str, "%Y-%m-%d") - datetime.timedelta(days=120)).strftime("%Y-%m-%d")
        df    = fdr.DataReader(code, start=start, end=date_str)
        if df is None or len(df) < 24:
            return None

        df["RSI"]    = rsi_cutler(df["Close"])
        df["Signal"] = df["RSI"].rolling(window=9, min_periods=9).mean()
        df["Diff"]   = df["RSI"] - df["Signal"]
        df.dropna(subset=["RSI", "Signal"], inplace=True)
        if len(df) < 2:
            return None

        curr = df.iloc[-1]
        prev = df.iloc[-2]
        golden_cross = bool(prev["Diff"] < 0 and curr["Diff"] > 0)
        actual_date  = df.index[-1].strftime("%Y-%m-%d")

        return {
            "date":        actual_date,
            "code":        code,
            "name":        name,
            "close":       int(curr["Close"]),
            "rsi":         round(float(curr["RSI"]), 2),
            "signal":      round(float(curr["Signal"]), 2),
            "goldenCross": golden_cross,
            "buyTarget":   golden_cross,
        }
    except Exception:
        return None


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "인자 부족: date stocks_json"}, ensure_ascii=False))
        sys.exit(1)

    date_str   = sys.argv[1]
    stocks_raw = json.loads(sys.argv[2])  # [{"code": "...", "name": "..."}, ...]
    stocks     = [(s["code"], s["name"]) for s in stocks_raw]

    if not stocks:
        print(json.dumps({"success": False, "error": "스캔 대상 종목이 없습니다."}, ensure_ascii=False))
        sys.exit(0)

    results = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_stock, code, name, date_str): code for code, name in stocks}
        for future in as_completed(futures):
            res = future.result()
            if res:
                results.append(res)

    results.sort(key=lambda x: x["code"])
    print(json.dumps({"success": True, "results": results, "date": date_str}, ensure_ascii=False))
