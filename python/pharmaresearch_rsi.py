##############################################################
# 파마리서치(214450) 최근 6개월 RSI 분석
# - stdout: JSON (date, close, rsi, signal 배열)
##############################################################

import sys
import json
import datetime

try:
    import FinanceDataReader as fdr
    import pandas as pd
except ImportError:
    print(json.dumps({"error": "FinanceDataReader 미설치: pip install finance-datareader"}, ensure_ascii=False))
    sys.exit(1)

TICKER      = "214450"
RSI_PERIOD  = 14
SIG_PERIOD  = 9
MONTHS      = 6


def calc_rsi(series, period=14):
    delta    = series.diff()
    gain     = delta.clip(lower=0)
    loss     = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs       = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


if __name__ == "__main__":
    end_dt   = datetime.datetime.today()
    # RSI 안정화를 위해 6개월 + 60일 여유분
    start_dt = end_dt - datetime.timedelta(days=MONTHS * 30 + 60)

    try:
        df = fdr.DataReader(TICKER, start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d"))
    except Exception as e:
        print(json.dumps({"error": f"데이터 로드 실패: {e}"}, ensure_ascii=False))
        sys.exit(1)

    if df is None or df.empty:
        print(json.dumps({"error": "데이터 없음"}, ensure_ascii=False))
        sys.exit(1)

    # 컬럼명 정규화
    df = df.rename(columns={"종가": "Close", "거래량": "Volume", "시가": "Open", "고가": "High", "저가": "Low"})
    if "Close" not in df.columns:
        print(json.dumps({"error": "Close 컬럼 없음"}, ensure_ascii=False))
        sys.exit(1)

    df["RSI"]    = calc_rsi(df["Close"], period=RSI_PERIOD)
    df["Signal"] = df["RSI"].rolling(window=SIG_PERIOD).mean()
    df           = df.dropna(subset=["RSI", "Signal"])

    # 최근 6개월만 반환
    cutoff = end_dt - datetime.timedelta(days=MONTHS * 30)
    recent = df[df.index >= pd.Timestamp(cutoff)]

    rows = []
    for date, row in recent.iterrows():
        rows.append({
            "date":   date.strftime("%Y-%m-%d"),
            "close":  int(row["Close"]),
            "rsi":    round(float(row["RSI"]), 2),
            "signal": round(float(row["Signal"]), 2),
        })

    latest = rows[-1] if rows else {}
    print(json.dumps({
        "ticker":  TICKER,
        "name":    "파마리서치",
        "rows":    rows,
        "latest":  latest,
        "count":   len(rows),
    }, ensure_ascii=False))
