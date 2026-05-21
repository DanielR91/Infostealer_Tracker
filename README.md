# Stealer.Live: Infostealer & Ransomware Correlation Dashboard

Stealer.Live is a premium, high-performance threat intelligence dashboard designed to correlate ransomware victims with prior infostealer credential compromise records. Using data from the **Ransomware.live PRO API** (partnered with **Hudson Rock**), the dashboard provides threat analysts with corporate threat footprint visibility before and during ransomware deployment.

Developed as a modern, single-page application (SPA), it utilizes rich dark-mode aesthetics, glassmorphic UI components, dynamic micro-animations, and interactive visualizations.

---

## 🚀 Key Features

* **Threat Dashboard**: High-level KPIs and trends, including total compromised employee credentials, exposed customer log records, Monthly Ingestion trends, Top Stealer Families, and affected sectors/countries.
* **Victims Feed**: Interactive data grid displaying correlated victim profiles. Supports instant keyword search and multi-criteria filtering (by ransomware group, sector, country, and stealer presence).
* **SEC Form 8-K Disclosures Feed**: A real-time feed tracking corporate cybersecurity incident filings (Item 1.05 and 8.01) submitted to the SEC EDGAR system, mapped to threat group attributions.
* **Group Intel Profiles**: Interactive progress bars ranking threat groups based on the percentage of their victims who had pre-existing credential exposures. Slide-out detail drawers display group TTPs, onion leaksites, and CVE associations.
* **Interactive Side-Drawer**: Provides deep-dive views for specific victims or groups without navigating away from the current view.

---

## 🏗️ Architecture & Security Design

To prevent exposing the private **Ransomware.live PRO API Key** to the public internet, the application operates on a **Static Site Generation (SSG) caching pipeline**:

```mermaid
graph TD
    subgraph GitHub Cloud
        cron[GitHub Actions Cron Job - Hourly] --> script[scripts/fetch_data.py]
        secret[Secret: RANSOMWARE_LIVE_API_KEY] --> script
        script -->|Queries PRO API| api[Ransomware.live PRO API]
        script -->|Compiles Datasets| data[data/*.json]
        data -->|Committed to Branch| repo[GitHub Repository]
        repo -->|Automatic Build| pages[GitHub Pages Host]
    end
    subgraph Client Browser
        client[User Browser] -->|Loads SPA| pages
        client -->|Fetches Static JSON Files| data
        client -->|Renders UI via Chart.js| ui[Interactive Dashboard]
    end
```

### Advantages of this Architecture
1. **Zero Key Exposure**: The API key is stored securely as a GitHub Repository Secret and is only accessed inside the transient GitHub Action container.
2. **Infinite Scaling & Speed**: The client-side dashboard queries static JSON files directly from GitHub Pages' high-speed CDN, resulting in near-instant load times and zero server overhead.
3. **API Quota Protection**: Instead of fetching from the API on every page load (which could easily exhaust the 500,000 monthly request quota), the cron job polls only 24 times a day, utilizing less than **1.5%** of the quota.

---

## 📂 Project Structure

```
├── .github/workflows/
│   └── update_data.yml     # Hourly GitHub Actions fetch and commit pipeline
├── css/
│   └── styles.css          # Core design system (glassmorphism, typography, responsive grids)
├── data/
│   ├── summary.json        # Compiled statistical aggregations
│   ├── victims.json        # Unified victim-leak correlation index
│   ├── groups.json         # Ransomware group profiles & TTP cache
│   └── sec8k.json          # SEC 8-K disclosures feed cache
├── js/
│   └── app.js              # SPA navigation, state manager, Chart.js integrations
├── scripts/
│   ├── fetch_data.py       # Live API retrieval & parsing script (Python)
│   └── generate_mock.py    # Offline mock-data generator for dev testing
├── .env.example            # Environment variables template
├── index.html              # Main dashboard entrypoint
├── package.json            # Node/Vite development scripts
└── README.md               # Documentation
```

---

## 🛡️ License

This project is licensed under the MIT License. Data parsed is subject to Ransomware.live terms.
