import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./NavigationBar.css";

const NavigationBar = () => {
  const location = useLocation();
  // Mobile only: the vertical nav collapses to the logo + the active tab, and
  // toggles open/closed when the logo (which animates into a cross) is clicked.
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  // While collapsed on mobile, a tap anywhere on the bar opens the stack. Run in
  // the capture phase so it pre-empts the active tab's (no-op) navigation and
  // the logo toggle; desktop and the open state fall through to normal handling.
  const handleBarCapture = (e) => {
    if (!open && window.matchMedia("(max-width: 768px)").matches) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
    }
  };

  return (
    <nav
      className={`navigation-bar${open ? " nav-open" : ""}`}
      onClickCapture={handleBarCapture}
    >
      <button
        type="button"
        className="logo-button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        <svg
          className="logo-icon"
          viewBox="0 0 33 30"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_72_168)">
            <path
              d="M3.92664 0H0V30H18.2082V26.4359H3.92664V0Z"
              fill="black"
            />
            <path
              d="M17.2284 0.109344L13.7912 2.12555L29.5647 29.8834L33.0018 27.8671L17.2284 0.109344Z"
              fill="black"
            />
          </g>
          <defs>
            <clipPath id="clip0_72_168">
              <rect width="33" height="30" fill="white" />
            </clipPath>
          </defs>
        </svg>
        <span className="logo-cross" aria-hidden="true" />
      </button>
      <Link
        to="/"
        onClick={closeMenu}
        className={`home-tab ${location.pathname === "/" ? "active" : ""}`}
      >
        <span className="tab-text">Aerial Bordering</span>
      </Link>
      <Link
        to="/report"
        onClick={closeMenu}
        className={`nav-tab ${location.pathname === "/report" ? "visited active" : ""}`}
      >
        <span className="tab-text">Report</span>
      </Link>
      <Link
        to="/database"
        onClick={closeMenu}
        className={`nav-tab ${location.pathname === "/database" ? "visited active" : ""}`}
      >
        <span className="tab-text">Database</span>
      </Link>
      <Link
        to="/methodology"
        onClick={closeMenu}
        className={`nav-tab ${location.pathname === "/methodology" ? "visited active" : ""}`}
      >
        <span className="tab-text">About and Methodology</span>
      </Link>
      <div className="padder-tab" />
    </nav>
  );
};

export default NavigationBar;
