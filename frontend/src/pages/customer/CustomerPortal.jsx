import { Navigate } from "react-router-dom";

// The customer module now lives behind CustomerLayout at /customer/*.
// This file used to hold a placeholder page; it is kept as a redirect so the
// older /customer/portal links (and any bookmark from before the module
// landed) still arrive somewhere sensible.
const CustomerPortal = () => <Navigate to="/customer/dashboard" replace />;

export default CustomerPortal;
