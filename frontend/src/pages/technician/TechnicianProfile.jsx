import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext';

const API_BASE_URL = 'http://localhost:5000';

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

function ProfileHeader() {
  return (
    <header className="cf-page-header tech-profile-header">
      <div className="cf-page-heading">
        <span className="cf-eyebrow">Technician · Profile</span>
        <h1>Profile</h1>
        <p>View profile and account data available to your current session.</p>
      </div>
      <div className="tech-profile-read-only" aria-label="Read-only profile">
        <span aria-hidden="true"><IdentityIcon /></span>
        <div>
          <strong>Read-only record</strong>
          <small>Self-service updates are not yet available</small>
        </div>
      </div>
    </header>
  );
}

function ProfileState({ title, message, onRetry }) {
  return (
    <div className="technician-profile-page">
      <ProfileHeader />
      <section className="tech-profile-empty" role={onRetry ? 'alert' : 'status'}>
        <h2>{title}</h2>
        <p>{message}</p>
        {onRetry ? (
          <button type="button" className="cf-button cf-button-secondary" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </section>
    </div>
  );
}

function textOrUnavailable(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function getInitials(name) {
  if (!name) return '—';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function TechnicianProfile() {
  const { user, token, initializing } = useAuth();
  const { technicianID } = useTechnicianWorkflow();
  const hasTechnicianIdentity = technicianID !== null
    && technicianID !== undefined
    && technicianID !== '';
  const [profile, setProfile] = useState(null);
  const [profileState, setProfileState] = useState('idle');
  const currentProfile = profile && String(profile.technicianID) === String(technicianID)
    ? profile
    : null;

  const loadProfile = useCallback(async (signal) => {
    if (!hasTechnicianIdentity) {
      setProfile(null);
      setProfileState('idle');
      return;
    }

    setProfile(null);
    setProfileState('loading');

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(
        `${API_BASE_URL}/api/technician/profile?techId=${encodeURIComponent(technicianID)}`,
        { headers, signal },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true || !payload.profile) {
        throw new Error('Technician profile data is unavailable.');
      }

      if (String(payload.profile.technicianID) !== String(technicianID)) {
        throw new Error('Returned technician identity does not match the authenticated technician.');
      }

      setProfile(payload.profile);
      setProfileState('success');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setProfile(null);
      setProfileState('error');
    }
  }, [hasTechnicianIdentity, technicianID, token]);

  useEffect(() => {
    if (initializing) return undefined;

    const controller = new AbortController();
    loadProfile(controller.signal);
    return () => controller.abort();
  }, [initializing, loadProfile]);

  const profileValues = useMemo(() => {
    const technicianName = textOrUnavailable(currentProfile?.technicianName);
    const username = textOrUnavailable(user?.username);
    const accountType = textOrUnavailable(user?.accountType);
    const specialty = textOrUnavailable(currentProfile?.specialty);
    const rating = currentProfile?.technicianRating;
    const hasRating = rating !== null
      && rating !== undefined
      && rating !== ''
      && Number.isFinite(Number(rating));
    const jobsDone = Number(currentProfile?.jobsDone);

    return {
      technicianName,
      username,
      accountType,
      specialty,
      rating: hasRating ? String(rating) : null,
      jobsDone: Number.isFinite(jobsDone) && jobsDone > 0 ? jobsDone : null,
    };
  }, [currentProfile, user]);

  if (initializing || (hasTechnicianIdentity && (profileState === 'idle' || (profileState === 'success' && !currentProfile))) || profileState === 'loading') {
    return (
      <ProfileState
        title="Loading profile"
        message="Retrieving the selected technician profile."
      />
    );
  }

  if (!hasTechnicianIdentity) {
    return (
      <ProfileState
        title="Technician identity unavailable"
        message="A technician profile cannot be loaded because this session does not include a technician ID."
      />
    );
  }

  if (profileState === 'error' || !currentProfile) {
    return (
      <ProfileState
        title="Profile data unavailable"
        message="Technician profile data could not be retrieved. Please try again."
        onRetry={() => loadProfile()}
      />
    );
  }

  const displayName = profileValues.technicianName || 'Not available';
  const displayAccountType = profileValues.accountType || 'Not available';

  return (
    <div className="technician-profile-page">
      <ProfileHeader />

      <div className="tech-profile-layout">
        <aside className="tech-profile-identity" aria-labelledby="profile-identity-name">
          <div className="tech-profile-identity-accent" aria-hidden="true" />
          <div className="tech-profile-avatar" aria-hidden="true">
            {getInitials(profileValues.technicianName)}
          </div>
          <div className="tech-profile-identity-copy">
            <span className="tech-profile-identity-label">Technician profile</span>
            <h2 id="profile-identity-name">{displayName}</h2>
            <p>{displayAccountType}</p>
          </div>
          <div className="tech-profile-identity-meta">
            <span>Technician ID {profile.technicianID}</span>
            <span className="tech-profile-account-status">Status unavailable</span>
          </div>
          <p className="tech-profile-identity-note">
            Profile identity is shown only after the returned record matches the selected technician ID.
          </p>
        </aside>

        <div className="tech-profile-records">
          <div className="tech-profile-record-grid">
            <section className="tech-profile-record-card" aria-labelledby="profile-account-title">
              <header>
                <span className="tech-profile-section-icon" aria-hidden="true"><AccountIcon /></span>
                <div>
                  <span>Authenticated account</span>
                  <h2 id="profile-account-title">Account Information</h2>
                </div>
              </header>
              <dl className="tech-profile-information-list">
                <InformationRow
                  label="Username"
                  value={profileValues.username || 'Not available'}
                  unavailable={!profileValues.username}
                />
                <InformationRow
                  label="User ID"
                  value={user?.user_ID ?? 'Not available'}
                  unavailable={user?.user_ID === null || user?.user_ID === undefined}
                />
                <InformationRow
                  label="Account Type"
                  value={displayAccountType}
                  unavailable={!profileValues.accountType}
                />
                <InformationRow label="Account Status" value="Not available" unavailable />
              </dl>
            </section>

            <section className="tech-profile-record-card" aria-labelledby="profile-technician-title">
              <header>
                <span className="tech-profile-section-icon" aria-hidden="true"><IdentityIcon /></span>
                <div>
                  <span>Profile service</span>
                  <h2 id="profile-technician-title">Technician Information</h2>
                </div>
              </header>
              <dl className="tech-profile-information-list">
                <InformationRow
                  label="Technician Name"
                  value={displayName}
                  unavailable={!profileValues.technicianName}
                />
                <InformationRow label="Technician ID" value={profile.technicianID} />
                <InformationRow
                  label="Rating"
                  value={profileValues.rating || 'Not available'}
                  unavailable={!profileValues.rating}
                />
                <InformationRow
                  label="Specialty"
                  value={profileValues.specialty || 'Not available'}
                  unavailable={!profileValues.specialty}
                />
              </dl>
            </section>
          </div>

          <div className="tech-profile-support-grid">
            <section className="tech-profile-work-snapshot" aria-labelledby="profile-work-title">
              <header>
                <span className="tech-profile-section-icon" aria-hidden="true"><WorkIcon /></span>
                <div>
                  <span>Profile-provided facts</span>
                  <h2 id="profile-work-title">Work Snapshot</h2>
                </div>
              </header>
              <dl>
                <div>
                  <dt>Assigned Jobs</dt>
                  <dd>—</dd>
                  <small>A technician-owned assignment total is not exposed by the profile service</small>
                </div>
                <div>
                  <dt>Jobs Done</dt>
                  <dd>{profileValues.jobsDone ?? '—'}</dd>
                  <small>
                    {profileValues.jobsDone
                      ? 'Value returned by the technician profile service'
                      : 'Not available from an unambiguous profile value'}
                  </small>
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
        </div>
      </div>
    </div>
  );
}

export default TechnicianProfile;
