import React from 'react';
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

function TechnicianProfile() {
  const { user } = useAuth();
  const { workload } = useTechnicianWorkflow();

  if (!user) {
    return (
      <div className="technician-profile-page">
        <section className="tech-profile-empty" role="status">
          <h1>Profile</h1>
          <p>Technician profile information is not available.</p>
        </section>
      </div>
    );
  }

  const technicianName = user.username || 'Technician';
  const initials = technicianName.charAt(0).toUpperCase();
  const technicianID = user.technician_ID || user.id || 'N/A';
  const userID = user.user_ID || user.id || 'N/A';

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
            <span>Technician ID {technicianID}</span>
            <span className="tech-profile-account-status">
              <i aria-hidden="true" />
              Active
            </span>
          </div>
          <p className="tech-profile-identity-note">
            Identity details are shown from the current user and technician records.
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
                <InformationRow label="Username" value={user.username || 'N/A'} />
                <InformationRow label="User ID" value={userID} />
                <InformationRow label="Account Type" value={user.accountType || user.role || 'Technician'} />
                <InformationRow label="Account Status" value="Active" />
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
                <InformationRow label="Technician ID" value={technicianID} />
                <InformationRow label="Rating" value="5.0 ★" />
                <InformationRow label="Specialty" value="Aircon Servicing" />
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
                  <dd>{workload?.assignedJobs || 0}</dd>
                  <small>Current booking and job relationships</small>
                </div>
                <div>
                  <dt>Completed Jobs</dt>
                  <dd>{workload?.byStatus?.completed || 0}</dd>
                  <small>Recorded in technician job history</small>
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