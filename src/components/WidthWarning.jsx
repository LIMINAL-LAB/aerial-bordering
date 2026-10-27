import { useState, useEffect } from "react";
import "./WidthWarning.css";

const QUERY = "(max-width: 1023px)";

/**
 * Full-screen overlay shown while the viewport is narrower than 1024px,
 * telling the user the database is best viewed on a wider screen. Rendered only
 * by the Database page (the other pages are mobile-friendly). Appears and
 * disappears automatically as the window resizes.
 */
function WidthWarning() {
  const [tooNarrow, setTooNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e) => setTooNarrow(e.matches);
    mql.addEventListener("change", onChange);
    setTooNarrow(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  if (!tooNarrow) return null;

  return (
    <div className="width-warning-overlay">
      <p className="width-warning-message">
        This database is best viewed on a wider screen.
      </p>
    </div>
  );
}

export default WidthWarning;
