
import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../../components/admin/Sidebar";
import "../../styles/shared.css";

const API = `${import.meta.env.VITE_API_BASE_URL}/api/admin`;

const getMonthKey = (year, month) =>
  `${year}-${String(month + 1).padStart(2, "0")}`;

const formatCurrency = (value) =>
  `S$${Number(value || 0).toLocaleString("en-SG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const ViewReports = () => {
  const [revenueByMonth, setRevenueByMonth] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revenueSource, setRevenueSource] = useState("");

  useEffect(() => {
    const fetchRevenue = async () => {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token") || "";

        const headers = {
          "Content-Type": "application/json",
          ...(token && {
            Authorization: `Bearer ${token}`,
          }),
        };

        let byMonth = {};
        let summaryLoaded = false;

        // 1. Try the same revenue summary endpoint as AdminDashboard
        try {
          const summaryRes = await fetch(
            `${API}/dashboard/summary`,
            { headers }
          );

          if (summaryRes.ok) {
            const summaryData = await summaryRes.json();

            if (
              summaryData?.ok &&
              Array.isArray(summaryData.revenue?.monthly)
            ) {
              summaryData.revenue.monthly.forEach((item) => {
                byMonth[item.key] = Number(item.value) || 0;
              });

              summaryLoaded = summaryData.revenue.monthly.length > 0;
            }
          }
        } catch (err) {
          console.warn("Revenue summary unavailable:", err);
        }

        // 2. Fallback: calculate revenue from completed bookings
        if (!summaryLoaded) {
          const bookingsRes = await fetch(
            `${API}/bookings`,
            { headers }
          );

          const bookingsData = await bookingsRes.json();

          if (
            !bookingsRes.ok ||
            !Array.isArray(bookingsData.bookings)
          ) {
            throw new Error(
              bookingsData.message || "Failed to load booking revenue."
            );
          }

          byMonth = {};

          bookingsData.bookings.forEach((booking) => {
            const status = normalizeStatus(booking.status);

            if (status !== "completed") return;

            const date =
              booking.booking_date ||
              booking.date ||
              booking.appointment_date;

            if (!date) return;

            const monthKey = String(date).slice(0, 7);
            const cost = Number(booking.estimateTotalCost) || 0;

            byMonth[monthKey] = (byMonth[monthKey] || 0) + cost;
          });

          setRevenueSource("completed bookings");
        } else {
          setRevenueSource("dashboard summary");
        }

        setRevenueByMonth(byMonth);
      } catch (err) {
        console.error("Error fetching revenue:", err);
        setError(err.message || "Unable to load revenue data.");
      } finally {
        setLoading(false);
      }
    };

    fetchRevenue();
  }, []);

  // Generate the latest six months dynamically
  const monthly = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (5 - index),
        1
      );

      const key = getMonthKey(
        date.getFullYear(),
        date.getMonth()
      );

      return {
        key,
        label: date.toLocaleDateString("en-SG", {
          month: "short",
        }),
        value: Number(revenueByMonth[key]) || 0,
      };
    });
  }, [revenueByMonth]);

  const maxValue = Math.max(
    ...monthly.map((month) => month.value),
    1
  );

  const totalRevenue = monthly.reduce(
    (total, month) => total + month.value,
    0
  );

  const hasRevenue = monthly.some(
    (month) => month.value > 0
  );

  return (
    <div className="dash">
      <Sidebar active="View Reports" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>View Reports</h1>
            <p>View business performance reports</p>
          </div>
        </header>

        {error && (
          <div
            style={{
              margin: "16px 0",
              padding: "12px 16px",
              borderRadius: 8,
              background: "#fef2f2",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        <section className="dash-panel">
          <h2>Revenue Overview</h2>

          {loading ? (
            <p style={{ padding: "20px 0" }}>
              Loading revenue data...
            </p>
          ) : (
            <>
              <div style={{ margin: "16px 0 24px" }}>
                <p
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                    marginBottom: 6,
                  }}
                >
                  Total revenue — Last 6 months
                </p>

                <h1 style={{ fontSize: 32, margin: 0 }}>
                  {formatCurrency(totalRevenue)}
                </h1>
              </div>

              <h2>Revenue Trend</h2>

              {hasRevenue ? (
                <div className="dash-chart">
                  {monthly.map((month) => (
                    <div
                      className="dash-chart-bar"
                      key={month.key}
                    >
                      <span className="dash-chart-bar-value">
                        {month.value > 0
                          ? formatCurrency(month.value)
                          : "—"}
                      </span>

                      <div
                        className="dash-chart-bar-fill"
                        style={{
                          height: `${
                            (month.value / maxValue) * 100
                          }%`,
                        }}
                      />

                      <span className="dash-chart-bar-label">
                        {month.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ padding: "20px 0", color: "#64748b" }}>
                  No completed booking revenue found for the
                  last six months.
                </p>
              )}

              <p
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "#94a3b8",
                }}
              >
                Revenue data from {revenueSource}.
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default ViewReports;
