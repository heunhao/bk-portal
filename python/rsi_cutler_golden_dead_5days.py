##############################################################
# KOSPI200 RSI 크로스 발생 종목 추출기 (웹 서비스용)
# - argv[1]: 모드 'golden' | 'dead'
# - argv[2]: 기준일 'YYYY-MM-DD' (생략 시 어제)
# - stdout : JSON 라인 스트리밍 (SSE 용)
##############################################################

import sys
import os
import json
import FinanceDataReader as fdr
import pandas as pd
from datetime import datetime, timedelta

# ─── 파라미터 ────────────────────────────────────────────────
RSI_PERIOD      = 14
SIGNAL_PERIOD   = 9
OVERSOLD_LINE   = 30
OVERBOUGHT_LINE = 70
NEAR_CROSS_GAP  = 0.7

# ─── JSON 스트리밍 출력 ──────────────────────────────────────
def emit(data):
    print(json.dumps(data, ensure_ascii=False), flush=True)

# ─── config.json 로드 (텔레그램 설정) ───────────────────────
def load_config():
    script_dir  = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, "config.json")
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        return cfg.get("TELEGRAM_TOKEN", ""), cfg.get("TELEGRAM_CHAT_ID", "")
    except Exception:
        return "", ""

# ─── 텔레그램 메시지 전송 ────────────────────────────────────
def send_telegram(token, chat_id, message):
    if not token or not chat_id:
        return
    try:
        import requests
        url  = f"https://api.telegram.org/bot{token}/sendMessage"
        data = {"chat_id": chat_id, "text": message, "parse_mode": "HTML"}
        requests.post(url, data=data, timeout=10)
    except Exception:
        pass

# ─── 텔레그램 메시지 생성 ────────────────────────────────────
def build_telegram_message(mode, a_date, total, hit_count, results):
    now        = datetime.now().strftime("%Y-%m-%d %H:%M")
    mode_label = "골든크로스 (매수)" if mode == "golden" else "데드크로스 (매도)"
    icon       = "📈" if mode == "golden" else "📉"
    spec_col   = "과매도_탈출" if mode == "golden" else "과매수_진입"
    spec_icon  = "🔴과매도탈출" if mode == "golden" else "🔵과매수진입"

    lines = [
        f"<b>{icon} KOSPI200 RSI {mode_label} 스캔 완료</b>",
        f"━━━━━━━━━━━━━━━━━━━━",
        f"🗓 기준일(A)  : {a_date}",
        f"🔍 분석 종목  : {total}개",
        f"✅ 적중 종목  : {hit_count}개",
        f"🕐 완료 시각  : {now}",
        f"━━━━━━━━━━━━━━━━━━━━",
    ]

    if results:
        lines.append("<b>[적중 종목 요약]</b>")
        sorted_results = sorted(results, key=lambda r: (r["ma5Break"], r["special"]))
        for r in sorted_results:
            spec_tag = f" {spec_icon}" if r["special"] == "O" else ""
            ma5_tag  = " 📊"           if r["ma5Break"] == "O" else ""
            lines.append(f"• {r['name']} 종가:{r['price']:,}{spec_tag}{ma5_tag}")
    else:
        lines.append("조건 충족 종목 없음")

    return "\n".join(lines)

# ─── 이전 거래일 계산 ────────────────────────────────────────
def get_prev_business_day(date_str):
    dt = datetime.strptime(date_str, "%Y-%m-%d") - timedelta(days=1)
    while dt.weekday() >= 5:
        dt -= timedelta(days=1)
    return dt.strftime("%Y-%m-%d")

# ─── RSI 계산 (Wilder's Smoothing) ──────────────────────────
def calc_rsi(series, period=14):
    delta    = series.diff()
    gain     = delta.clip(lower=0)
    loss     = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs       = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))

# ─── 종목별 분석 ─────────────────────────────────────────────
def analyze_ticker(ticker, name, mode, a_date, data_from, data_to):
    try:
        df = fdr.DataReader(ticker, data_from, data_to)

        if df is None or df.empty or len(df) < RSI_PERIOD + SIGNAL_PERIOD + 5:
            return None

        df = df.rename(columns={
            "종가": "Close", "거래량": "Volume",
            "시가": "Open",  "고가": "High", "저가": "Low",
        })
        if "Close" not in df.columns or "Volume" not in df.columns:
            return None

        has_open   = "Open" in df.columns
        df["RSI"]  = calc_rsi(df["Close"], period=RSI_PERIOD)
        df["Sig"]  = df["RSI"].rolling(window=SIGNAL_PERIOD).mean()
        df["MA5"]  = df["Close"].rolling(window=5).mean()
        df         = df.dropna(subset=["RSI", "Sig", "MA5"])

        a_ts = pd.Timestamp(a_date)
        if a_ts not in df.index:
            return None

        idx      = df.index.get_loc(a_ts)
        prev_idx = idx - 1
        if prev_idx < 0:
            return None

        prev_rsi   = df.iloc[prev_idx]["RSI"]
        prev_sig   = df.iloc[prev_idx]["Sig"]
        curr_rsi   = df.iloc[idx]["RSI"]
        curr_sig   = df.iloc[idx]["Sig"]
        prev_close = df.iloc[prev_idx]["Close"]
        curr_close = df.iloc[idx]["Close"]
        curr_ma5   = df.iloc[idx]["MA5"]
        curr_open  = df.iloc[idx]["Open"] if has_open else None
        curr_vol   = int(df.iloc[idx]["Volume"])

        if mode == "golden":
            is_classic = (prev_rsi <= prev_sig) and (curr_rsi > curr_sig)
            is_near    = (curr_rsi > curr_sig) and ((curr_rsi - curr_sig) <= NEAR_CROSS_GAP)
            is_cross   = is_classic or is_near
            is_special = (prev_rsi < OVERSOLD_LINE) and (curr_rsi >= OVERSOLD_LINE)
        else:
            is_classic = (prev_rsi >= prev_sig) and (curr_rsi < curr_sig)
            is_near    = (curr_rsi < curr_sig) and ((curr_sig - curr_rsi) <= NEAR_CROSS_GAP)
            is_cross   = is_classic or is_near
            is_special = (prev_rsi > OVERBOUGHT_LINE) and (curr_rsi <= OVERBOUGHT_LINE)

        if not is_cross:
            return None

        is_bullish   = (curr_open is not None) and (curr_close > curr_open)
        is_ma5_break = (prev_close < curr_ma5) and (curr_close > curr_ma5)

        return {
            "code"    : ticker,
            "name"    : name,
            "rsi"     : round(float(curr_rsi), 2),
            "signal"  : round(float(curr_sig), 2),
            "price"   : int(curr_close),
            "volume"  : curr_vol,
            "special" : "O" if is_special else "X",
            "ma5Break": "O" if (is_bullish and is_ma5_break) else "X",
        }

    except Exception:
        return None

# ─── 메인 ────────────────────────────────────────────────────
if __name__ == "__main__":
    mode_arg = sys.argv[1] if len(sys.argv) > 1 else "golden"
    mode     = mode_arg if mode_arg in ("golden", "dead") else "golden"

    raw_date = sys.argv[2] if len(sys.argv) > 2 else ""
    if not raw_date:
        raw_date = (datetime.today() - timedelta(days=1)).strftime("%Y-%m-%d")
    if len(raw_date) == 8 and raw_date.isdigit():
        raw_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"

    try:
        a_dt = datetime.strptime(raw_date, "%Y-%m-%d")
    except ValueError:
        emit({"type": "error", "message": f"날짜 형식 오류: {raw_date}"})
        sys.exit(1)

    a_date    = raw_date
    data_from = (a_dt - timedelta(days=120)).strftime("%Y-%m-%d")
    data_to   = (a_dt + timedelta(days=1)).strftime("%Y-%m-%d")
    spec_col  = "과매도_탈출" if mode == "golden" else "과매수_진입"

    # 종목 리스트 수집
    try:
        kospi200 = fdr.StockListing("KOSPI200")
        tickers  = list(zip(kospi200["Code"].tolist(), kospi200["Name"].tolist()))
    except Exception as e:
        try:
            kospi   = fdr.StockListing("KOSPI")
            tickers = list(zip(kospi["Code"].tolist()[:200], kospi["Name"].tolist()[:200]))
        except Exception as e2:
            emit({"type": "error", "message": f"종목 리스트 수집 실패: {e2}"})
            sys.exit(1)

    total = len(tickers)
    emit({"type": "start", "total": total, "date": a_date, "mode": mode, "specCol": spec_col})

    hit_results = []

    for i, (ticker, name) in enumerate(tickers):
        emit({"type": "scanning", "index": i + 1, "total": total, "code": ticker, "name": name})

        res = analyze_ticker(ticker, name, mode, a_date, data_from, data_to)
        if res:
            hit_results.append(res)
            emit({"type": "result", **res, "specCol": spec_col})

    emit({"type": "done", "count": len(hit_results)})

    # 텔레그램 알림
    token, chat_id = load_config()
    msg = build_telegram_message(mode, a_date, total, len(hit_results), hit_results)
    send_telegram(token, chat_id, msg)
