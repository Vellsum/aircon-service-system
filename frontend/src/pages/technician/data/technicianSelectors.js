/**
 * Selector: Builds the View Model for TechnicianProfile using logged-in user data and local state
 */
export function selectCurrentTechnicianProfileViewModel() {
  try {
    const rawUser = localStorage.getItem('user');

    console.log('[PROFILE] Raw localStorage user:', rawUser);

   const storedUser = JSON.parse(
      localStorage.getItem('aircon_user') || '{}'
    );

    console.log('[PROFILE] Parsed user:', storedUser);

    if (!storedUser || (!storedUser.username && !storedUser.id && !storedUser.user_ID)) {
      console.log('[PROFILE] No recognised user identity found');
      return null;
    }

    const username = storedUser.username || storedUser.name || 'Technician';
    const userID = storedUser.id || storedUser.user_ID || storedUser.userID || 'N/A';

    const technicianID =
      storedUser.technician_ID ||
      storedUser.technicianID ||
      storedUser.techId ||
      'N/A';

    const accountStatus = storedUser.status || 'Active';
    const accountType = storedUser.role || storedUser.accountType || 'Technician';

    const nameParts = username.trim().split(' ');

    const initials = nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : username.substring(0, 2).toUpperCase();

    const profile = {
      technicianName: username,
      technicianID,
      username,
      userID,
      accountType,
      accountStatus,
      technicianRating: storedUser.rating || 5.0,
      initials,

      presentation: {
        roleLabel: 'Field Operations Specialist',
      },

      availability: {
        rating: true,
      },

      workSummary: {
        assignedJobs: storedUser.assignedJobsCount || 0,
        completedJobs: storedUser.completedJobsCount || 0,
      },
    };

    console.log('[PROFILE] Final profile:', profile);

    return profile;

  } catch (err) {
    console.error('Error selecting technician profile view model:', err);
    return null;
  }
}

export function selectCurrentInventoryItems() {
  return [];
}