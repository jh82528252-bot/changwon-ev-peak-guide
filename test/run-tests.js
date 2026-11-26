const assert = require("assert");
const { INITIAL_STATIONS } = require("../js/data.js");
const {
  validateUserInput,
  calcNeededEnergyKwh,
  calcChargingMinutes
} = require("../js/calculator.js");
const { buildRecommendation, simulatePeakDistribution } = require("../js/recommender.js");

// 1. 필요 충전 에너지 및 충전 시간 테스트
assert.strictEqual(calcNeededEnergyKwh(30, 80, 60), 30);
assert.ok(calcChargingMinutes(30, 80, 60, 100, 100) > 0);
assert.strictEqual(calcChargingMinutes(80, 80, 60, 100, 100), 0);

// 2. 입력 검증 및 목표 SOC <= 현재 SOC 예외 테스트
const invalidRes = validateUserInput({
  currentSoc: 120,
  targetSoc: 80,
  batteryKwh: 60,
  maxVehicleKw: 100,
  dwellMin: 45,
  hourSlot: 12
});
assert.strictEqual(invalidRes.valid, false);

const chargedRes = validateUserInput({
  currentSoc: 85,
  targetSoc: 80,
  batteryKwh: 60,
  maxVehicleKw: 100,
  dwellMin: 45,
  hourSlot: 12
});
assert.strictEqual(chargedRes.valid, true);
assert.strictEqual(chargedRes.alreadyCharged, true);

// 3. 이용 가능 충전소 없음 예외 테스트
const allDown = INITIAL_STATIONS.map(s => ({ ...s, status: "MAINTENANCE" }));
const noAvailRec = buildRecommendation(allDown, {
  region: "팔용동",
  currentSoc: 30,
  targetSoc: 80,
  batteryKwh: 60,
  maxVehicleKw: 100,
  dwellMin: 45,
  hourSlot: 12,
  season: "spring_fall"
});
assert.strictEqual(noAvailRec.status, "NO_AVAILABLE_STATION");

// 4. 정상 추천, 대체 충전소, 수요 분산 시뮬레이션 테스트
const okRec = buildRecommendation(INITIAL_STATIONS, {
  region: "팔용동",
  currentSoc: 30,
  targetSoc: 80,
  batteryKwh: 60,
  maxVehicleKw: 100,
  dwellMin: 45,
  hourSlot: 12,
  season: "spring_fall"
});
assert.strictEqual(okRec.status, "OK");
assert.ok(okRec.recommended !== null);
assert.ok(okRec.alternatives.length >= 1);

const distSim = simulatePeakDistribution();
assert.strictEqual(distSim.targetPeakRate, 65);
assert.strictEqual(distSim.rows.length, 3);

console.log("ALL TESTS PASSED");
