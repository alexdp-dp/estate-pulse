(() => {
  const cfg = window.ESTATE_PULSE_CONFIG;
  const nf = new Intl.NumberFormat("ro-RO");
  const EUR_RON_RATE = 5.2553; // aproximare folosită pentru agregarea "Toți dezvoltatorii"
  const moneyRon = new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 });
  const moneyEur = new Intl.NumberFormat("ro-RO", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const monthFmt = new Intl.DateTimeFormat("ro-RO", { month: "short", year: "2-digit" });

  const state = {
    developers: [],
    metrics: [],
    developerId: "all",
    period: "all",
    chart: null
  };

  const el = (id) => document.getElementById(id);

  function initials(name = "") {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "—";
  }

  function parseDate(s) {
    return new Date(`${s}T00:00:00`);
  }

  function monthLabel(s) {
    const value = monthFmt.format(parseDate(s)).replace(".", "");
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function sum(rows, key) {
    const vals = rows.map(r => r[key]).filter(v => v !== null && v !== undefined && v !== "");
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + Number(b || 0), 0);
  }

  function pct(n, d) {
    if (n === null || d === null || !d) return null;
    return (Number(n) / Number(d)) * 100;
  }

  function rowCurrency(row) {
    return (row.currency || "RON").toUpperCase();
  }

  function spendInRon(row) {
    if (row.spend === null || row.spend === undefined || row.spend === "") return null;
    const value = Number(row.spend);
    if (!Number.isFinite(value)) return null;
    return rowCurrency(row) === "EUR" ? value * EUR_RON_RATE : value;
  }

  function moneyForCurrency(value, currency = "RON") {
    if (value === null || value === undefined) return "—";
    return currency === "EUR" ? moneyEur.format(value) : moneyRon.format(value);
  }

  function cplFromBudgetMonths(rows, convertToRon = false) {
    const budgetRows = rows.filter(r => {
      if (r.spend === null || r.spend === undefined || r.spend === "") return false;
      const value = Number(r.spend);
      return Number.isFinite(value) && value > 0;
    });
    const spend = budgetRows.length ? budgetRows.reduce((acc, r) => {
      const value = convertToRon ? spendInRon(r) : Number(r.spend);
      return acc + (value || 0);
    }, 0) : null;
    const leads = sum(budgetRows, "total_leads");
    return { spend, leads, cpl: spend !== null && leads ? spend / leads : null };
  }

  function formatMaybe(value) {
    return value === null || value === undefined ? "—" : nf.format(value);
  }

  function filterByPeriod(rows) {
    if (!rows.length || state.period === "all") return [...rows];

    const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month));

    if (state.period === "ytd") {
      const latestYear = parseDate(sorted[sorted.length - 1].month).getFullYear();
      return sorted.filter(r => parseDate(r.month).getFullYear() === latestYear);
    }

    // Period filters mean calendar months, not number of metric rows.
    // With "All developers" there are multiple rows per month (one/developer),
    // so slicing the last N rows incorrectly kept only a handful of developers.
    const count = Number(state.period);
    const months = [...new Set(sorted.map(r => r.month))].sort();
    const selectedMonths = new Set(months.slice(-count));
    return sorted.filter(r => selectedMonths.has(r.month));
  }

  function currentRows() {
    let rows = state.metrics;
    if (state.developerId !== "all") {
      rows = rows.filter(r => r.developer_id === state.developerId);
    }
    return filterByPeriod(rows);
  }

  function selectedPeriodText(rows) {
    if (!rows.length) return "Fără date";
    const dates = [...new Set(rows.map(r => r.month))].sort();
    if (dates.length === 1) return monthLabel(dates[0]);
    return `${monthLabel(dates[0])} – ${monthLabel(dates[dates.length - 1])}`;
  }

  function buildSidebar() {
    const wrap = el("sidebarDevelopers");
    wrap.innerHTML = "";
    state.developers.forEach(dev => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dev-side";
      b.dataset.id = dev.id;
      b.innerHTML = `<span class="dev-initials">${initials(dev.name)}</span><span>${dev.name}</span>`;
      b.addEventListener("click", () => {
        state.developerId = dev.id;
        el("developerFilter").value = dev.id;
        render();
      });
      wrap.appendChild(b);
    });
  }

  function buildDeveloperFilter() {
    const select = el("developerFilter");
    select.innerHTML = `<option value="all">Toți dezvoltatorii</option>` +
      state.developers.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
  }

  function renderSidebarActive() {
    document.querySelectorAll(".dev-side").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.id === state.developerId);
    });
  }

  function renderKpis(rows) {
    const leads = sum(rows, "total_leads");
    const meetings = sum(rows, "meetings");
    const transactions = sum(rows, "transactions");
    const allDevelopers = state.developerId === "all";
    const currency = allDevelopers ? "RON" : (rows.find(r => r.currency)?.currency || "RON").toUpperCase();
    const spend = allDevelopers
      ? (rows.some(r => r.spend !== null && r.spend !== undefined && r.spend !== "") ? rows.reduce((acc, r) => acc + (spendInRon(r) || 0), 0) : null)
      : sum(rows, "spend");
    const cplStats = cplFromBudgetMonths(rows, allDevelopers);

    el("kpiLeads").textContent = formatMaybe(leads);
    el("kpiMeetings").textContent = formatMaybe(meetings);
    el("kpiTransactions").textContent = formatMaybe(transactions);
    el("kpiSpend").textContent = spend === null ? "—" : moneyForCurrency(spend, currency);
    el("kpiCpl").textContent = cplStats.cpl !== null ? `CPL: ${moneyForCurrency(cplStats.cpl, currency)}` : "Date media neimportate încă";

    el("funnelLeads").textContent = formatMaybe(leads);
    el("funnelMeetings").textContent = formatMaybe(meetings);
    el("funnelTransactions").textContent = formatMaybe(transactions);

    const mPct = pct(meetings, leads);
    const tPct = pct(transactions, meetings);
    el("funnelMeetingPct").textContent = mPct === null ? "—" : `${mPct.toFixed(1)}% din leaduri`;
    el("funnelTransactionPct").textContent = tPct === null ? "—" : `${tPct.toFixed(1)}% din vizite`;

    el("barLeads").style.width = leads ? "100%" : "0%";
    el("barMeetings").style.width = mPct === null ? "0%" : `${Math.min(100, mPct)}%`;
    el("barTransactions").style.width = (leads && transactions !== null) ? `${Math.min(100, pct(transactions, leads))}%` : "0%";
  }

  function groupedByMonth(rows) {
    const map = new Map();
    rows.forEach(r => {
      if (!map.has(r.month)) {
        map.set(r.month, { month: r.month, total_leads: 0, meetings: 0, transactions: 0, hasLeads:false, hasMeetings:false, hasTransactions:false });
      }
      const x = map.get(r.month);
      if (r.total_leads !== null) { x.total_leads += Number(r.total_leads); x.hasLeads = true; }
      if (r.meetings !== null) { x.meetings += Number(r.meetings); x.hasMeetings = true; }
      if (r.transactions !== null) { x.transactions += Number(r.transactions); x.hasTransactions = true; }
    });
    return [...map.values()].sort((a,b) => a.month.localeCompare(b.month));
  }

  function renderChart(rows) {
    const grouped = groupedByMonth(rows);
    const ctx = el("resultsChart");

    if (state.chart) state.chart.destroy();

    state.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: grouped.map(x => monthLabel(x.month)),
        datasets: [
          {
            label: "Leaduri",
            data: grouped.map(x => x.hasLeads ? x.total_leads : null),
            borderWidth: 2.5,
            tension: .32,
            pointRadius: 2.5,
            pointHoverRadius: 5
          },
          {
            label: "Vizite / întâlniri",
            data: grouped.map(x => x.hasMeetings ? x.meetings : null),
            borderWidth: 2,
            tension: .32,
            pointRadius: 2.5,
            pointHoverRadius: 5
          },
          {
            label: "Tranzacții",
            data: grouped.map(x => x.hasTransactions ? x.transactions : null),
            borderWidth: 2,
            tension: .32,
            pointRadius: 2.5,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "top",
            align: "start",
            labels: { color: "#9aa5b4", boxWidth: 9, boxHeight: 9, usePointStyle: true, pointStyle: "circle", padding: 18, font: { size: 10 } }
          },
          tooltip: {
            backgroundColor: "#0a0f15",
            borderColor: "rgba(255,255,255,.12)",
            borderWidth: 1,
            titleColor: "#fff",
            bodyColor: "#c9d1dc",
            padding: 11
          }
        },
        scales: {
          x: {
            grid: { display:false },
            ticks: { color:"#6f7b8d", font:{size:10} },
            border: { color:"rgba(255,255,255,.06)" }
          },
          y: {
            beginAtZero:true,
            grid: { color:"rgba(255,255,255,.055)" },
            ticks: { color:"#6f7b8d", font:{size:10}, precision:0 },
            border: { display:false }
          }
        }
      }
    });
  }

  function rowsForDeveloper(devId) {
    let rows = state.metrics.filter(r => r.developer_id === devId);
    return filterByPeriod(rows);
  }

  function renderTable() {
    const body = el("developerTableBody");
    body.innerHTML = "";

    state.developers.forEach(dev => {
      const rows = rowsForDeveloper(dev.id);
      if (!rows.length) return;

      const leads = sum(rows, "total_leads");
      const meetings = sum(rows, "meetings");
      const transactions = sum(rows, "transactions");
      const spend = sum(rows, "spend");
      const currency = (rows.find(r => r.currency)?.currency || "RON").toUpperCase();
      const cpl = cplFromBudgetMonths(rows, false).cpl;

      const tr = document.createElement("tr");
      tr.className = "developer-row";
      tr.innerHTML = `
        <td><div class="project-cell"><span class="project-badge">${initials(dev.name)}</span><span>${dev.name}</span></div></td>
        <td>${formatMaybe(leads)}</td>
        <td>${formatMaybe(meetings)}</td>
        <td>${formatMaybe(transactions)}</td>
        <td class="${spend === null ? "data-na" : ""}">${spend === null ? "—" : moneyForCurrency(spend, currency)}</td>
        <td class="${cpl === null ? "data-na" : ""}">${cpl === null ? "—" : moneyForCurrency(cpl, currency)}</td>
      `;
      tr.addEventListener("click", () => {
        state.developerId = dev.id;
        el("developerFilter").value = dev.id;
        window.scrollTo({ top: 0, behavior: "smooth" });
        render();
      });
      body.appendChild(tr);
    });
  }

  function render() {
    const rows = currentRows();
    renderSidebarActive();
    renderKpis(rows);
    renderChart(rows);
    renderTable();

    el("periodLabel").textContent = selectedPeriodText(rows);
    el("emptyState").classList.toggle("hidden", rows.length > 0);
  }

  async function api(path) {
    const response = await fetch(`${cfg.SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        "apikey": cfg.SUPABASE_PUBLISHABLE_KEY,
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${body}`);
    }
    return response.json();
  }

  async function loadData() {
    const badge = el("connectionBadge");
    const err = el("errorState");
    badge.className = "status-badge status-loading";
    badge.innerHTML = `<span class="status-dot"></span>Supabase · conectare…`;
    err.classList.add("hidden");

    try {
      const [developers, metrics] = await Promise.all([
        api("developers?select=id,name,slug,is_active&is_active=eq.true&order=name.asc"),
        api("monthly_metrics?select=developer_id,month,meetings,transactions,total_leads,visits,spend,currency&order=month.asc")
      ]);

      state.developers = developers;
      state.metrics = metrics;

      buildDeveloperFilter();
      buildSidebar();

      el("developerFilter").value = state.developerId;
      el("periodFilter").value = state.period;

      badge.className = "status-badge status-ok";
      badge.innerHTML = `<span class="status-dot"></span>Supabase · date live`;
      el("lastUpdated").textContent = `Actualizat: ${new Intl.DateTimeFormat("ro-RO", { dateStyle:"medium", timeStyle:"short" }).format(new Date())}`;

      render();
    } catch (e) {
      console.error(e);
      badge.className = "status-badge status-error";
      badge.innerHTML = `<span class="status-dot"></span>Supabase · eroare`;
      el("errorMessage").textContent = e.message || String(e);
      err.classList.remove("hidden");
    }
  }

  el("developerFilter").addEventListener("change", (e) => {
    state.developerId = e.target.value;
    render();
  });

  el("periodFilter").addEventListener("change", (e) => {
    state.period = e.target.value;
    render();
  });

  el("resetFilters").addEventListener("click", () => {
    state.developerId = "all";
    state.period = "all";
    el("developerFilter").value = "all";
    el("periodFilter").value = "all";
    render();
  });

  el("refreshBtn").addEventListener("click", loadData);

  loadData();
})();
