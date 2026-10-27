import patterns from '../data/patterns.json' with { type: 'json' };

const VALID_PATTERN_KEYS = new Set(patterns.map((p) => p.key));

/**
 * Parses the /database page's location.search string into pattern and case
 * selection state. Never throws — malformed input degrades to the
 * no-selection state.
 *
 * @param {string} search - a location.search string (e.g. "?pattern=a,b&case=2021-02-07")
 * @returns {{ patterns: string[], caseId: string | null }}
 */
export function parseDatabaseSearch(search) {
  try {
    const params = new URLSearchParams(search);

    const rawPattern = params.get('pattern') || '';
    const seen = new Set();
    const patternList = [];
    for (const rawKey of rawPattern.split(',')) {
      const key = rawKey.trim();
      if (!key) continue;
      if (!VALID_PATTERN_KEYS.has(key)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      patternList.push(key);
    }

    const rawCase = params.get('case');
    const caseId = rawCase ? rawCase : null;

    return { patterns: patternList, caseId };
  } catch {
    return { patterns: [], caseId: null };
  }
}

/**
 * Builds a query string (without the leading "?") encoding pattern and case
 * selection state, suitable for setSearchParams.
 *
 * @param {{ patterns: string[], caseId: string | null }} state
 * @returns {string}
 */
export function buildDatabaseSearch({ patterns: patternList, caseId }) {
  if (!patternList || patternList.length === 0) {
    return '';
  }

  const parts = [`pattern=${patternList.join(',')}`];
  if (caseId) {
    parts.push(`case=${caseId}`);
  }
  return parts.join('&');
}
