// Derived reads over the customer fixtures.
//
// Pages stay presentational: every count, total and grouping a customer page
// renders is computed here, so the same numbers appear on the dashboard, the
// bookings list and the unit cards without being re-derived per page.

import {
  MY_BOOKINGS,
  MY_UNITS,
  PROMOTIONS,
  SERVICES,
  TIME_SLOTS,
} from "./customerMockData";

export const OPEN_STATUSES = Object.freeze(["Pending", "Confirmed", "Assigned", "In Progress"]);

const STATUS_TONE = Object.freeze({
  Pending: "warning",
  Confirmed: "accent",
  Assigned: "accent",
  "In Progress": "accent",
  Completed: "success",
  Cancelled: "danger",
});

export function statusTone(status) {
  return STATUS_TONE[status] || "accent";
}

export function isOpenBooking(booking) {
  return OPEN_STATUSES.includes(booking.status);
}

/** Bookings not yet completed or cancelled, soonest first. */
export function getUpcomingBookings(bookings = MY_BOOKINGS) {
  return bookings
    .filter(isOpenBooking)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Completed or cancelled bookings, most recent first. */
export function getPastBookings(bookings = MY_BOOKINGS) {
  return bookings
    .filter((booking) => !isOpenBooking(booking))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getNextBooking(bookings = MY_BOOKINGS) {
  return getUpcomingBookings(bookings)[0] || null;
}

export function findBooking(bookingId, bookings = MY_BOOKINGS) {
  return bookings.find((booking) => booking.booking_ID === bookingId) || null;
}

export function findService(serviceId, services = SERVICES) {
  return services.find((service) => service.service_id === serviceId) || null;
}

export function findUnit(installedId, units = MY_UNITS) {
  return units.find((unit) => unit.installed_ID === installedId) || null;
}

/** Resolve a booking's unit_ids into the unit records they point at. */
export function getBookingUnits(booking, units = MY_UNITS) {
  if (!booking) return [];
  return booking.unit_ids.map((id) => findUnit(id, units)).filter(Boolean);
}

export function describeBookingUnits(booking, units = MY_UNITS) {
  const names = getBookingUnits(booking, units).map((unit) => unit.nickname);
  if (names.length === 0) return "—";
  if (names.length <= 2) return names.join(" + ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

/** Headline figures for the dashboard stat row. */
export function getDashboardStats(bookings = MY_BOOKINGS, units = MY_UNITS) {
  const completed = bookings.filter((booking) => booking.status === "Completed");
  return {
    upcoming: getUpcomingBookings(bookings).length,
    units: units.length,
    completed: completed.length,
    totalSpend: completed.reduce((sum, booking) => sum + booking.amount, 0),
  };
}

/**
 * Units whose next service date has passed, or falls inside the next 30 days.
 * Drives the "service due" prompts on the dashboard and unit cards.
 */
export function getUnitsDueSoon(units = MY_UNITS, today = new Date()) {
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 30);

  return units.filter((unit) => {
    if (!unit.next_due) return false;
    const due = new Date(unit.next_due);
    return due <= horizon;
  });
}

export function isUnitOverdue(unit, today = new Date()) {
  if (!unit.next_due) return false;
  return new Date(unit.next_due) < today;
}

export function healthTone(health) {
  if (health >= 80) return "success";
  if (health >= 60) return "warning";
  return "danger";
}

export function healthLabel(health) {
  if (health >= 80) return "Good condition";
  if (health >= 60) return "Servicing advised";
  return "Needs attention";
}

/** Most recent service report across all bookings, for the dashboard panel. */
export function getLatestReport(bookings = MY_BOOKINGS) {
  const withReports = bookings
    .filter((booking) => booking.report)
    .sort((a, b) => b.date.localeCompare(a.date));
  return withReports[0] || null;
}

export function getServiceCategories(services = SERVICES) {
  return ["All", ...new Set(services.map((service) => service.category))];
}

export function findPromotion(code, promotions = PROMOTIONS) {
  const normalized = (code || "").trim().toUpperCase();
  if (!normalized) return null;
  return promotions.find((promo) => promo.code === normalized) || null;
}

/**
 * Price a booking draft: line total across selected units, then the promo
 * discount if the entered code resolves. Returns whole-dollar figures so the
 * summary panel and the confirmation row never disagree by a rounding cent.
 */
export function priceBooking({ service, unitCount, promo }) {
  if (!service) {
    return { subtotal: 0, discount: 0, total: 0 };
  }

  const billableUnits = service.unit_label === "per unit" ? Math.max(unitCount, 1) : 1;
  const subtotal = service.price * billableUnits;

  let discount = 0;
  if (promo) {
    discount =
      promo.discount_type === "percent"
        ? Math.round((subtotal * promo.discount_value) / 100)
        : Math.min(promo.discount_value, subtotal);
  }

  return { subtotal, discount, total: subtotal - discount, billableUnits };
}

export function getAvailableSlots(slots = TIME_SLOTS) {
  return slots.filter((slot) => slot.available);
}

/** "24 Sep 2026" — the date format used across the technician and admin pages. */
export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "Wednesday, 24 Sep" — longer form for banners and the next-visit card. */
export function formatLongDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

/** Whole days until a date; negative once it is in the past. */
export function daysUntil(value, today = new Date()) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startOfTarget - startOfToday) / 86_400_000);
}

export function describeCountdown(value, today = new Date()) {
  const days = daysUntil(value, today);
  if (days === null) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `In ${days} days`;
  if (days === -1) return "Yesterday";
  return `${Math.abs(days)} days ago`;
}
