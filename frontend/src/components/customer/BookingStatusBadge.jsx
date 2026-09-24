import React from "react";
import { statusTone } from "../../data/customer/customerSelectors";

/** Pill showing a booking's status, coloured from the shared tone map. */
const BookingStatusBadge = ({ status }) => (
  <span className={`cust-badge tone-${statusTone(status)}`}>
    <i />
    {status}
  </span>
);

export default BookingStatusBadge;
