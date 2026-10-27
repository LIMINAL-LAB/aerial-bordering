import { useState } from "react";
import "./PasswordGate.css";

const STORAGE_KEY = "liminal-unlocked";
// NOTE: this gate is NOT truly secure — the built JS bundle is downloadable and
// the password is discoverable within it. It is acceptable only for privately
// sharing the link (explicit decision), not as real access control.
// Optional: when unset, the gate is skipped and the site is public.
const PASSWORD = import.meta.env.VITE_SITE_PASSWORD;

function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(
    () =>
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(STORAGE_KEY) === "1"
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  if (!PASSWORD || unlocked) return children;

  const submit = (e) => {
    e.preventDefault();
    if (value === PASSWORD) {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="password-gate">
      <form className="password-gate-form" onSubmit={submit}>
        <label className="password-gate-label" htmlFor="password-gate-input">
          This site is private. Enter the password to continue.
        </label>
        <input
          id="password-gate-input"
          className="password-gate-input"
          type="password"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
        />
        <button className="password-gate-submit" type="submit">
          Enter
        </button>
        {error && (
          <p className="password-gate-error">Incorrect password.</p>
        )}
      </form>
    </div>
  );
}

export default PasswordGate;
