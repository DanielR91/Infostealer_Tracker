# Stealer.Live: Infostealer & Ransomware Correlation Dashboard 🕵️‍♂️

**[🚀 View Live Dashboard](https://DanielR91.github.io/Infostealer_Tracker/)**

**Stealer.Live** is an automated threat intelligence dashboard designed to correlate ransomware victims with prior infostealer credential compromise records. Using data from the **Ransomware.live PRO API** (partnered with **Hudson Rock**), the dashboard provides threat analysts with corporate threat footprint visibility before and during ransomware deployment.

---

## ✨ Features

- **Threat Dashboard Overview**: High-level KPIs and trends, including total compromised employee credentials, exposed customer log records, Monthly Ingestion trends, Top Stealer Families, and affected industry sectors/countries.
- **Correlated Victims Feed**: An interactive grid displaying victim profiles. Supports instant keyword search and multi-criteria filtering by ransomware group, industry sector, country, and stealer footprint.
- **SEC Form 8-K Disclosures Feed**: A real-time regulatory feed compiling Item 1.05 and 8.01 corporate cybersecurity filings from the SEC EDGAR database, mapped to threat group attributions.
- **Ransomware Group Intel**: Detailed profiles for active threat groups including:
  - Interactive ranking based on the percentage of victims who had pre-existing credential exposures.
  - Known leak site Onion locations.
  - Exploited CVE vulnerabilities, TTPs, and used software tools.
- **Interactive Detail Drawer**: View comprehensive profiles for specific victims or threat groups with a slide-out drawer that keeps your search context intact.

---

## 🚀 How It Works & Where to Access

### 1. Access the Live Dashboard
The dashboard runs entirely client-side and can be accessed at:
👉 **[https://DanielR91.github.io/Infostealer_Tracker/](https://DanielR91.github.io/Infostealer_Tracker/)**

### 2. Auto-Updating Intelligence
The data is updated automatically on an hourly cycle:
* A background data pipeline polls the Ransomware.live PRO API for the latest incident and SEC disclosure records.
* The gathered threat data is compiled into static datasets.
* The frontend fetches these datasets on-the-fly, ensuring that you always see the latest information with zero manual sync required.

---

## 📁 Project Structure

```
├── .github/workflows/
│   └── update_data.yml     # Hourly data sync pipeline
├── css/
│   └── styles.css          # Premium Dark Mode styles (glassmorphism)
├── js/
│   └── app.js              # SPA navigation and interactive visualizations
├── data/                  # Auto-synchronized JSON data feeds
├── index.html             # Main Dashboard UI
└── README.md               # User Documentation
```

---

## 📜 Disclaimer

This project is for threat intelligence and educational purposes. Data parsing and visualization are subject to the terms of the respective data sources (Ransomware.live and Hudson Rock).
