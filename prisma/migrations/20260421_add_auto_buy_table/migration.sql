-- AutoBuyOrder: RSI 골든크로스 자동 매수 주문 이력
CREATE TABLE "AutoBuyOrder" (
    "id"          TEXT NOT NULL,
    "orderTime"   TIMESTAMP(3) NOT NULL,
    "stockCode"   TEXT NOT NULL,
    "stockName"   TEXT NOT NULL,
    "orderQty"    INTEGER NOT NULL,
    "refPrice"    DOUBLE PRECISION NOT NULL,
    "rsiValue"    DOUBLE PRECISION NOT NULL,
    "signalValue" DOUBLE PRECISION NOT NULL,
    "orderNo"     TEXT,
    "resultCode"  TEXT,
    "resultMsg"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutoBuyOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutoBuyOrder_orderTime_idx" ON "AutoBuyOrder"("orderTime");
CREATE INDEX "AutoBuyOrder_stockCode_idx" ON "AutoBuyOrder"("stockCode");
