
const PdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="1" width="9" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
    <path d="M9 1l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

const ViolationPdf = ({ item }) => (
  <a
    href={item.url}
    target="_blank"
    rel="noopener noreferrer"
    className="violation-media-pdf"
  >
    <PdfIcon />
    <span>{item.caption || 'Document'}</span>
  </a>
);

export default ViolationPdf;
