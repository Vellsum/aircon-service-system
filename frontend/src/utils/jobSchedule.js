// =============================================================================
// jobSchedule.js — single source of truth for "when can a technician start a job"
// Added: 6 Oct 2026. Used by TechnicianDashboard, TechnicianAssignedJobs,
// JobRow and JobCard so the rule can never drift between pages.
// The backend (technicianController.updateJobStatus) enforces the same rule,
// so this UI gate is a courtesy — the API cannot be bypassed.
// =============================================================================
export const ENFORCE_START_TIME = true; // keep in sync with the backend flag

// Local date as YYYY-MM-DD (en-CA). Never use toISOString() — it's UTC and
// shows "yesterday" before 8am in Singapore.
export function getLocalDateStr(d = new Date()) {
  return d.toLocaleDateString('en-CA');
}

export function getLocalTimeStr(d = new Date()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Parses "2:30 PM", "14:30", "14:30:00" → "HH:MM" (24h). Returns null if unparseable.
function parseTimeTo24(t) {
  if (!t) return null;
  const s = String(t).trim();
  const m12 = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (m12) {
    let h = +m12[1] % 12;
    if (/pm/i.test(m12[3])) h += 12;
    return `${String(h).padStart(2, '0')}:${m12[2]}`;
  }
  const m24 = s.match(/^(\d{1,2}):(\d{2})/);
  if (m24 && !/AM|PM/i.test(s)) return `${String(+m24[1]).padStart(2, '0')}:${m24[2]}`;
  return null;
}

/**
 * Decide whether a technician may start this job right now.
 * Returns { allowed, reason, kind }:
 *   kind: 'future'      → scheduled for another day
 *         'later-today' → today, but before the booking time
 */
export function evaluateJobStart(job, now = new Date()) {
  const today = getLocalDateStr(now);
  const nowTime = getLocalTimeStr(now);

  const d = job?.date ? String(job.date).slice(0, 10) : null;
  if (!d) return { allowed: true, reason: '', kind: null };

  // Future date — locked until that day
  if (d > today) {
    return { allowed: false, reason: `scheduled for ${d}`, kind: 'future' };
  }

  // Today, but before the booking time
  if (ENFORCE_START_TIME && d === today) {
    const t = parseTimeTo24(job.time24) || parseTimeTo24(job.time);
    if (t && t > nowTime) {
      return { allowed: false, reason: `scheduled for today at ${t}`, kind: 'later-today' };
    }
  }

  return { allowed: true, reason: '', kind: null };
}