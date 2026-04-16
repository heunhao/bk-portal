import sys
import json
import FinanceDataReader as fdr
import pandas as pd
from datetime import datetime, timedelta


def get_super_signal(symbol, target_date):
    # 지표 계산을 위해 시작일을 넉넉히 설정 (약 100일 전)
    try:
        start_dt = datetime.strptime(target_date, '%Y-%m-%d') - timedelta(days=100)
        start_date = start_dt.strftime('%Y-%m-%d')

        # 데이터 로드
        df = fdr.DataReader(symbol, start_date, target_date)

        # 데이터가 아예 없거나 너무 적으면(최소 30일치 필요) 스킵
        if df is None or len(df) < 30:
            return None

        # 1. Cutler's RSI 계산
        window = 14
        diff = df['Close'].diff()
        gain = diff.where(diff > 0, 0).rolling(window=window).mean()
        loss = (-diff.where(diff < 0, 0)).rolling(window=window).mean().replace(0, 0.001)
        df['RSI'] = 100 - (100 / (1 + (gain / loss)))

        # 2. 이동평균선(MA20) 계산
        df['MA20'] = df['Close'].rolling(window=20).mean()

        # 3. 데이터 추출 (가장 마지막 행과 그 전날 행)
        curr = df.iloc[-1]
        prev = df.iloc[-2]

        # --- 핵심 조건 필터링 ---
        # (1) RSI 조건: 어제는 40 이하(침체)였는데 오늘 RSI가 상승했는가?
        is_rsi_up = (prev['RSI'] <= 40) and (curr['RSI'] > prev['RSI'])

        # (2) 이평선 조건: 오늘 종가가 20일 이동평균선(MA20) 위로 올라왔는가?
        is_above_ma20 = (curr['Close'] >= curr['MA20'])

        # (3) 거래량 조건: 오늘 거래량이 최근 5일 평균 거래량의 150% 이상인가?
        avg_vol_5d = df['Volume'].iloc[-6:-1].mean()
        is_vol_surge = (curr['Volume'] > avg_vol_5d * 1.5) if (avg_vol_5d and avg_vol_5d > 0) else False

        # (4) 캔들 조건: 양봉 마감 (종가 > 시가)
        is_bull_candle = (curr['Close'] > curr['Open'])

        if is_rsi_up and is_above_ma20 and is_vol_surge and is_bull_candle:
            return {
                '코드': symbol,
                '현재가': int(curr['Close']),
                'RSI': round(float(curr['RSI']), 2),
                '거래량비율': round(float(curr['Volume'] / avg_vol_5d), 2) if avg_vol_5d > 0 else 0,
            }
    except Exception:
        return None
    return None


def emit(data):
    print(json.dumps(data, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    # 웹에서 호출 시 argv[1]로 날짜 전달, 없으면 오늘 날짜 사용
    target_date = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime('%Y-%m-%d')

    # 코스피 종목 리스트 로드
    try:
        df_kospi = fdr.StockListing('KOSPI')
    except Exception as e:
        emit({"type": "error", "message": f"종목 리스트 로드 실패: {str(e)}"})
        sys.exit(1)

    total = len(df_kospi)
    emit({"type": "start", "total": total, "date": target_date})

    results = []

    for i, (_, row) in enumerate(df_kospi.iterrows()):
        # 진행 상황 실시간 전송
        emit({"type": "scanning", "index": i + 1, "total": total, "code": row['Code'], "name": row['Name']})

        res = get_super_signal(row['Code'], target_date)
        if res:
            res['종목명'] = row['Name']
            results.append(res)
            # 결과 실시간 전송
            emit({"type": "result",
                  "code": res['코드'],
                  "name": res['종목명'],
                  "price": res['현재가'],
                  "rsi": res['RSI'],
                  "volRatio": res['거래량비율']})

            if len(results) >= 15:
                break

    emit({"type": "done", "count": len(results)})
