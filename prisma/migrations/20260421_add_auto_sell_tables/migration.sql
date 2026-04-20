-- AutoSellCheck: 평가손익 확인 이력
CREATE TABLE "AutoSellCheck" (
    "id"             TEXT NOT NULL,
    "checkTime"      TIMESTAMP(3) NOT NULL,
    "stockCode"      TEXT NOT NULL,
    "stockName"      TEXT NOT NULL,
    "holdQty"        INTEGER NOT NULL,
    "avgPrice"       DOUBLE PRECISION NOT NULL,
    "currentPrice"   DOUBLE PRECISION NOT NULL,
    "evalAmount"     DOUBLE PRECISION NOT NULL,
    "evalPflsAmount" DOUBLE PRECISION NOT NULL,
    "evalPflsRate"   DOUBLE PRECISION NOT NULL,
    "sellTriggered"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutoSellCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutoSellCheck_checkTime_idx" ON "AutoSellCheck"("checkTime");
CREATE INDEX "AutoSellCheck_stockCode_idx" ON "AutoSellCheck"("stockCode");

-- AutoSellOrder: 자동 매도 주문 이력
CREATE TABLE "AutoSellOrder" (
    "id"          TEXT NOT NULL,
    "orderTime"   TIMESTAMP(3) NOT NULL,
    "stockCode"   TEXT NOT NULL,
    "stockName"   TEXT NOT NULL,
    "orderQty"    INTEGER NOT NULL,
    "triggerRate" DOUBLE PRECISION NOT NULL,
    "orderNo"     TEXT,
    "resultCode"  TEXT,
    "resultMsg"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutoSellOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutoSellOrder_orderTime_idx" ON "AutoSellOrder"("orderTime");
CREATE INDEX "AutoSellOrder_stockCode_idx" ON "AutoSellOrder"("stockCode");
