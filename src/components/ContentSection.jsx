import "./ContentSection.css";

// Join the last two words with a non-breaking space so the final line can never
// be a single orphaned word, whatever the screen width.
const noOrphan = (text) => text.trim().replace(/\s+(\S+)$/, "\u00A0$1");

const ContentSection = ({ text }) => {
  return (
    <div className="content-section">
      <div className="section-inner">
        <div className="text-container">
          <div className="text-content">
            <span className="section-text">{noOrphan(text)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentSection;
