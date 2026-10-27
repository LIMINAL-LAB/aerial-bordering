// Function to determine aircraft type from hex code
export const getAircraftType = (hexCode) => {
  const code = hexCode.toUpperCase()
  const aircrafts = [
    "407637",
    "40785B",
    "4D2444",
    "4D2376",
    "406658",
    "406870",
    "43EE55",
    "43ED4B",
    "43EED2",
    "4079F3",
    "407D59",
    "4D2355",
  ];
  const drones = [
    "A11111",
    "4D232D",
    "46FBE9",
  ];
  const helis = ["4D0291"]
  const airliners = ["4860B1"]
  if (aircrafts.includes(code)) return 'Aircraft';
  else if (drones.includes(code)) return 'Drone';
  else if (helis.includes(code)) return 'Helicopter';
  else if (airliners.includes(code)) return 'Airliner';
  else { return 'Aircraft'; }
};
