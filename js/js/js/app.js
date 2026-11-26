let currentStations = JSON.parse(JSON.stringify(INITIAL_STATIONS));

function readUserInput() {
  return {
    region: document.getElementById("region").value,
    destination: document.getElementById("destination").value,
    currentSoc: Number(document.getElementById("currentSoc").value),
    targetSoc: Number(document.getElementById("targetSoc").value),
    batteryKwh: Number(document.getElementById("batteryKwh").value),
    maxVehicleKw: Number(document.getElementById("maxVehicleKw").value),
    dwellMin: Number(document.getElementById("dwellMin").value),
    hourSlot: Number(document.getElementById("hourSlot").value),
    season: document.getElementById("season").value
  };
}

function readFilters() {
  return {
    region: document.getElementById("filterRegion").value,
    type: document.getElementById("filterType").value,
    avail: document.getElementById("filterAvail").value,
    sortBy: document.getElementById("sortBy").value
  };
}

function updateDashboard() {
  const input = readUserInput();
  const recArea = document.getElementById("recommendationArea");
  const tbody = document.getElementById("stationTableBody");
  const validation = validateUserInput(input);

  if (!validation.valid) {
    renderRecommendationPanel(recArea, input, {
      status: "INVALID_INPUT",
      errors: validation.errors
    });
    renderStationTable(tbody, [], readFilters());
    return;
  }

  if (validation.alreadyCharged) {
    renderRecommendationPanel(recArea, input, { status: "ALREADY_CHARGED" });
    renderStationTable(tbody, evaluateStations(currentStations, input), readFilters());
    return;
  }

  const result = buildRecommendation(currentStations, input);
  renderRecommendationPanel(recArea, input, result);
  renderStationTable(tbody, result.evaluated, readFilters());
}

async function tryLoadApi() {
  const key = document.getElementById("apiKey").value.trim();
  const statusEl = document.getElementById("apiStatus");
  if (!key) {
    statusEl.textContent = "ServiceKey가 비어 있어 내장 샘플 데이터를 사용합니다.";
    return;
  }
  statusEl.textContent = "한국환경공단 충전소 API 호출 중...";
  try {
    const url = `https://apis.data.go.kr/B552584/EvCharger/getChargerInfo?serviceKey=${encodeURIComponent(key)}&pageNo=1&numOfRows=30&zcode=48&dataType=JSON`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const items = data?.items?.item || [];
    const mapped = mapApiItemsToStations(items);
    if (mapped.length === 0) {
      statusEl.textContent = "API 응답은 수신했으나 팔용동·중앙동·석동 일치 항목이 없어 샘플 데이터를 유지합니다.";
      return;
    }
    currentStations = mapped;
    statusEl.textContent = `실제 API 데이터 ${currentStations.length}건을 반영했습니다. (가동률·대기시간은 시뮬레이션 병행)`;
    updateDashboard();
  } catch (err) {
    statusEl.textContent = `직접 브라우저 호출이 차단되었거나 응답에 실패했습니다(${err.message}). 내장 샘플 데이터로 계속 테스트할 수 있습니다.`;
  }
}

document.getElementById("runBtn").addEventListener("click", updateDashboard);
document.getElementById("loadApiBtn").addEventListener("click", tryLoadApi);
["filterRegion", "filterType", "filterAvail", "sortBy"].forEach(id => {
  document.getElementById(id).addEventListener("change", updateDashboard);
});

updateDashboard();
