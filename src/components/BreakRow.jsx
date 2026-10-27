import { Link } from 'react-router-dom';

const BREAK_CONTENT = {
  1: {
    paragraphs: [
      'The first JORA Dataset ends on the 3rd of September 2021.',
      'We requested additional JORA Data but only received redacted information, not indicating the Country of Departure or the Place of Disembarkation anymore.',
      'Through cross-referencing we were able to still find cases where Frontex Aerial Surveillance documented pull-backs.',
      <>Read more under <Link to="/methodology">Methodology</Link></>
    ]
  },
  2: {
    paragraphs: [
      'The second JORA Dataset ends in July 2023. However, the last interception in the Med can only be traced until end of January.',
      'We requested additional JORA Data but were denied the information. After a confirmatory application we received a heavily redacted dataset, making it impossible to cross-reference cases.',
      'The datasets records 4439 entries under JO Themis with 241 "Incidents involving prevention of departure"',
      'No other information is available.',
      <>Read more under <Link to="/methodology">Methodology</Link></>
    ]
  }
};

const BreakRow = ({ style, breakId, gridColumns }) => {
  const content = BREAK_CONTENT[breakId];

  if (!content) return null;

  return (
    <div
      style={{
        ...style,
        gridTemplateColumns: gridColumns
      }}
      className="unified-table-row break-row"
    >
      <div className="break-row-content">
        {content.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
};

export default BreakRow;
