import { getAircraftType } from '../utils/aircraftUtils';

const IdentifiedAircraft = ({ assets }) => {
  // A date with no aerial data says so, rather than leaving the hover overlay
  // blank where the aircraft list would otherwise be.
  if (!assets || assets.length === 0) {
    return (
      <div style={{ color: 'var(--grey-3)' }}>
        <div style={{ fontWeight: 'bold' }}>No data available</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontWeight: 'bold' }}>
        Identified aircraft ({assets.length})
      </div>
      {assets.map((hexCode, index) => (
        <div key={index}>
          {getAircraftType(hexCode)} #{hexCode}
        </div>
      ))}
    </div>
  );
};

export default IdentifiedAircraft;
