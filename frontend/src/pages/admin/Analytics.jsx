import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const kpis = [
  { label: "Total Revenue (YTD)", value: "$142,300", delta: "↑ 18% vs last year", tone: "success" },
  { label: "Total Bookings (YTD)", value: "964", delta: "↑ 9% vs last year", tone: "accent" },
  { label: "Avg. Technician Rating", value: "4.7", delta: "Across 24 technicians", tone: "cyan" },
  { label: "Repeat Customer Rate", value: "61%", delta: "Booked more than once", tone: "accent" },
];

const bookingsByMonth = [
  { label: "Apr", value: 132 },
  { label: "May", value: 145 },
  { label: "Jun", value: 138 },
  { label: "Jul", value: 168 },
  { label: "Aug", value: 171 },
  { label: "Sep", value: 128 },
];

const maxBookings = Math.max(...bookingsByMonth.map((m) => m.value));

const topServices = [
  { name: "Aircon Servicing", bookings: 412 },
  { name: "Chemical Cleaning", bookings: 218 },
  { name: "Aircon Repair", bookings: 176 },
  { name: "Gas Top-up", bookings: 98 },
  { name: "Installation", bookings: 60 },
];

const maxServiceBookings = Math.max(...topServices.map((s) => s.bookings));

const Analytics = () => {
  return (
    <div className="dash">
      <Sidebar active="Analytics" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Analytics</h1>
            <p>Business performance at a glance</p>
          </div>
        </header>

        <section className="dash-stats">
          {kpis.map((kpi) => (
            <div className={`dash-stat dash-stat-${kpi.tone}`} key={kpi.label}>
              <p className="dash-stat-label">{kpi.label}</p>
              <p className="dash-stat-value" style={{ fontSize: "22px" }}>{kpi.value}</p>
              <p className="dash-stat-delta">{kpi.delta}</p>
            </div>
          ))}
        </section>

        <section className="dash-panel">
          <h2>Bookings per Month</h2>
          <div className="dash-chart">
            {bookingsByMonth.map((m) => (
              <div className="dash-chart-bar" key={m.label}>
                <span className="dash-chart-bar-value">{m.value}</span>
                <div
                  className="dash-chart-bar-fill"
                  style={{ height: `${(m.value / maxBookings) * 100}%` }}
                />
                <span className="dash-chart-bar-label">{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dash-panel">
          <h2>Top Services by Bookings</h2>
          {topServices.map((service) => (
            <div className="dash-hbar-row" key={service.name}>
              <span className="dash-hbar-label">{service.name}</span>
              <div className="dash-hbar-track">
                <div
                  className="dash-hbar-fill"
                  style={{ width: `${(service.bookings / maxServiceBookings) * 100}%` }}
                />
              </div>
              <span className="dash-hbar-value">{service.bookings}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Analytics;
