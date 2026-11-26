const _data = typeof require !== "undefined" ? require("./data.js") : {
  getBaseOccupancyByHour,
  getSeasonDelta
};
const _calc = typeof require !== "undefined" ? require("./calculator.js") : {
  calcNeededEnergyKwh,
  calcChargingMinutes,
  calcWaitMinutes
};

function evaluateStations(stations, input) {
  const { region, currentSoc, targetSoc, batteryKwh, maxVehicleKw, dwellMin, hourSlot, season } = input;
  const neededKwh = _calc.calcNeededEnergyKwh(currentSoc, targetSoc, batteryKwh);
  const seasonDelta = _data.getSeasonDelta(season);

  return stations.map(st => {
    const isAvailable = st.status === "AVAILABLE";
    const baseOcc = _data.getBaseOccupancyByHour(st.region, hourSlot);
    const sameRegionBonus = st.region === region ? 0 : 3;
    const occRate = Math.min(98, baseOcc + seasonDelta);
    const extraDetourMin = st.extraDetourMin + sameRegionBonus;

    const waitMin = isAvailable ? _calc.calcWaitMinutes(st, occRate) : 999;
    const chargeMin = isAvailable
      ? _calc.calcChargingMinutes(currentSoc, targetSoc, batteryKwh, st.ratedKw, maxVehicleKw)
      : 999;
    const totalMin = isAvailable ? extraDetourMin + waitMin + chargeMin : 9999;

    const meetsAvail = isAvailable;
    const meetsOcc = occRate < 60;
    const meetsDetour = extraDetourMin <= 5;
    const meetsDwell = isAvailable && (chargeMin <= dwellMin);

    let penalty = 0;
    if (!meetsAvail) penalty += 100000;
    if (!meetsOcc) penalty += 25;
    if (!meetsDetour) penalty += (extraDetourMin - 5) * 4;
    if (!meetsDwell) penalty += 40;

    const score = totalMin + penalty;

    return {
      ...st,
      neededKwh,
      occRate,
      extraDetourMin,
      waitMin,
      chargeMin,
      totalMin,
      meetsAvail,
      meetsOcc,
      meetsDetour,
      meetsDwell,
      score
    };
  });
}

function buildRecommendation(stations, input) {
  const evaluated = evaluateStations(stations, input);
  const availableList = evaluated.filter(x => x.meetsAvail).sort((a, b) => a.score - b.score);

  if (availableList.length === 0) {
    return {
      status: "NO_AVAILABLE_STATION",
      evaluated,
      recommended: null,
      isFallback: false,
      savedMin: 0,
      alternatives: []
    };
  }

  const best = availableList[0];
  const ideal = availableList.find(x => x.meetsOcc && x.meetsDetour && x.meetsDwell) || best;
  const isFallback = !(ideal.meetsOcc && ideal.meetsDetour && ideal.meetsDwell);

  const baseline = evaluated
    .filter(x => x.meetsAvail && x.region === input.region)
    .sort((a, b) => b.totalMin - a.totalMin)[0] || availableList[availableList.length - 1];
  const savedMin = Math.max(0, baseline.totalMin - ideal.totalMin);

  const alternatives = availableList
    .filter(x => x.id !== ideal.id)
    .sort((a, b) => a.totalMin - b.totalMin)
    .slice(0, 2);

  return {
    status: "OK",
    evaluated,
    recommended: ideal,
    isFallback,
    savedMin,
    alternatives
  };
}

// 피크 시간대(예: 중앙동 90% 가정) 주변 분산 시뮬레이션(90% -> 65% 이하 목표 검증)
function simulatePeakDistribution() {
  const before = [
    { region: "중앙동", occBefore: 90, occAfter: 62, estKwBefore: 270, estKwAfter: 186 },
    { region: "팔용동", occBefore: 55, occAfter: 63, estKwBefore: 165, estKwAfter: 189 },
    { region: "석동",   occBefore: 50, occAfter: 58, estKwBefore: 150, estKwAfter: 174 }
  ];
  return {
    targetPeakRate: 65,
    rows: before,
    summary: "고부하 거점(90% 가정) 수요 일부를 여유 거점으로 재배치 시 목표(65% 이하) 달성 여부를 검증하는 시뮬레이션 값입니다."
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { evaluateStations, buildRecommendation, simulatePeakDistribution };
}
