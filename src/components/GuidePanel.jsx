import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './GuidePanel.css';

// Renders guide text, turning the literal "(See: Methodology)", "[Methodology ↗]"
// or "[Report ↗]" markers into a router link to the Methodology or Report page
// while leaving the rest as prose. A text contains at most one of these markers.
const renderGuideText = (text) => {
  const seeMarker = '(See: Methodology)';
  const bracketMarker = '[Methodology ↗]';
  const reportMarker = '[Report ↗]';
  if (text && text.includes(seeMarker)) {
    const [before, after] = text.split(seeMarker);
    return (
      <>
        {before}
        (See: <Link to="/methodology" className="guide-methodology-link">Methodology</Link>)
        {after}
      </>
    );
  }
  if (text && text.includes(bracketMarker)) {
    const [before, after] = text.split(bracketMarker);
    return (
      <>
        {before}
        <Link to="/methodology" className="guide-methodology-link">Methodology ↗</Link>
        {after}
      </>
    );
  }
  if (text && text.includes(reportMarker)) {
    const [before, after] = text.split(reportMarker);
    return (
      <>
        {before}
        <Link to="/report" className="guide-methodology-link">Report ↗</Link>
        {after}
      </>
    );
  }
  return text;
};

const GuidePanel = ({ activeSection, onClose, onOpen, onGuideStateChange }) => {
  const [activeTab, setActiveTab] = useState('jora-data');
  const [currentPage, setCurrentPage] = useState(1);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Set default tab based on clicked section
  useEffect(() => {
    if (activeSection === 'timeline') {
      setActiveTab('timeline');
    } else if (activeSection === 'frontex') {
      setActiveTab('jora-data');
    } else if (activeSection === 'irini') {
      setActiveTab('jora-data');
    } else if (activeSection === 'migrants-deterred') {
      setActiveTab('migrants-deterred');
    } else if (activeSection === 'flight') {
      setActiveTab('open-source');
    } else if (activeSection === 'patterns') {
      setActiveTab('patterns');
    }
    setCurrentPage(1); // Reset to page 1 when opening
  }, [activeSection]);

  // Notify parent of guide state changes
  useEffect(() => {
    if (onGuideStateChange) {
      if (activeSection) {
        onGuideStateChange(activeTab);
      } else {
        // Guide is closed, notify with null state
        onGuideStateChange(null);
      }
    }
  }, [activeTab, activeSection, onGuideStateChange]);

  // Show toggle button when guide is not active
  if (!activeSection) {
    return (
      <button
        className="guide-toggle-button"
        onClick={() => onOpen('frontex')}
        aria-label="Open guide"
      >
        GUIDE
      </button>
    );
  }

  // Define content structure
const contentStructure = {
    'jora-data': {
        1: {
            title: "Authorities Data: Frontex / EUNAVFOR Med Irini Data",
            text: "The central section of the database presents data collected by European authorities: Frontex's Joint Operation Reporting Application (JORA) for events up to January 2023, and a leaked document produced by the European naval mission EUNAVFOR Med Irini for the subsequent period until October 2024, when data stops being publicly available. Every row represents one case of documented pushback to Libya or Tunisia in which Frontex's aerial assets played a key role. You can read more about how we have managed to identify these cases within Frontex's and EUNAVFOR Med Irini's datasets under [Methodology ↗]"
        }
    },
    'detection': {
        1: {
            title: "Detection initiated by",
            text: "This column indicates which authority or agent first detected the presence of a migrants' boat at sea. Variables include: Frontex Multipurpose Aerial Surveillance (MAS) or simply FRONTEX, a migrant call (CAL), Italian authorities (ITA), or another source (OTH). Throughout all the cases included in the database, even when Frontex's aircraft were not responsible for reporting the presence of the boat first, they did directly detect the boat at some point."
        }
    },
    'disembarkation': {
        1: {
            title: "Data – Disembarkation",
            text: "This column indicates where those who were intercepted at sea were eventually disembarked. As this database shows only cases of pushbacks, i.e. cases in which passengers were returned to Libya or Tunisia, variables include only: cities in Libya (Tripoli, Zawiyah, Zuwārah), or simply Libya; or cities in Tunisia (Sfax), or simply Tunisia."
        }
    },
    'migrants-deterred': {
        1: {
            title: "Data – Migrants deterred",
            text: "\"Migrants deterred\" is the anodyne and technocratic language with which Frontex refers to the people pushed back, i.e. forcibly returned to abuse in Libya or Tunisia. In the upper right corner, a progressive counter marks the overall number of people pushed back. Because even Frontex does not have a full overview of those pushed back, in all likelihood this represents only a fraction of the total number."
        }
    },
    'open-source': {
        1: {
            title: "Flight Data",
            text: "This column contains flight data concerning Frontex aircraft compiled from open-source aircraft tracking websites. For each day, we provide an overall number of hours flown by aircraft operated on behalf of Frontex during that day, as well as their HEX code, which is a unique identifier for each aircraft."
        },
        2: {
            title: "Flight Data",
            text: "While this open-source data has some limitations (as tracking signals are occasionally lost and Frontex does not publicly disclose which aircraft are operating on its behalf), this information allows to identify which aircraft were likely involved in each documented pushback."
        },
        3: {
            title: "Flight Data",
            text: "The total flight hours of aircraft operating on Frontex behalf for that day are described in the right-hand column by an overall number and a tone of blue, darker indicating higher overall flight hours. This section allows us to visualise the increase in surveillance and the expansion of Frontex's aerial presence over time."
        }
    },
    'timeline': {
        1: {
            title: "Timeline",
            text: "The timeline offers a condensed snapshot of the main data contained in this database: darker grey and purple horizontal lines correspond to a higher number of people pushed back thanks to Frontex aerial surveillance on a specific day, according to data by European authorities, i.e. respectively Frontex (grey) and EUNAVFOR Med (purple). The blue lines indicate instead flight hours, and a darker hue corresponds to more flight hours. The timeline is divided in three parts, each corresponding to different datasets obtained through successive Freedom of Information requests to Frontex. The difference between each dataset is explained in more detail in our [Methodology ↗]"
        }
    },
    'patterns': {
        1: {
            title: "Patterns",
            text: "In this section, users can select one of three operational patterns that we have identified in Frontex's aerial surveillance activities. Each pattern is described and unpacked in detail in our [Report ↗]. Clicking on one pattern reveals in the main timeline all the specific cases that belong to that pattern. This analysis is based on information collected by non-governmental organisations working directly in the field and other sources."
        }
    }
};

  // Helper function to dynamically count pages for a tab
  const getPageCountForTab = (tabId) => {
    const tabContent = contentStructure[tabId];
    if (!tabContent) return 1;

    // Count numeric keys in the tab content
    const pageKeys = Object.keys(tabContent).filter(key => !isNaN(key));
    return pageKeys.length || 1;
  };

  // Dynamically generate tabs with page counts from content structure
  const tabs = [
    { id: 'jora-data', label: 'Authorities Data', pages: getPageCountForTab('jora-data') },
    { id: 'detection', label: 'Detection initiated by', pages: getPageCountForTab('detection') },
    { id: 'disembarkation', label: 'Disembarkation', pages: getPageCountForTab('disembarkation') },
    { id: 'migrants-deterred', label: 'Migrants deterred', pages: getPageCountForTab('migrants-deterred') },
    { id: 'open-source', label: 'Open-Source Data', pages: getPageCountForTab('open-source') },
    { id: 'timeline', label: 'Timeline', pages: getPageCountForTab('timeline') },
    { id: 'patterns', label: 'Patterns', pages: getPageCountForTab('patterns') }
  ];

  const currentTabData = tabs.find(t => t.id === activeTab);
  const totalPages = currentTabData ? currentTabData.pages : 1;

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  const getContent = () => {
    return contentStructure[activeTab][currentPage];
  };

  const content = getContent();

  return (
    <>
      {/* Backdrop for clicking outside */}
      <div className="guide-panel-backdrop" onClick={onClose} />

      {/* Guide Panel */}
      <div className="guide-panel">
        {/* Tab Bar */}
        <div className="guide-tab-bar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`guide-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="guide-content">
          <h4 className="guide-content-title">{content.title}</h4>
          <p>{renderGuideText(content.text)}</p>
        </div>

        {/* Bottom Bar */}
        <div className="guide-panel-top-bar">
          <button className="guide-close" onClick={onClose} aria-label="Close guide">
            <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1L14 13M14 1L1 13" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="guide-pagination">
            {totalPages > 1 && (
              <>
                <button
                  className="guide-arrow"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 1L1 7.5L8 14" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className="guide-page-indicator">{currentPage}/{totalPages}</span>
                <button
                  className="guide-arrow"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 1L8 7.5L1 14" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </>
            )}
          </div>
          <div className="guide-title">GUIDE</div>
        </div>
      </div>
    </>
  );
};

export default GuidePanel;
