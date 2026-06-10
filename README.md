# 🚀 FinSpark Enterprise Prototype

An enterprise-grade React dashboard and Node.js backend prototype demonstrating a secure, multi-tenant Feature Intelligence Framework. This project was built to showcase a lightweight telemetry SDK with batching (circuit breaker), strict database-level isolation, and a dynamic PII masking ETL pipeline.

## ✨ Key Features

* **Multi-Tenant Architecture:** Ensures complete data isolation between tenants by validating tenant-specific requests and preventing unauthorized access.

* **Data Privacy & Security:** Automatically masks sensitive information such as emails, account numbers, and personal identifiers before storing data.

* **Real-Time Telemetry Tracking:** Captures user interactions efficiently using batch processing and reliable background data transmission.

* **Dynamic Mock Database:** Backend data is powered by a centralized `mock_api_responses.json` file, allowing instant updates without modifying application code.

* **Interactive Analytics Dashboard:** Visualizes key business metrics through responsive charts and dashboards for better decision-making.

* **Predictive Insights Engine:** Identifies low-engagement trends and highlights potential risks, enabling proactive business actions.

* **Modern Full-Stack Design:** Built using React, Vite, Express.js, and Recharts to deliver a fast, scalable, and user-friendly experience.

* **Developer-Friendly Configuration:** Easily customize application behavior and dashboard metrics through simple JSON-based configuration files.

## ⚙️ How to Run Locally

You will need two separate terminal windows to run both the frontend UI and the backend mock server simultaneously.

### 1. Start the Backend API (Mock Database Server)
```bash
# Navigate to the backend directory
cd server

# Install dependencies
npm install

# Start the Node.js server (Runs on port 3001)
node index.js
```
*Note: Any time you edit `mock_api_responses.json`, the server will log `[HOT-RELOAD]` and instantly update the API endpoints.*

### 2. Start the Frontend React Dashboard
Open a new terminal window:
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server (Runs on port 5173)
npm run dev
```

### 3. Open in Browser
Once both servers are running, open your web browser and navigate to:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🏗️ Architecture overview

* `frontend/`: A React + Vite SPA using `lucide-react` and `recharts` for clean, glassmorphic UI visualizations.
* `server/`: An Express.js mock server that simulates an enterprise Data Engineering pipeline and isolated multi-tenant databases.
* `mock_api_responses.json`: The "Command Center." Edit this JSON file on the fly to permanently alter backend statistics without modifying source code.
