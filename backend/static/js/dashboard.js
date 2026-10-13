/**
 * Frontend Dashboard Controller for Product Return-Rate Pattern Analysis
 * Consumes:
 *   - GET /api/health
 *   - GET /api/summary
 *   - GET /api/alerts
 *   - GET /api/returns
 */

let currentPage = 1;
const pageSize = 20;
let categoriesList = [];
let weeksList = [];

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  initDashboard();

  document.getElementById("btn-refresh").addEventListener("click", () => {
    refreshAllData();
  });

  document.getElementById("filter-category").addEventListener("change", () => {
    currentPage = 1;
    fetchReturnsTable();
  });

  document.getElementById("filter-week").addEventListener("change", () => {
    currentPage = 1;
    fetchReturnsTable();
  });

  document.getElementById("filter-status").addEventListener("change", () => {
    currentPage = 1;
    fetchReturnsTable();
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    document.getElementById("filter-category").value = "";
    document.getElementById("filter-week").value = "";
    document.getElementById("filter-status").value = "";
    currentPage = 1;
    fetchReturnsTable();
  });

  document.getElementById("btn-prev").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      fetchReturnsTable();
    }
  });

  document.getElementById("btn-next").addEventListener("click", () => {
    currentPage++;
    fetchReturnsTable();
  });
});

async function initDashboard() {
  await checkHealth();
  await fetchSummary();
  await fetchAlerts();
  await fetchReturnsTable();
}

async function refreshAllData() {
  const btn = document.getElementById("btn-refresh");
  const icon = btn.querySelector(".refresh-icon");
  icon.classList.add("spin");

  try {
    await checkHealth();
    await fetchSummary();
    await fetchAlerts();
    await fetchReturnsTable();
  } finally {
    icon.classList.remove("spin");
  }
}

async function checkHealth() {
  const pill = document.getElementById("status-indicator");
  const text = document.getElementById("status-text");

  try {
    const res = await fetch("/api/health");
    const data = await res.json();

    if (res.ok && data.data_source_available) {
      pill.className = "status-pill";
      text.innerText = "System Online";
    } else {
      pill.className = "status-pill error";
      text.innerText = data.data_source_available ? "Degraded" : "Data File Missing";
    }
  } catch (err) {
    pill.className = "status-pill error";
    text.innerText = "Backend Offline";
  }
}

async function fetchSummary() {
  try {
    const res = await fetch("/api/summary");
    if (!res.ok) throw new Error("Failed to load summary");
    const data = await res.json();

    document.getElementById("kpi-sold").innerText = Number(data.total_sold).toLocaleString();
    document.getElementById("kpi-returned").innerText = Number(data.total_returned).toLocaleString();
    document.getElementById("kpi-rate").innerText = `${data.overall_return_rate.toFixed(2)}%`;
    document.getElementById("kpi-alerts").innerText = data.high_return_records_count;

    document.getElementById("kpi-sold-sub").innerText = `${data.categories_count} categories monitored`;
    document.getElementById("kpi-returned-sub").innerText = `${data.reporting_period.total_weeks} weeks analyzed`;
    document.getElementById("kpi-alerts-sub").innerText = `${data.high_return_categories_count} categories flagged overall`;

    renderCategoryBars(data.category_summary || []);
    populateCategoryDropdown(data.category_summary || []);
  } catch (err) {
    console.error("Summary error:", err);
    document.getElementById("kpi-sold").innerText = "-";
    document.getElementById("kpi-returned").innerText = "-";
    document.getElementById("kpi-rate").innerText = "-";
    document.getElementById("kpi-alerts").innerText = "-";
  }
}

async function fetchAlerts() {
  const banner = document.getElementById("alert-banner");
  const bannerText = document.getElementById("alert-details");

  try {
    const res = await fetch("/api/alerts");
    if (!res.ok) throw new Error("Failed to load alerts");
    const data = await res.json();

    if (data.alert_count > 0) {
      banner.style.display = "flex";
      const topAlerts = data.alerts.slice(0, 3).map(
        (a) => `<strong>${a.category}</strong> (${a.return_rate}% in ${a.week})`
      );
      bannerText.innerHTML = `Found <strong>${data.alert_count}</strong> weekly return rate spikes exceeding the 10.0% threshold. Top anomalies: ${topAlerts.join(", ")}.`;
    } else {
      banner.style.display = "none";
    }
  } catch (err) {
    banner.style.display = "none";
  }
}

function renderCategoryBars(categories) {
  const container = document.getElementById("category-bars");
  container.innerHTML = "";

  categories.forEach((cat) => {
    const isHigh = cat.status === "HIGH RETURNS";
    const color = isHigh ? "var(--accent-rose)" : "var(--accent-emerald)";
    const maxVal = 25; // max scale percent
    const widthPct = Math.min(100, (cat.return_rate / maxVal) * 100);

    const card = document.createElement("div");
    card.className = "cat-bar-card";
    card.innerHTML = `
      <div class="cat-bar-header">
        <span class="cat-name">${cat.category}</span>
        <span class="cat-rate" style="color: ${color}">${cat.return_rate.toFixed(2)}%</span>
      </div>
      <div class="progress-bg">
        <div class="progress-fill" style="width: ${widthPct}%; background-color: ${color}"></div>
      </div>
      <div class="cat-meta">
        <span>Sold: ${Number(cat.total_sold).toLocaleString()}</span>
        <span>Returned: ${Number(cat.total_returned).toLocaleString()}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function populateCategoryDropdown(categories) {
  const select = document.getElementById("filter-category");
  const currentVal = select.value;
  select.innerHTML = '<option value="">All Categories</option>';

  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.category;
    opt.innerText = c.category;
    if (c.category === currentVal) opt.selected = true;
    select.appendChild(opt);
  });
}

async function fetchReturnsTable() {
  const tbody = document.getElementById("returns-tbody");
  const stateBox = document.getElementById("table-state");
  const catFilter = document.getElementById("filter-category").value;
  const weekFilter = document.getElementById("filter-week").value;
  const statusFilter = document.getElementById("filter-status").value;

  tbody.innerHTML = "";
  stateBox.style.display = "block";
  stateBox.innerHTML = "<p>Loading records...</p>";

  const params = new URLSearchParams();
  if (catFilter) params.append("category", catFilter);
  if (weekFilter) params.append("week", weekFilter);
  if (statusFilter) params.append("status", statusFilter);
  params.append("page", currentPage);
  params.append("page_size", pageSize);

  try {
    const res = await fetch(`/api/returns?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json();
      stateBox.innerHTML = `<h3>Data Unavailable</h3><p>${err.detail || "Unable to fetch data"}</p>`;
      return;
    }

    const result = await res.json();
    populateWeekDropdown(result.data);

    if (result.data.length === 0) {
      stateBox.innerHTML = "<h3>No Matching Records</h3><p>Try adjusting your category or week filters.</p>";
      updatePagination(result.total_records, result.page, result.total_pages);
      return;
    }

    stateBox.style.display = "none";
    result.data.forEach((row) => {
      const tr = document.createElement("tr");
      const isHigh = row.status === "HIGH RETURNS";
      const badgeClass = isHigh ? "badge high-returns" : "badge normal";
      const rateText = row.return_rate !== null ? `${row.return_rate.toFixed(2)}%` : "Undefined";

      tr.innerHTML = `
        <td><strong>${row.week}</strong></td>
        <td>${row.category}</td>
        <td>${Number(row.total_sold).toLocaleString()}</td>
        <td>${Number(row.total_returned).toLocaleString()}</td>
        <td class="rate-cell" style="color: ${isHigh ? 'var(--accent-rose)' : 'var(--accent-emerald)'}">${rateText}</td>
        <td><span class="${badgeClass}">${row.status}</span></td>
      `;
      tbody.appendChild(tr);
    });

    updatePagination(result.total_records, result.page, result.total_pages);
  } catch (err) {
    console.error("Fetch returns error:", err);
    stateBox.innerHTML = "<h3>Connection Error</h3><p>Could not connect to backend service.</p>";
  }
}

function populateWeekDropdown(data) {
  const select = document.getElementById("filter-week");
  if (select.children.length > 1) return; // already populated

  const weeks = Array.from(new Set(data.map((d) => d.week))).sort();
  weeks.forEach((w) => {
    const opt = document.createElement("option");
    opt.value = w;
    opt.innerText = w;
    select.appendChild(opt);
  });
}

function updatePagination(totalRecords, page, totalPages) {
  document.getElementById("page-info").innerText = `Page ${page} of ${totalPages} (${totalRecords} records)`;
  document.getElementById("btn-prev").disabled = page <= 1;
  document.getElementById("btn-next").disabled = page >= totalPages;
}
