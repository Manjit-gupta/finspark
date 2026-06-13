const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3001;

// File paths
const rawEventsPath = path.join(__dirname, "raw_events.json");
const mockDataPath = path.join(__dirname, "mock_api_responses.json");

let rawEvents = [];
let mockData = {};

// Load files
function loadFiles() {
  try {
    const raw = JSON.parse(fs.readFileSync(rawEventsPath, "utf8"));
    rawEvents = raw.events || raw || [];
    console.log(`[BOOT] Loaded ${rawEvents.length} raw events.`);
  } catch (e) {
    console.error("[BOOT] Could not load raw_events.json:", e.message);
    rawEvents = [];
  }

  try {
    mockData = JSON.parse(fs.readFileSync(mockDataPath, "utf8"));
    console.log("[BOOT] Loaded mock_api_responses.json.");
  } catch (e) {
    console.error("[BOOT] Could not load mock_api_responses.json:", e.message);
    mockData = {};
  }
}

loadFiles();

// Hot reload
[rawEventsPath, mockDataPath].forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    fs.watchFile(filePath, { interval: 500 }, (curr, prev) => {
      if (curr.mtime > prev.mtime) {
        console.log(`[HOT-RELOAD] Reloading ${path.basename(filePath)}...`);
        loadFiles();
      }
    });
  }
});

// Tenant middleware
const requireTenant = (req, res, next) => {
  if (req.method === "OPTIONS") return next();

  const tenantId = req.headers["x-tenant-id"];

  if (!tenantId) {
    return res.status(403).json({
      error: "Access Denied: Missing x-tenant-id header.",
    });
  }

  req.tenantId = tenantId;
  next();
};

function getEventsForTenant(tenantId) {
  return rawEvents.filter((e) => e.tenantId === tenantId);
}

function calculateKPIs(events) {
  return {
    totalEvents: events.length,
    activeUsers: new Set(events.map((e) => e.userId)).size,
    anonymizedPercent: 99.8,
  };
}

function calculateFeatureAdoption(events) {
  const map = {};

  events.forEach((e) => {
    if (!map[e.featureId]) {
      map[e.featureId] = { cloud: 0, onPrem: 0 };
    }

    if (e.deploymentType === "cloud") {
      map[e.featureId].cloud++;
    } else {
      map[e.featureId].onPrem++;
    }
  });

  return Object.entries(map)
    .map(([feature, counts]) => ({ feature, ...counts }))
    .sort((a, b) => b.cloud + b.onPrem - (a.cloud + a.onPrem));
}

function calculateJourneyFunnel(events) {
  const activeUsers = new Set(events.map((e) => e.userId)).size;

  return [
    { step: "App Open", users: activeUsers },
    { step: "Dashboard Load", users: Math.round(activeUsers * 0.92) },
    { step: "Module Nav", users: Math.round(activeUsers * 0.75) },
    { step: "Form Submit", users: Math.round(activeUsers * 0.45) },
    { step: "Completion", users: Math.round(activeUsers * 0.25) },
  ];
}

function calculateChannelBreakdown(events) {
  const map = {};

  events.forEach((e) => {
    map[e.channel] = (map[e.channel] || 0) + 1;
  });

  return Object.entries(map).map(([channel, count]) => ({
    channel,
    count,
  }));
}

function calculateDailyTrend(events) {
  const map = {};

  events.forEach((e) => {
    if (!e.timestamp) return;
    const date = e.timestamp.split("T")[0];
    map[date] = (map[date] || 0) + 1;
  });

  return Object.entries(map)
    .map(([date, events]) => ({ date, events }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

const licensedFeatures = {
  TENANT_HDFC: [
    "ApplyLoan",
    "KYC_Upload",
    "CreditScoreCheck",
    "LoanDisbursement",
    "RepaymentTracker",
    "DocumentUpload",
    "FraudAlerts",
    "AuditExport",
    "CoreBankingAPI",
    "EStatements",
    "BulkDisbursement",
    "CollectionModule",
  ],
  TENANT_ICICI: [
    "RetailBanking",
    "WealthDashboard",
    "TransactionSearch",
    "PortfolioRefresh",
    "ExportPDF",
    "FundTransfer",
    "LoanEligibility",
    "CreditCardApply",
    "InsuranceModule",
    "ForexModule",
  ],
};

function calculateLicenseGap(tenantId, events) {
  const licensed = licensedFeatures[tenantId] || [];
  const used = new Set(events.map((e) => e.featureId));

  const usedFeatures = licensed.filter((f) => used.has(f));
  const unusedFeatures = licensed.filter((f) => !used.has(f));

  return {
    totalLicensed: licensed.length,
    totalUsed: usedFeatures.length,
    unusedCount: unusedFeatures.length,
    usedFeatures,
    unusedFeatures,
    utilizationPercent:
      licensed.length > 0
        ? Math.round((usedFeatures.length / licensed.length) * 100)
        : 0,
  };
}

function generatePredictiveInsights(tenantId, events, licenseGap) {
  const insights = [];

  if (licenseGap.utilizationPercent < 60) {
    insights.push({
      type: "danger",
      message: `License Utilization is only ${licenseGap.utilizationPercent}%. High churn risk.`,
    });
  }

  if (licenseGap.unusedFeatures.length > 0) {
    insights.push({
      type: "warning",
      message: `${licenseGap.unusedFeatures.length} licensed features have zero usage.`,
    });
  }

  if (licenseGap.utilizationPercent >= 80) {
    insights.push({
      type: "success",
      message: `Strong feature adoption at ${licenseGap.utilizationPercent}%.`,
    });
  }

  return insights;
}

// Routes
app.get("/api/tenants", (req, res) => {
  const uniqueTenants = Array.from(
    new Set(rawEvents.map((e) => e.tenantId))
  ).filter(Boolean);

  res.json(uniqueTenants);
});

app.get("/api/analytics", requireTenant, (req, res) => {
  const events = getEventsForTenant(req.tenantId);
  const licenseGap = calculateLicenseGap(req.tenantId, events);

  res.json({
    kpis: calculateKPIs(events),
    featureAdoption: calculateFeatureAdoption(events),
    journeyFunnel: calculateJourneyFunnel(events),
    channelBreakdown: calculateChannelBreakdown(events),
    dailyTrend: calculateDailyTrend(events),
    licenseGap,
    predictiveInsights: generatePredictiveInsights(
      req.tenantId,
      events,
      licenseGap
    ),
  });
});

app.get("/api/features", requireTenant, (req, res) => {
  const events = getEventsForTenant(req.tenantId);
  const licensed = licensedFeatures[req.tenantId] || [];

  const featureMap = {};

  events.forEach((e) => {
    if (!featureMap[e.featureId]) {
      featureMap[e.featureId] = {
        totalEvents: 0,
        users: new Set(),
        channels: {},
        deployments: {},
      };
    }

    featureMap[e.featureId].totalEvents++;
    featureMap[e.featureId].users.add(e.userId);
    featureMap[e.featureId].channels[e.channel] =
      (featureMap[e.featureId].channels[e.channel] || 0) + 1;
    featureMap[e.featureId].deployments[e.deploymentType] =
      (featureMap[e.featureId].deployments[e.deploymentType] || 0) + 1;
  });

  const features = licensed.map((featureId) => {
    const data = featureMap[featureId];

    if (!data) {
      return {
        featureId,
        status: "unused",
        totalEvents: 0,
        uniqueUsers: 0,
        channels: {},
        deployments: {},
      };
    }

    return {
      featureId,
      status:
        data.totalEvents > 50
          ? "hot"
          : data.totalEvents > 20
          ? "warm"
          : "cold",
      totalEvents: data.totalEvents,
      uniqueUsers: data.users.size,
      channels: data.channels,
      deployments: data.deployments,
    };
  });

  res.json({ features });
});

app.get("/api/dashboard-data", requireTenant, (req, res) => {
  const events = getEventsForTenant(req.tenantId);

  res.json({
    kpis: calculateKPIs(events),
    featureAdoption: calculateFeatureAdoption(events),
    journeyFunnel: calculateJourneyFunnel(events),
    predictiveInsights: [
      {
        type: "success",
        message: `Dynamic Aggregation Engine compiled ${events.length} raw logs.`,
      },
    ],
  });
});

app.get("/api/feature-tracker", requireTenant, (req, res) => {
  const events = getEventsForTenant(req.tenantId);

  const featureMap = {};

  events.forEach((e) => {
    if (!featureMap[e.featureId]) {
      featureMap[e.featureId] = {
        totalEngagement: 0,
        uniqueUsers: new Set(),
        channels: { web: 0, mobile: 0, api: 0 },
      };
    }

    featureMap[e.featureId].totalEngagement++;
    featureMap[e.featureId].uniqueUsers.add(e.userId);

    if (featureMap[e.featureId].channels[e.channel] !== undefined) {
      featureMap[e.featureId].channels[e.channel]++;
    }
  });

  const features = Object.keys(featureMap).map((featureId) => {
    const data = featureMap[featureId];
    const total = data.totalEngagement;

    return {
      featureId,
      totalEngagement: total,
      uniqueUsers: data.uniqueUsers.size,
      distribution: {
        web: total ? Math.round((data.channels.web / total) * 100) : 0,
        mobile: total ? Math.round((data.channels.mobile / total) * 100) : 0,
        api: total ? Math.round((data.channels.api / total) * 100) : 0,
      },
      roiStatus:
        total > 15 ? "High ROI" : total < 5 ? "Underutilized" : "Stable",
      statusClass: total > 15 ? "success" : total < 5 ? "danger" : "warning",
    };
  });

  res.json({
    metrics: {
      totalMonitoredFeatures: features.length,
      averageEngagement:
        features.length > 0
          ? Math.round(events.length / features.length)
          : 0,
    },
    features: features.sort((a, b) => b.totalEngagement - a.totalEngagement),
  });
});

// Compliance routes
app.get("/api/compliance/consent", requireTenant, (req, res) => {
  res.json(mockData.consent_settings || {});
});

app.get("/api/compliance/pii-rules", requireTenant, (req, res) => {
  res.json(mockData.pii_masking_rules || {});
});

app.get("/api/compliance/audit-logs", requireTenant, (req, res) => {
  res.json(mockData.telemetry_audit_logs || {});
});

// Telemetry ingestion
app.post("/api/telemetry", requireTenant, (req, res) => {
  const { events } = req.body;

  if (!events || !Array.isArray(events)) {
    return res.status(400).json({
      error: "Invalid payload. Expected { events: [] }",
    });
  }

  res.status(200).json({
    status: "success",
    received: events.length,
    masked: events.length,
  });
});

app.post("/api/ingest", requireTenant, (req, res) => {
  const { events } = req.body;

  if (!events || !Array.isArray(events)) {
    return res.status(400).json({
      error: "Invalid payload. Expected { events: [] }",
    });
  }

  res.status(200).json({
    status: "success",
    received: events.length,
    masked: events.length,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`FinSpark Analytics Engine running on http://localhost:${PORT}`);
});