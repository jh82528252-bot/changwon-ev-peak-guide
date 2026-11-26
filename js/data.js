const INITIAL_STATIONS = [
  {
    id: "PY-01",
    name: "팔용동 공영주차장 충전소",
    region: "팔용동",
    type: "급속",
    ratedKw: 100,
    operationalChargers: 4,
    chargingNow: 2,
    queueCountSim: 0,
    avgChargeSessionMin: 35,
    extraDetourMin: 3,
    status: "AVAILABLE",
    dataSourceType: "시뮬레이션/샘플"
  },
  {
    id: "PY-02",
    name: "팔용동 근린생활시설 완속소",
    region: "팔용동",
    type: "완속",
    ratedKw: 7,
    operationalChargers: 6,
    chargingNow: 3,
    queueCountSim: 0,
    avgChargeSessionMin: 180,
    extraDetourMin: 2,
    status: "AVAILABLE",
    dataSourceType: "시뮬레이션/샘플"
  },
  {
    id: "JA-01",
    name: "중앙동 행정·상업지구 급속소",
    region: "중앙동",
    type: "급속",
    ratedKw: 100,
    operationalChargers: 4,
    chargingNow: 3,
    queueCountSim: 1,
    avgChargeSessionMin: 35,
    extraDetourMin: 4,
    status: "AVAILABLE",
    dataSourceType: "시뮬레이션/샘플"
  },
  {
    id: "JA-02",
    name: "중앙동 오피스 주변 완속소",
    region: "중앙동",
    type: "완속",
    ratedKw: 7,
    operationalChargers: 5,
    chargingNow: 4,
    queueCountSim: 0,
    avgChargeSessionMin: 180,
    extraDetourMin: 6,
    status: "AVAILABLE",
    dataSourceType: "시뮬레이션/샘플"
  },
  {
    id: "SD-01",
    name: "석동 생활거점 급속 충전소",
    region: "석동",
    type: "급속",
    ratedKw: 50,
    operationalChargers: 3,
    chargingNow: 1,
    queueCountSim: 0,
    avgChargeSessionMin: 40,
    extraDetourMin: 4,
    status: "AVAILABLE",
    dataSourceType: "시뮬레이션/샘플"
  },
  {
    id: "SD-02",
    name: "석동 주거밀집 완속 충전소",
    region: "석동",
    type: "완속",
    ratedKw: 7,
    operationalChargers: 6,
    chargingNow: 5,
    queueCountSim: 1,
    avgChargeSessionMin: 180,
    extraDetourMin: 2,
    status: "MAINTENANCE",
    dataSourceType: "시뮬레이션/샘플"
  }
];

function getBaseOccupancyByHour(region, hour) {
  const table = {
    "석동":   { dawn: 85, mid: 35, eve: 80, trans: 60 },
    "팔용동": { dawn: 80, mid: 40, eve: 85, trans: 62 },
    "중앙동": { dawn: 80, mid: 35, eve: 90, trans: 65 }
  };
  const r = table[region] || table["팔용동"];
  if (hour >= 0 && hour < 3) return r.dawn;
  if (hour >= 10 && hour < 15) return r.mid;
  if (hour >= 18 && hour < 23) return r.eve;
  return r.trans;
}

function getSeasonDelta(season) {
  if (season === "winter") return 15;
  if (season === "summer") return 5;
  return 0;
}

function mapApiItemsToStations(items) {
  const filtered = items.filter(it =>
    ["팔용동", "중앙동", "석동"].some(dong => (it.addr || "").includes(dong))
  );
  return filtered.slice(0, 12).map((it, idx) => {
    const region = it.addr.includes("팔용동") ? "팔용동" : it.addr.includes("중앙동") ? "중앙동" : "석동";
    const kw = Number(it.output || 7);
    const isFast = kw >= 50;
    const stat = String(it.stat || "2");
    let status = "AVAILABLE";
    if (stat === "4" || stat === "5") status = "MAINTENANCE";
    else if (stat === "1" || stat === "9") status = "COMM_ERROR";

    return {
      id: (it.statId || "API") + "-" + idx,
      name: it.statNm || `충전소 ${idx + 1}`,
      region,
      type: isFast ? "급속" : "완속",
      ratedKw: kw,
      operationalChargers: 2,
      chargingNow: stat === "3" ? 1 : 0,
      queueCountSim: 0,
      avgChargeSessionMin: isFast ? 35 : 180,
      extraDetourMin: 3 + (idx % 4),
      status,
      dataSourceType: `실제 API(갱신:${it.statUpdDt || "-"})`
    };
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { INITIAL_STATIONS, getBaseOccupancyByHour, getSeasonDelta, mapApiItemsToStations };
}
