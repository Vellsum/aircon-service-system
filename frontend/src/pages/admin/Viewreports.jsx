import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const reports = [
  { name: "Monthly Revenue Report", meta: "Last generated 01 Sep 2026 · PDF" },
  { name: "Booking Summary Report", meta: "Last generated 03 Sep 2026 · CSV" },
  { name: "Technician Performance Report", meta: "Last generated 28 Aug 2026 · PDF" },
  { name: "Customer Activity Report", meta: "Last generated 30 Aug 2026 · CSV" },
  { name: "Inventory Stock Report", meta: "Last generated 02 Sep 2026 · PDF" },
];

const monthly = [
  { label: "Apr", value: 12800 },
  { label: "May", value: 14200 },
  { label: "Jun", value: 13950 },
  { label: "Jul", value: 16700 },
  { label: "Aug", value: 17100 },
  { label: "Sep", value: 18450 },
];

const maxValue = Math.max(...monthly.map((m) => m.value));

const ViewReports = () => {
  return (
    <div className="dash">
      <Sidebar active="View Reports" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>View Reports</h1>
            <p>Generate and download reports for your business</p>
          </div>
          <select className="dash-search" style={{ maxWidth: 180 }}>
            <option>Last 6 months</option>
            <option>Last 3 months</option>
            <option>This year</option>
          </select>
        </header>

        <section className="dash-panel">
          <h2>Revenue Trend</h2>
          <div className="dash-chart">
            {monthly.map((m) => (
              <div className="dash-chart-bar" key={m.label}>
                <span className="dash-chart-bar-value">${(m.value / 1000).toFixed(1)}k</span>
                <div
                  className="dash-chart-bar-fill"
                  style={{ height: `${(m.value / maxValue) * 100}%` }}
                />
                <span className="dash-chart-bar-label">{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Available Reports</h2>
            <button className="dash-btn dash-btn-ghost">Generate New Report</button>
          </div>

          <div>
            {reports.map((report) => (
              <div className="dash-report-item" key={report.name}>
                <div>
                  <p className="dash-report-name">{report.name}</p>
                  <p className="dash-report-meta">{report.meta}</p>
                </div>
                <button className="dash-btn dash-btn-outline">Download</button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ViewReports;
