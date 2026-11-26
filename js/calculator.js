function validateUserInput(input) {
  const errors = [];
  const { currentSoc, targetSoc, batteryKwh, maxVehicleKw, dwellMin, hourSlot } = input;

  if (!Number.isFinite(currentSoc) || currentSoc < 0 || currentSoc > 100) {
    errors.push("현재 SOC는 0~100 사이의 숫자여야 합니다.");
  }
  if (!Number.isFinite(targetSoc) || targetSoc < 1 || targetSoc > 100) {
    errors.push("목표 SOC는 1~100 사이의 숫자여야 합니다.");
  }
  if (!Number.isFinite(batteryKwh) || batteryKwh <= 0 || batteryKwh > 300) {
    errors.push("배터리 용량은 0보다 크고 300kWh 이하여야 합니다.");
  }
  if (!Number.isFinite(maxVehicleKw) || maxVehicleKw <= 0 || maxVehicleKw > 500) {
    errors.push("차량 최대 수용 출력은 0보다 크고 500kW 이하여야 합니다.");
  }
  if (!Number.isFinite(dwellMin) || dwellMin < 0 || dwellMin > 1440) {
    errors.push("예상 체류 시간은 0~1440분 사이여야 합니다.");
  }
  if (!Number.isFinite(hourSlot) || hourSlot < 0 || hourSlot > 23) {
    errors.push("이용 예정 시간대는 0~23시 사이여야 합니다.");
  }

  return {
    valid: errors.length === 0,
    alreadyCharged: errors.length === 0 && currentSoc >= targetSoc,
    errors
  };
}

function calcNeededEnergyKwh(currentSoc, targetSoc, batteryKwh) {
  if (targetSoc <= currentSoc) return 0;
  return +(batteryKwh * ((targetSoc - currentSoc) / 100)).toFixed(2);
}

function getSocFactor(socMid) {
  if (socMid < 50) return 0.95;
  if (socMid < 80) return 0.75;
  return 0.40;
}

function calcChargingMinutes(currentSoc, targetSoc, batteryKwh, ratedKw, maxVehicleKw) {
  if (currentSoc >= targetSoc) return 0;
  const baseKw = Math.min(ratedKw, maxVehicleKw);
  const bands = [
    [0, 50],
    [50, 80],
    [80, 100]
  ];
  let totalMin = 0;

  for (const [bStart, bEnd] of bands) {
    const segStart = Math.max(currentSoc, bStart);
    const segEnd = Math.min(targetSoc, bEnd);
    if (segEnd > segStart) {
      const energyKwh = batteryKwh * ((segEnd - segStart) / 100);
      const socMid = (segStart + segEnd) / 2;
      const actualKw = Math.max(1.5, baseKw * getSocFactor(socMid));
      totalMin += (energyKwh / actualKw) * 60;
    }
  }
  return Math.round(totalMin);
}

function calcWaitMinutes(station, occRate) {
  if (station.status !== "AVAILABLE") return null;
  const op = Math.max(1, station.operationalChargers);
  const estQueue = station.queueCountSim + (occRate >= 85 ? 1 : 0);
  return Math.round((estQueue / op) * station.avgChargeSessionMin);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    validateUserInput,
    calcNeededEnergyKwh,
    getSocFactor,
    calcChargingMinutes,
    calcWaitMinutes
  };
}
