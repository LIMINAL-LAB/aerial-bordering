import appData from './app_data_all.json';
import irini from './irini.json';

const allDates = Array.from(
  new Set([...Object.keys(appData), ...Object.keys(irini.records)])
).sort();

const coreData = allDates.reduce((acc, date) => {
  const iriniRows = (irini.records[date] || []).map(({ ev, interceptedBy, ...row }) => ({
    ...row,
    source: 'irini'
  }));
  acc[date] = { jora: [], adsb: null, ...appData[date], irini: iriniRows };
  return acc;
}, {});

const titleMap = {
  date: "Date",
  id: "ID",
  detectionBy: "Detection by Frontex Asset",
  detectionInitiated: "Detection Initiated by",
  country: "Country of Departure",
  boatType: "Type of boat",
  disembarkation: "Disembarkation",
  migrantsDetered: "Migrants deterred",
  flighthours: "Flight time",
  flightminutes: "Flight Minutes",
  assets: "Assets"
};

const mainData = Object.entries(coreData).reduce((acc, [date, sources]) => {
  // Include dates with JORA data, Irini data, or ADSB data
  const hasAdsb = sources.adsb && sources.adsb.assets && sources.adsb.assets.length > 0;
  const hasJora = sources.jora.length > 0;
  const hasIrini = sources.irini.length > 0;

  if (hasJora || hasIrini || hasAdsb) {
    acc[date] = [...sources.jora, ...sources.irini]; // Will be [] for ADSB-only dates
  }
  return acc;
}, {});

const addMaxFlightHours = (data) => {
  let maxFlightHours = 0;
  Object.values(data).forEach(dateRows => {
    dateRows.forEach(row => {
      if (row.flighthours > maxFlightHours) {
        maxFlightHours = row.flighthours;
      }
    });
  });

  const updatedData = {};
  Object.entries(data).forEach(([date, rows]) => {
    updatedData[date] = rows.map(row => ({
      ...row,
      maxflighthours: maxFlightHours
    }));
  });

  return updatedData;
};

const flightDataRaw = Object.entries(coreData).reduce((acc, [date, sources]) => {
  const joraCount = sources.jora.length + sources.irini.length;
  const hasAdsb = sources.adsb && sources.adsb.assets && sources.adsb.assets.length > 0;

  if (hasAdsb) {
    if (joraCount > 0) {
      // Multiple rows for dates with both ADSB and JORA
      acc[date] = Array(joraCount).fill(sources.adsb);
    } else {
      // Single row for ADSB-only dates
      acc[date] = [sources.adsb];
    }
  }
  return acc;
}, {});

const flightData = addMaxFlightHours(flightDataRaw);

export { coreData, mainData, flightData, titleMap };
