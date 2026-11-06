
import React, { useEffect, useState } from "react";
import { Icon } from "../../components/customer/CustomerIcons";
import { useAuth } from "../../context/AuthContext";
import {
  getAddresses,
  getDashboard,
  updateProfile,
  getOtherAddresses,
  updateOtherAddress,
  makeNewExtraAddress_,
} from "../../api/customerApi";

// --------------------------------------------------
// ADDRESS HELPERS
// --------------------------------------------------

const emptyAddress = {
  block_number: "",
  street_name: "",
  building_name: "",
  unit_number: "",
  postal_code: "",
};

const parseAddress = (address = "") => {
  const parts = String(address)
    .split(",")
    .map((part) => part.trim());

  const postalIndex = parts.findIndex((part) => /^\d{6}$/.test(part));

  const postal_code =
    postalIndex !== -1 ? parts[postalIndex] : "";

  const remaining = parts.filter(
    (_, index) => index !== postalIndex
  );

  return {
    block_number: remaining[0] || "",
    street_name: remaining[1] || "",
    building_name: remaining[2] || "",
    unit_number: remaining[3] || "",
    postal_code,
  };
};

const combineAddress = (address) => {
  return [
    address.block_number,
    address.street_name,
    address.building_name,
    address.unit_number,
    address.postal_code,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
};

const getAddressText = (address) => {
  return (
    address.customer_address ||
    address.extra_address ||
    address.address ||
    address.line ||
    ""
  );
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// --------------------------------------------------
// REUSABLE ADDRESS INPUTS
// --------------------------------------------------

const AddressInputs = ({ address, onChange }) => {
  const fields = [
    {
      key: "block_number",
      label: "Block / House Number *",
      placeholder: "123",
      required: true,
    },
    {
      key: "street_name",
      label: "Street Name *",
      placeholder: "Orchard Road",
      required: true,
    },
    {
      key: "building_name",
      label: "Building Name",
      placeholder: "Orchard Residences",
    },
    {
      key: "unit_number",
      label: "Unit Number",
      placeholder: "#12-34",
    },
    {
      key: "postal_code",
      label: "Postal Code *",
      placeholder: "238858",
      required: true,
    },
  ];

  return (
    <>
      {fields.map((field) => (
        <div className="dash-form-row" key={field.key}>
          <label className="dash-form-label">
            {field.label}
          </label>

          <input
            className="dash-form-input"
            type="text"
            value={address[field.key] || ""}
            onChange={onChange(field.key)}
            placeholder={field.placeholder}
            maxLength={
              field.key === "postal_code" ? 6 : undefined
            }
            required={field.required || false}
          />
        </div>
      ))}
    </>
  );
};

// --------------------------------------------------
// CUSTOMER PROFILE
// --------------------------------------------------

const CustomerProfile = () => {
  const { user } = useAuth();

  const [form, setForm] = useState({
    customer_name: user?.customer_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    ...emptyAddress,
  });

  const [account, setAccount] = useState({
    customer_ID: null,
    username: null,
    joined: null,
    loyalty_points: 0,
  });

  const [addresses, setAddresses] = useState([]);
  const [otherAddresses, setOtherAddresses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingExtra, setSavingExtra] = useState(false);

  const [toast, setToast] = useState(null);

  // Extra address form states
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [extraAddressForm, setExtraAddressForm] = useState({
    ...emptyAddress,
  });

  const [newExtraAddressForm, setNewExtraAddressForm] = useState({
    ...emptyAddress,
  });

  const [showNewAddressForm, setShowNewAddressForm] =
    useState(false);

  // --------------------------------------------------
  // INPUT HANDLERS
  // --------------------------------------------------

  const updateField = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  const updateExtraAddressField = (key) => (event) => {
    setExtraAddressForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  const updateNewExtraAddressField = (key) => (event) => {
    setNewExtraAddressForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  const showMessage = (message) => {
    setToast(message);

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // --------------------------------------------------
  // LOAD PROFILE AND ADDRESSES
  // --------------------------------------------------

  const refreshOtherAddresses = async () => {
    const result = await getOtherAddresses();
    setOtherAddresses(result?.addresses || []);
  };

  useEffect(() => {
    let alive = true;

    const loadProfile = async () => {
      try {
        const [dashRes, addrRes, otherRes] = await Promise.all([
          getDashboard(),
          getAddresses(),
          getOtherAddresses(),
        ]);

        if (!alive) return;

        const p = dashRes?.profile || {};

        setForm({
          customer_name:
            p.customer_name || user?.customer_name || "",
          email: p.email || user?.email || "",
          phone: p.phone || "",
          ...parseAddress(p.address || ""),
        });

        setAccount({
          customer_ID: p.customer_ID || null,
          username: p.username || user?.username || null,
          joined: p.joined || null,
          loyalty_points: Number(p.loyalty_points || 0),
        });

        setAddresses(addrRes?.addresses || []);
        setOtherAddresses(otherRes?.addresses || []);
      } catch (err) {
        if (alive) {
          showMessage(err.message || "Could not load profile.");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      alive = false;
    };
    // Load once when the profile page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------
  // SAVE MAIN PROFILE
  // --------------------------------------------------

  const save = async (event) => {
    event.preventDefault();

    const address = combineAddress(form);

    if (
      !form.block_number.trim() ||
      !form.street_name.trim() ||
      !form.postal_code.trim()
    ) {
      showMessage("Please complete the required address fields.");
      return;
    }

    if (!/^\d{6}$/.test(form.postal_code.trim())) {
      showMessage("Please enter a valid 6-digit postal code.");
      return;
    }

    setSaving(true);

    try {
      await updateProfile({
        customer_name: form.customer_name,
        email: form.email,
        phone: form.phone,
        address,
      });

      showMessage("Profile updated successfully.");
    } catch (err) {
      showMessage(err.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // ADD EXTRA ADDRESS
  // --------------------------------------------------

  const makeNewExtraAddress = async () => {
    const input = combineAddress(newExtraAddressForm);

    if (
      !newExtraAddressForm.block_number.trim() ||
      !newExtraAddressForm.street_name.trim() ||
      !newExtraAddressForm.postal_code.trim()
    ) {
      showMessage("Please fill in the required address fields.");
      return;
    }

    if (!/^\d{6}$/.test(newExtraAddressForm.postal_code.trim())) {
      showMessage("Please enter a valid 6-digit postal code.");
      return;
    }

    if (!account.customer_ID) {
      showMessage("Customer ID is missing. Please reload your profile.");
      return;
    }

    setSavingExtra(true);

    try {
      await makeNewExtraAddress_(input, account.customer_ID);

      await refreshOtherAddresses();

      setNewExtraAddressForm({ ...emptyAddress });
      setShowNewAddressForm(false);

      showMessage("New address added successfully.");
    } catch (err) {
      console.error("Error adding extra address:", err);
      showMessage(err.message || "Could not add address.");
    } finally {
      setSavingExtra(false);
    }
  };

  // --------------------------------------------------
  // EDIT EXTRA ADDRESS
  // --------------------------------------------------

  const handleEdit = (address) => {
    const addressText = getAddressText(address);

    setEditingAddressId(address.address_ID);
    setExtraAddressForm(parseAddress(addressText));
  };

  const saveExtraAddress = async (address_ID) => {
    const input = combineAddress(extraAddressForm);

    if (
      !extraAddressForm.block_number.trim() ||
      !extraAddressForm.street_name.trim() ||
      !extraAddressForm.postal_code.trim()
    ) {
      showMessage("Please fill in the required address fields.");
      return;
    }

    if (!/^\d{6}$/.test(extraAddressForm.postal_code.trim())) {
      showMessage("Please enter a valid 6-digit postal code.");
      return;
    }

    setSavingExtra(true);

    try {
      await updateOtherAddress(input, address_ID);

      await refreshOtherAddresses();

      setEditingAddressId(null);
      setExtraAddressForm({ ...emptyAddress });

      showMessage("Address updated successfully.");
    } catch (err) {
      console.error("Error updating extra address:", err);
      showMessage(err.message || "Could not update address.");
    } finally {
      setSavingExtra(false);
    }
  };

  // --------------------------------------------------
  // LOADING SCREEN
  // --------------------------------------------------

  if (loading) {
    return (
      <section
        className="cust-panel"
        style={{ padding: 48, textAlign: "center" }}
      >
        <p style={{ color: "var(--text-secondary)" }}>
          Loading your profile…
        </p>
      </section>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <>
      <div className="cust-page-head">
        <div>
          <h1>Profile & settings</h1>
        </div>
      </div>

      <div className="cust-grid-2">
        <div>
          {/* PERSONAL DETAILS AND MAIN ADDRESS */}

          <section className="cust-panel">
            <div className="cust-panel-head">
              <h2>Personal details</h2>
            </div>

            <form onSubmit={save}>
              <div className="dash-form-row">
                <label className="dash-form-label">
                  Full name
                </label>

                <input
                  className="dash-form-input"
                  value={form.customer_name}
                  onChange={updateField("customer_name")}
                  required
                />
              </div>

              <div className="dash-form-row">
                <label className="dash-form-label">
                  Email address
                </label>

                <input
                  type="email"
                  className="dash-form-input"
                  value={form.email}
                  onChange={updateField("email")}
                />
              </div>

              <div className="dash-form-row">
                <label className="dash-form-label">
                  Mobile number
                </label>

                <input
                  className="dash-form-input"
                  value={form.phone}
                  onChange={updateField("phone")}
                />
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  margin: "18px 0",
                  paddingTop: 16,
                }}
              >
                <h3>Main address</h3>

                <AddressInputs
                  address={form}
                  onChange={updateField}
                />
              </div>

              <button
                className="dash-btn dash-btn-primary"
                type="submit"
                disabled={saving}
                style={{ marginTop: 6 }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </section>

          {/* MAIN ADDRESS DISPLAY */}

          <section className="cust-panel">
            <div className="cust-panel-head">
              <h2>Saved main address</h2>
            </div>

            {addresses.length > 0 ? (
              addresses.map((address) => (
                <div
                  key={address.address_ID}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <Icon
                    name="pin"
                    size={17}
                    style={{
                      color: "var(--text-secondary)",
                      marginTop: 2,
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: "0 0 3px",
                        fontSize: 13.5,
                        fontWeight: 500,
                      }}
                    >
                      {address.label}

                      {address.isDefault && (
                        <span
                          className="cust-badge tone-accent"
                          style={{ marginLeft: 8 }}
                        >
                          Default
                        </span>
                      )}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontSize: 12.5,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {address.line}
                      {address.postal
                        ? `, Singapore ${address.postal}`
                        : ""}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                No separate saved main address records found.
              </p>
            )}
          </section>
        </div>

        {/* OTHER ADDRESSES */}

        <section className="cust-panel">
          <div className="cust-panel-head">
            <div>
              <h2>Other addresses</h2>
            </div>

            <button
              type="button"
              className="dash-btn dash-btn-outline"
              onClick={() => {
                setShowNewAddressForm((current) => !current);
                setNewExtraAddressForm({ ...emptyAddress });
              }}
            >
              {showNewAddressForm
                ? "Cancel"
                : "Add extra address"}
            </button>
          </div>

          {/* NEW EXTRA ADDRESS FORM */}

          {showNewAddressForm && (
            <div
              style={{
                padding: "12px 0",
                borderBottom: "1px solid var(--border)",
                marginBottom: 16,
              }}
            >
              <h3>Add an address</h3>

              <AddressInputs
                address={newExtraAddressForm}
                onChange={updateNewExtraAddressField}
              />

              <button
                type="button"
                className="dash-btn dash-btn-primary"
                onClick={makeNewExtraAddress}
                disabled={savingExtra}
              >
                {savingExtra ? "Saving…" : "Save address"}
              </button>
            </div>
          )}

          {/* EXISTING EXTRA ADDRESSES */}

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Address ID</th>
                  <th>Address</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {otherAddresses.map((address) => {
                  const addressText = getAddressText(address);

                  const isEditing =
                    editingAddressId === address.address_ID;

                  return (
                    <React.Fragment key={address.address_ID}>
                      <tr>
                        <td>{address.address_ID}</td>
                        <td>{addressText}</td>
                        <td>
                          <button
                            type="button"
                            className="dash-row-btn"
                            onClick={() => {
                              if (isEditing) {
                                setEditingAddressId(null);
                                setExtraAddressForm({ ...emptyAddress });
                              } else {
                                handleEdit(address);
                              }
                            }}
                          >
                            {isEditing ? "Cancel" : "Edit"}
                          </button>
                        </td>
                      </tr>

                      {isEditing && (
                        <tr>
                          <td colSpan={3}>
                            <div style={{ padding: 12 }}>
                              <h3>Edit address</h3>

                              <AddressInputs
                                address={extraAddressForm}
                                onChange={updateExtraAddressField}
                              />

                              <button
                                type="button"
                                className="dash-btn dash-btn-primary"
                                onClick={() =>
                                  saveExtraAddress(address.address_ID)
                                }
                                disabled={savingExtra}
                              >
                                {savingExtra
                                  ? "Saving…"
                                  : "Save address"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {otherAddresses.length === 0 && (
                  <tr>
                    <td colSpan={3}>
                      You have no extra addresses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* CUSTOMER SUMMARY AND ACCOUNT */}

        <div>
          <section className="cust-panel">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "10px 0 6px",
              }}
            >
              <span
                className="cust-avatar"
                style={{
                  width: 64,
                  height: 64,
                  fontSize: 21,
                }}
              >
                {getInitials(form.customer_name)}
              </span>

              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  margin: "14px 0 4px",
                }}
              >
                {form.customer_name || "Customer"}
              </h2>
                {/** <span
                className="cust-badge tone-success"
                style={{ marginTop: 12 }}
              >
                <Icon name="star" size={12} />
                {account.loyalty_points} loyalty points
              </span> */}
             
            </div>
          </section>

          <section className="cust-panel">
            <div className="cust-panel-head">
              <h2>Account</h2>
            </div>

            <div className="cust-summary-row">
              <span className="cust-summary-label">
                Username
              </span>

              <span className="cust-summary-value dash-mono">
                {account.username || "—"}
              </span>
            </div>

            <div className="cust-summary-row">
              <span className="cust-summary-label">
                Customer ID
              </span>

              <span className="cust-summary-value dash-mono">
                {account.customer_ID || "—"}
              </span>
            </div>

            <button
              className="dash-btn dash-btn-outline"
              style={{ width: "100%", marginTop: 14 }}
              type="button"
            >
              Change password
            </button>
          </section>
        </div>
      </div>

      {/* TOAST MESSAGE */}

      {toast && (
        <div className="cust-toast">
          <Icon name="checkCircle" size={16} />
          {toast}
        </div>
      )}
    </>
  );
};

export default CustomerProfile;
