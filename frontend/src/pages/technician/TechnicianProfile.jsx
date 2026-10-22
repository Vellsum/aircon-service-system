// =============================================================================
// TechnicianProfile.jsx
// Read-only account information and identity-matched technician profile.
// =============================================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext';

function IdentityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h4M7 13h7M7 17h5" />
      <circle cx="17" cy="9" r="2" />
    </svg>
  );
}

function WorkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  );
}

function AvailabilityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function InformationRow({ label, value, unavailable = false }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={unavailable ? 'is-unavailable' : ''}>{value}</dd>
    </div>
  );
}

const validTechnicianID = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const profileText = (value) =>
  typeof value === 'string' && value.trim() ? value.trim() : 'Not available';

// The API returns a numeric rating; only an explicit zero means unrated.
const ratingDisplay = (rating) => {
  if (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 0 || rating > 5) {
    return 'Unavailable';
  }
  return rating === 0 ? 'Not rated yet' : `${rating.toFixed(1)} ★`;
};

const assignmentCount = (value, available) =>
  available && Number.isSafeInteger(value) && value >= 0 ? value : '—';

// UI preparation only: drafts are never persisted and neither form can submit.
function ProfilePreparation({ session, profile, ready, identityReady }) {
  const scope = useMemo(() => ({ session, profile, ready, identityReady }), [session, profile, ready, identityReady]);
  const [draft, setDraft] = useState(null);
  const formRef = useRef(null);
  const profileTrigger = useRef(null);
  const passwordTrigger = useRef(null);
  // Mask old drafts during render, before the cleanup effect can run.
  const activeDraft = draft?.scope === scope
    && (draft.kind === 'profile' ? ready : identityReady) ? draft : null;

  useEffect(() => { setDraft(null); }, [scope]);
  useEffect(() => {
    if (activeDraft) formRef.current?.querySelector('input')?.focus();
  }, [activeDraft?.kind]);
  // Unmount discards this component's state; no storage or external draft cache exists.

  const cancel = (kind) => {
    setDraft(null);
    (kind === 'profile' ? profileTrigger : passwordTrigger).current?.focus();
  };
  const open = (kind) => {
    if (!(kind === 'profile' ? ready : identityReady)) return;
    if (activeDraft?.kind === kind) {
      cancel(kind);
      return;
    }
    setDraft({
      scope,
      kind,
      values: kind === 'profile'
        ? { name: typeof profile?.technicianName === 'string' ? profile.technicianName.trim() : '', phone: '', email: '' }
        : { currentPassword: '', newPassword: '', confirmation: '' },
    });
  };
  const updateField = (field, value) => {
    setDraft((current) => current?.scope === scope
      ? { ...current, values: { ...current.values, [field]: value } } : current);
  };
  const preventSubmission = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const sections = [
    {
      kind: 'profile', title: 'Edit Profile', Icon: IdentityIcon, trigger: profileTrigger,
      notice: 'Profile updates are not available yet.', action: 'Save Changes',
      fields: [
        { key: 'name', label: 'Technician name', type: 'text', autoComplete: 'name' },
        { key: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
        { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
      ],
    },
    {
      kind: 'password', title: 'Change Password', Icon: AccountIcon, trigger: passwordTrigger,
      notice: 'Password changes are not available yet.', action: 'Change Password',
      fields: [
        { key: 'currentPassword', label: 'Current password', type: 'password', autoComplete: 'current-password' },
        { key: 'newPassword', label: 'New password', type: 'password', autoComplete: 'new-password' },
        { key: 'confirmation', label: 'Confirm new password', type: 'password', autoComplete: 'new-password' },
      ],
    },
  ];

  return (
    <div className="tech-profile-record-grid">
      {sections.map(({ kind, title, Icon, trigger, notice, action, fields }) => {
        const isOpen = activeDraft?.kind === kind;
        const prefix = `profile-preparation-${kind}`;
        return (
          <section key={kind} className="tech-profile-record-card align-self-start" aria-labelledby={`${prefix}-title`}>
            <header>
              <span className="tech-profile-section-icon" aria-hidden="true"><Icon /></span>
              <div className="flex-grow-1">
                <h2 id={`${prefix}-title`}>{title}</h2>
              </div>
            </header>
            <div className="p-3">
              <p className="small mb-3" id={`${prefix}-notice`}>{notice}</p>
              <button
                ref={trigger} type="button" className="cf-button cf-button-secondary"
                disabled={!(kind === 'profile' ? ready : identityReady)} aria-expanded={isOpen} aria-controls={`${prefix}-form`}
                aria-describedby={`${prefix}-notice`} onClick={() => open(kind)}
              >{title}</button>
              <div id={`${prefix}-form`} hidden={!isOpen}>
                {isOpen && (
                  <form ref={formRef} className="mt-3" noValidate onSubmit={preventSubmission} aria-labelledby={`${prefix}-title`} aria-describedby={`${prefix}-notice`}>
                    {kind === 'profile' && (
                      <p className="small" id={`${prefix}-contact`}>Current phone and email are unavailable.</p>
                    )}
                    {fields.map(({ key, label, type, autoComplete }) => (
                      <div className="mb-3" key={key}>
                        <label className="form-label" htmlFor={`${prefix}-${key}`}>{label}</label>
                        <input
                          className="form-control" id={`${prefix}-${key}`} type={type} autoComplete={autoComplete}
                          value={activeDraft.values[key]} onChange={(event) => updateField(key, event.target.value)}
                          aria-describedby={kind === 'profile' && key !== 'name' ? `${prefix}-contact` : `${prefix}-notice`}
                        />
                      </div>
                    ))}
                    <div className="d-flex flex-wrap gap-2">
                      <button type="button" className="cf-button cf-button-quiet" onClick={() => cancel(kind)}>Cancel</button>
                      <button type="submit" className="cf-button cf-button-primary opacity-50" disabled aria-describedby={`${prefix}-notice`}>{action}</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TechnicianProfile() {
  const { user, token, initializing } = useAuth();
  const { technicianID: resolvedID, identitySource, workload, loading, error, dataAvailable } = useTechnicianWorkflow();
  const sessionID = validTechnicianID(user?.technician_ID);
  // Do not use the context's anonymous development fallback for this account page.
  const technicianID = !initializing && identitySource === 'authenticated'
    && sessionID === validTechnicianID(resolvedID) ? sessionID : null;
  const preparationSession = useMemo(
    () => ({}), [technicianID, identitySource, token, initializing, user?.user_ID]
  );
  const [profileState, setProfileState] = useState({});
  useEffect(() => {
    if (!technicianID || !token) return;
    const controller = new AbortController();
    const update = (status, profile = null) => {
      if (!controller.signal.aborted) {
        setProfileState({ technicianID, token, status, profile });
      }
    };
    update('loading');
    (async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/technician/profile?techId=${technicianID}`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          update('error');
          return;
        }
        const data = await res.json();
        if (data?.success !== true) {
          update('error');
        } else if (!data.profile || validTechnicianID(data.profile.technicianID) !== technicianID) {
          update('unavailable');
        } else {
          update('success', data.profile);
        }
      } catch {
        update('error');
      }
    })();
    return () => controller.abort();
  }, [technicianID, token]);

  // Mask the previous response immediately when the session changes, before effects run.
  const status = initializing ? 'loading'
    : !technicianID || !token ? 'identity'
    : profileState.technicianID === technicianID && profileState.token === token
      ? profileState.status : 'loading';
  const profile = status === 'success' ? profileState.profile : null;
  const missingValue = status === 'loading' ? 'Loading…'
    : status === 'error' ? 'Request failed' : 'Unavailable';
  const technicianName = profile ? profileText(profile.technicianName) : missingValue;
  const specialty = profile ? profileText(profile.specialty) : missingValue;
  const rating = profile ? ratingDisplay(profile.technicianRating) : missingValue;
  const assignmentsAvailable = Boolean(technicianID && token && !loading && !error && dataAvailable);
  const profileMessage = status === 'loading' ? 'Loading technician profile…'
    : status === 'identity' ? 'Technician identity is unavailable. No profile has been requested.'
    : status === 'error' ? 'Technician profile could not be loaded. Profile details are unavailable.'
    : status === 'unavailable' ? 'A matching technician profile is unavailable.'
    : 'Technician details are from the matching profile response; account details are from the current session.';

  // Early return — only AFTER all hooks have run
  if (!user) {
    return (
      <div className="technician-profile-page">
        <section className="tech-profile-empty" role="status">
          <h1>Profile</h1>
          <p>{profileMessage}</p>
        </section>
      </div>
    );
  }

  const initials = profile && profileText(profile.technicianName) !== 'Not available'
    ? technicianName.charAt(0).toUpperCase() : '—';
  const userID = user.user_ID ?? 'Unavailable';

  return (
    <div className="technician-profile-page">
      <header className="cf-page-header tech-profile-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">Technician · Profile</span>
          <h1>Profile</h1>
          <p>View your technician identity, account record and current work summary.</p>
        </div>
        <div className="tech-profile-read-only" aria-label="Read-only profile">
          <span aria-hidden="true"><IdentityIcon /></span>
          <div>
            <strong>Read-only record</strong>
            <small>Self-service updates are not yet available</small>
          </div>
        </div>
      </header>

      <div className="tech-profile-layout">
        <aside className="tech-profile-identity" aria-labelledby="profile-identity-name">
          <div className="tech-profile-identity-accent" aria-hidden="true" />
          <div className="tech-profile-avatar" aria-hidden="true">{initials}</div>
          <div className="tech-profile-identity-copy">
            <span className="tech-profile-identity-label">Technician profile</span>
            <h2 id="profile-identity-name">{technicianName}</h2>
            <p>Field Technician</p>
          </div>
          <div className="tech-profile-identity-meta">
            <span>Technician ID {technicianID ?? 'Unavailable'}</span>
          </div>
          <p className="tech-profile-identity-note" role="status">
            {profileMessage}
          </p>
        </aside>

        <div className="tech-profile-records">
          <div className="tech-profile-record-grid">
            <section className="tech-profile-record-card" aria-labelledby="profile-account-title">
              <header>
                <span className="tech-profile-section-icon" aria-hidden="true"><AccountIcon /></span>
                <div>
                  <span>Account record</span>
                  <h2 id="profile-account-title">Account Information</h2>
                </div>
              </header>
              <dl className="tech-profile-information-list">
                <InformationRow label="Username" value={profileText(user.username)} />
                <InformationRow label="User ID" value={userID} />
                <InformationRow label="Account Type" value={profileText(user.accountType || user.role)} />
                <InformationRow label="Account Status" value="Unavailable" unavailable />
              </dl>
            </section>

            <section className="tech-profile-record-card" aria-labelledby="profile-technician-title">
              <header>
                <span className="tech-profile-section-icon" aria-hidden="true"><IdentityIcon /></span>
                <div>
                  <span>Service identity</span>
                  <h2 id="profile-technician-title">Technician Information</h2>
                </div>
              </header>
              <dl className="tech-profile-information-list">
                <InformationRow label="Technician Name" value={technicianName} />
                <InformationRow label="Technician ID" value={technicianID ?? 'Unavailable'} />
                <InformationRow label="Rating" value={rating} />
                <InformationRow label="Specialty" value={specialty} />
              </dl>
            </section>
          </div>

          <div className="tech-profile-support-grid">
            <section className="tech-profile-work-snapshot" aria-labelledby="profile-work-title">
              <header>
                <span className="tech-profile-section-icon" aria-hidden="true"><WorkIcon /></span>
                <div>
                  <span>Relationship-derived facts</span>
                  <h2 id="profile-work-title">Work Snapshot</h2>
                </div>
              </header>
              <dl>
                <div>
                  <dt>Assigned Jobs</dt>
                  <dd>{assignmentCount(workload?.assignedJobs, assignmentsAvailable)}</dd>
                  <small>{loading ? 'Loading current assignments…' : !assignmentsAvailable ? 'Current assignments unavailable' : 'Current returned assignments'}</small>
                </div>
                <div>
                  <dt>Completed Assignments</dt>
                  <dd>{assignmentCount(workload?.byStatus?.completed, assignmentsAvailable)}</dd>
                  <small>{loading ? 'Loading current assignments…' : !assignmentsAvailable ? 'Current assignments unavailable' : 'Completed within current assignments; not a history total'}</small>
                </div>
              </dl>
            </section>

            <aside className="tech-profile-availability" aria-labelledby="profile-availability-title">
              <header>
                <span className="tech-profile-section-icon" aria-hidden="true"><AvailabilityIcon /></span>
                <div>
                  <span>Data availability</span>
                  <h2 id="profile-availability-title">Contact &amp; Profile Access</h2>
                </div>
              </header>
              <dl>
                <InformationRow label="Phone" value="Not available" unavailable />
                <InformationRow label="Email" value="Not available" unavailable />
                <InformationRow
                  label="Profile Updates"
                  value="Self-service editing not yet available"
                  unavailable
                />
              </dl>
            </aside>
          </div>
          <ProfilePreparation
            session={preparationSession} profile={profile}
            ready={Boolean(technicianID && token && profile)}
            identityReady={Boolean(technicianID && token)}
          />
        </div>
      </div>
    </div>
  );
}

export default TechnicianProfile;
