const API_BASE = "http://127.0.0.1:8000";

/* DOM */
const jenkinsContainer = document.getElementById("jenkins-container");
const servicesContainer = document.getElementById("services-container");
const historyEl = document.getElementById("history-data");

/* CHART DATA */
let cpuHistory = [];
let memoryHistory = [];
let errorHistory = [];
let chartTick = 0;

/* CHART OPTIONS */
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false
};

/* CHARTS */
const cpuChart = new Chart(document.getElementById("cpuChart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "CPU %", data: cpuHistory, borderColor: "#22c55e" }] },
    options: chartOptions
});

const memoryChart = new Chart(document.getElementById("memoryChart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "Memory %", data: memoryHistory, borderColor: "#3b82f6" }] },
    options: chartOptions
});

const errorChart = new Chart(document.getElementById("errorChart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "Errors", data: errorHistory, borderColor: "#ef4444" }] },
    options: chartOptions
});

const buildChart = new Chart(document.getElementById("buildChart"), {
    type: "bar",
    data: {
        labels: ["Success", "Failed"],
        datasets: [{ data: [0, 0], backgroundColor: ["#22c55e", "#ef4444"] }]
    },
    options: chartOptions
});

/* JENKINS */
async function fetchJenkins() {
    const j = await fetch(`${API_BASE}/jenkins`).then(r => r.json());

    let card = document.getElementById("jenkins-card");
    if (!card) {
        card = document.createElement("div");
        card.id = "jenkins-card";
        card.className = "card";
        card.innerHTML = `
            <h2>Jenkins CI</h2>
            <div id="jenkins-badge"></div>
            <pre id="jenkins-info"></pre>
        `;
        jenkinsContainer.appendChild(card);
    }

    document.getElementById("jenkins-info").textContent =
`Job: ${j.job}
Build #: ${j.build_number}
Status: ${j.status}
Duration: ${j.duration_sec}s
Started: ${j.started_at}`;

    const cls =
        j.status === "SUCCESS" ? "success" :
        j.status === "FAILURE" ? "failed" : "running";

    document.getElementById("jenkins-badge").innerHTML =
        `<span class="badge ${cls}">${j.status}</span>`;
}

/* SERVICES */
async function fetchPipelineStatus() {
    const services = await fetch(`${API_BASE}/pipeline-status`).then(r => r.json());

    services.forEach((s, i) => {
        let card = document.getElementById(`card-${s.service}`);
        if (!card) {
            card = document.createElement("div");
            card.className = "card";
            card.id = `card-${s.service}`;
            card.innerHTML = `
                <h2>${s.service}</h2>
                <pre id="commit-${s.service}"></pre>
                <pre id="build-${s.service}"></pre>
                <pre id="monitor-${s.service}"></pre>
            `;
            servicesContainer.appendChild(card);
        }

        document.getElementById(`commit-${s.service}`).textContent =
            s.commits?.[0]?.commit.message || "No commits";

        document.getElementById(`build-${s.service}`).innerHTML =
            s.build?.conclusion === "success"
                ? `<span class="badge success">SUCCESS</span>`
                : s.build?.conclusion === "failure"
                ? `<span class="badge failed">FAILED</span>`
                : `<span class="badge unknown">NO BUILDS</span>`;

        document.getElementById(`monitor-${s.service}`).textContent =
`Errors: ${s.monitor.errors}
CPU: ${s.monitor.cpu}%
Memory: ${s.monitor.memory}%`;

        if (i === 0 && ++chartTick % 3 === 0) {
            cpuHistory.push(s.monitor.cpu);
            memoryHistory.push(s.monitor.memory);
            errorHistory.push(s.monitor.errors);

            cpuChart.data.labels.push("");
            memoryChart.data.labels.push("");
            errorChart.data.labels.push("");

            if (cpuHistory.length > 20) {
                cpuHistory.shift();
                memoryHistory.shift();
                errorHistory.shift();
                cpuChart.data.labels.shift();
                memoryChart.data.labels.shift();
                errorChart.data.labels.shift();
            }

            cpuChart.update("none");
            memoryChart.update("none");
            errorChart.update("none");
        }
    });
}

/* HISTORY */
async function fetchHistory() {
    const data = await fetch(`${API_BASE}/history`).then(r => r.json());
    historyEl.textContent = JSON.stringify(data.slice(-10), null, 2);
}

/* INIT */
fetchJenkins();
fetchPipelineStatus();
fetchHistory();

/* POLLING */
setInterval(fetchPipelineStatus, 15000);
setInterval(fetchJenkins, 20000);
setInterval(fetchHistory, 20000);
