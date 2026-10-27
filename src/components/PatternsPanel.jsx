import usePatternStore from '../store/patternStore';
import patternsData from '../data/patterns.json';
import { getPatternColor } from '../utils/patternColors';
import GuideButton from './GuideButton';
import './PatternsPanel.css';

const PatternsPanel = ({ onGuideClick, guideTab }) => {
  const highlighted = guideTab === 'patterns';
  const { activePatterns, togglePattern, clearPatterns } = usePatternStore();

  // Sort patterns by their order field
  const sortedPatterns = [...patternsData].sort((a, b) => a.order - b.order);

  return (
    <div className="patterns-panel">
      <div className={`patterns-external-header${highlighted ? ' guide-highlight' : ''}`}>
        <span className="patterns-title">Patterns</span>
        {/* Unlike the other guide buttons this one stays live while patterns are
            selected: it is the guide to exactly that mode. */}
        {onGuideClick && (
          <GuideButton
            onClick={() => onGuideClick('patterns')}
            ariaLabel="Show patterns guide"
          />
        )}
      </div>
      <div className={`patterns-list${highlighted ? ' guide-highlight' : ''}`}>
        {sortedPatterns.map((pattern) => {
          const isActive = activePatterns.includes(pattern.key);
          const color = getPatternColor(pattern.key, activePatterns);
          return (
            <div
              key={pattern.key}
              className={`pattern-row ${isActive ? 'pattern-active' : ''}`}
              style={{ '--pattern-color': color }}
              onClick={() => togglePattern(pattern.key)}
            >
              <span className="pattern-row-dot" />
              <span className="pattern-row-label" style={{ color }}>{pattern.label}</span>
            </div>
          );
        })}
      </div>
      {activePatterns.length > 0 && (
        <button
          className="patterns-clear-button"
          onClick={clearPatterns}
        >
          <svg
            className="patterns-clear-icon"
            viewBox="0 0 15 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M2.5 2.5L12.5 12.5" />
            <path d="M12.5 2.5L2.5 12.5" />
          </svg>
          <span>CLEAR</span>
        </button>
      )}
    </div>
  );
};

export default PatternsPanel;
