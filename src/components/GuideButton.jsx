import './GuideButton.css';

const GuideButton = ({ onClick, ariaLabel = "Show guide" }) => {
  return (
    <button
      className="guide-button"
      onClick={onClick}
      aria-label={ariaLabel}
      type="button"
    >
      ?
    </button>
  );
};

export default GuideButton;
