#!/usr/bin/env python3
import os
import sys
import json
import time
import datetime
import requests

# Set base URL
API_BASE_URL = "https://api-pro.ransomware.live"

# Manually load .env file if it exists to avoid external dependency issues
if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            if line.strip() and not line.startswith("#"):
                parts = line.strip().split("=", 1)
                if len(parts) == 2:
                    os.environ[parts[0].strip()] = parts[1].strip()

# Retrieve API key
api_key = os.environ.get("RANSOMWARE_LIVE_API_KEY")

if not api_key:
    print("[ERROR] RANSOMWARE_LIVE_API_KEY environment variable is not set.")
    print("Please set it in your environment or in a .env file.")
    sys.exit(1)

# Configure headers
headers = {
    "X-API-KEY": api_key,
    "Accept": "application/json"
}

def make_request(endpoint, params=None):
    url = f"{API_BASE_URL}{endpoint}"
    print(f"Fetching: {url} ...")
    try:
        response = requests.get(url, headers=headers, params=params, timeout=30)
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 401:
            print(f"[ERROR] Unauthorized (401). Check if your X-API-KEY is valid.")
            return None
        elif response.status_code == 429:
            print(f"[WARNING] Rate limited (429). Waiting 5 seconds...")
            time.sleep(5)
            return make_request(endpoint, params)
        else:
            print(f"[ERROR] API returned status code {response.status_code} for {endpoint}")
            return None
    except Exception as e:
        print(f"[ERROR] Connection error for {endpoint}: {e}")
        return None

def ensure_list(response, name="response"):
    if response is None:
        return []
    if isinstance(response, list):
        return response
    if isinstance(response, dict):
        print(f"[DEBUG] {name} is a dict. Keys: {list(response.keys())}")
        # Search for a list inside the dict keys
        for k, v in response.items():
            if isinstance(v, list):
                print(f"[DEBUG] Extracting list from key '{k}' (length: {len(v)})")
                return v
        # Check if it's a dictionary of objects/dicts, e.g. {"id1": {...}, "id2": {...}}
        if response and all(isinstance(v, dict) for v in response.values()):
            print(f"[DEBUG] Converting dict values of {name} to list (length: {len(response)})")
            return list(response.values())
        print(f"[WARNING] Could not extract a list from {name} dict: {response}")
    return []

def validate_key():
    res = make_request("/validate")
    if res:
        print(f"[SUCCESS] API Key is valid. Client identity: {res.get('client_id', 'Unknown')}")
        return True
    return False

def main():
    if not validate_key():
        print("[ERROR] Key validation failed. Exiting.")
        sys.exit(1)
        
    os.makedirs("data", exist_ok=True)
    
    # 1. Fetch statistics
    print("\n--- Fetching global stats ---")
    stats = make_request("/stats")
    
    # 2. Fetch victims for 2025 and 2026
    print("\n--- Fetching victims for 2025 and 2026 ---")
    victims_2025 = ensure_list(make_request("/victims/", params={"year": "2025"}), "victims_2025")
    victims_2026 = ensure_list(make_request("/victims/", params={"year": "2026"}), "victims_2026")
    
    # Combine victims
    raw_victims = []
    # Deduplicate by victim ID if there are overlapping entries
    seen_ids = set()
    for v in (victims_2026 + victims_2025):
        v_id = v.get("id") or f"{v.get('victim')}@{v.get('group')}"
        if v_id not in seen_ids:
            seen_ids.add(v_id)
            raw_victims.append(v)
            
    print(f"Retrieved {len(raw_victims)} total victims from 2025 & 2026.")
    
    # 3. Fetch SEC Form 8-K filings
    print("\n--- Fetching SEC 8-K filings ---")
    sec_2025 = ensure_list(make_request("/8k", params={"year": "2025"}), "sec_2025")
    sec_2026 = ensure_list(make_request("/8k", params={"year": "2026"}), "sec_2026")
    sec_filings = []
    seen_filing_urls = set()
    for f in (sec_2026 + sec_2025):
        f_url = f.get("url")
        if f_url not in seen_filing_urls:
            seen_filing_urls.add(f_url)
            sec_filings.append(f)
            
    # Sort filings by date descending
    sec_filings.sort(key=lambda x: x.get("filing_date", ""), reverse=True)
    with open("data/sec8k.json", "w") as f:
        json.dump(sec_filings, f, indent=2)
    print(f"Saved {len(sec_filings)} SEC 8-K filings to data/sec8k.json")

    # Load existing cached groups details to avoid hitting endpoints repeatedly
    cached_groups = {}
    if os.path.exists("data/groups.json"):
        try:
            with open("data/groups.json") as f:
                cached_groups = json.load(f)
        except Exception:
            pass

    # 4. Process and Aggregate Data
    print("\n--- Aggregating threat intelligence metrics ---")
    
    total_domains_tracked = 0
    total_employees = 0
    total_users = 0
    total_thirdparties = 0
    
    family_aggregates = {}
    sector_exposure = {}
    country_exposure = {}
    country_totals = {}
    country_with_stealer = {}
    
    group_totals = {}
    group_with_stealer = {}
    
    monthly_ingestion = {}
    processed_victims = []
    
    for v in raw_victims:
        # Standardize fields to match our dashboard expectations
        # The PRO API fields: victim, group, attackdate, discovered, country, activity, website, screenshot, infostealer, press, id, permalink
        victim_name = v.get("victim")
        group_name = v.get("group")
        discovered_str = v.get("discovered", "")
        country = v.get("country") or "Unknown"
        sector = v.get("activity") or "Unknown"
        website = v.get("website") or ""
        infostealer = v.get("infostealer") or {}
        
        if not group_name:
            continue
            
        # Tally total victims counts per country/group
        country_totals[country] = country_totals.get(country, 0) + 1
        group_totals[group_name] = group_totals.get(group_name, 0) + 1
        
        # Check if victim has infostealer data
        has_stealer = isinstance(infostealer, dict) and (
            infostealer.get("employees", 0) > 0 or 
            infostealer.get("users", 0) > 0 or 
            infostealer.get("thirdparties", 0) > 0 or 
            len(infostealer.get("infostealer_stats", {})) > 0
        )
        
        # Determine month for monthly trends (using discovered date)
        month_key = "Unknown"
        if discovered_str and len(discovered_str) >= 7:
            month_key = discovered_str[:7] # e.g. "2026-05"
            
        if has_stealer:
            total_domains_tracked += 1
            
            employees = infostealer.get("employees", 0)
            users = infostealer.get("users", 0)
            thirdparties = infostealer.get("thirdparties", 0)
            
            total_employees += employees
            total_users += users
            total_thirdparties += thirdparties
            
            # Month statistics
            if month_key != "Unknown":
                monthly_ingestion[month_key] = monthly_ingestion.get(month_key, 0) + 1
                
            # Country and Group with stealer tally
            country_with_stealer[country] = country_with_stealer.get(country, 0) + 1
            group_with_stealer[group_name] = group_with_stealer.get(group_name, 0) + 1
            
            # Sector exposure (sum of exposed credentials)
            sector_exposure[sector] = sector_exposure.get(sector, 0) + employees + thirdparties
            country_exposure[country] = country_exposure.get(country, 0) + 1
            
            # Aggregate stealer families
            for family, count in infostealer.get("infostealer_stats", {}).items():
                if family == "UNKNOWN":
                    continue
                family_aggregates[family] = family_aggregates.get(family, 0) + count
                
        # Append to our victims output array
        processed_victims.append(v)
        
    # Sort processed victims by discovered date descending
    processed_victims.sort(key=lambda x: x.get("discovered", ""), reverse=True)
    
    # Save processed victims.json
    with open("data/victims.json", "w") as f:
        json.dump(processed_victims, f, indent=2)
    print(f"Saved {len(processed_victims)} parsed victims to data/victims.json")
    
    # Format monthly ingestion sorted by month (limiting to last 12 months or chronological order)
    monthly_data = [{"month": m, "count": monthly_ingestion[m]} for m in sorted(monthly_ingestion.keys()) if m != "Unknown"]
    
    # Format family stats sorted by count
    family_stats = [{"name": k, "count": v} for k, v in sorted(family_aggregates.items(), key=lambda x: x[1], reverse=True)]
    
    # Format sectors exposure sorted by count
    sector_stats = [{"name": k, "count": v} for k, v in sorted(sector_exposure.items(), key=lambda x: x[1], reverse=True)]
    
    # Format country absolute count
    country_stats = [{"name": k, "count": v} for k, v in sorted(country_exposure.items(), key=lambda x: x[1], reverse=True)]
    
    # Format country percentage (for countries with at least 3 victims to avoid noise)
    country_pct_stats = []
    for c, total in country_totals.items():
        if total >= 3:
            with_stealer = country_with_stealer.get(c, 0)
            pct = (with_stealer / total * 100)
            country_pct_stats.append({
                "name": c,
                "percent": pct,
                "total_victims": total,
                "stealer_victims": with_stealer
            })
    country_pct_stats.sort(key=lambda x: x["percent"], reverse=True)
    
    # Format group percentage (for groups with at least 3 victims to avoid noise)
    group_pct_stats = []
    for g, total in group_totals.items():
        if total >= 3:
            with_stealer = group_with_stealer.get(g, 0)
            pct = (with_stealer / total * 100)
            group_pct_stats.append({
                "group": g,
                "percent": pct,
                "total_victims": total,
                "stealer_victims": with_stealer
            })
    group_pct_stats.sort(key=lambda x: x["percent"], reverse=True)
    
    # Save overall summary statistics
    summary = {
        "totals": {
            "domains_tracked": total_domains_tracked,
            "employees_exposed": total_employees,
            "users_exposed": total_users,
            "thirdparties_exposed": total_thirdparties,
            "stealer_families_count": len(family_stats)
        },
        "families": family_stats,
        "monthly": monthly_data,
        "sectors": sector_stats,
        "countries": country_stats,
        "countries_pct": country_pct_stats,
        "groups_pct": group_pct_stats,
        "last_update": datetime.datetime.utcnow().isoformat() + "Z"
    }
    
    with open("data/summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    print("Saved aggregated metrics to data/summary.json")

    # 5. Fetch group details for groups present in our dataset (top 25 groups with most victims)
    print("\n--- Fetching ransomware group profiles (with caching) ---")
    top_groups = sorted(group_totals.items(), key=lambda x: x[1], reverse=True)[:25]
    groups_detailed = {}
    
    # Reuse cached groups to save API requests
    for g_name, count in top_groups:
        if g_name in cached_groups:
            print(f"Reusing cached profile for group: {g_name}")
            groups_detailed[g_name] = cached_groups[g_name]
        else:
            print(f"Fetching fresh profile for group: {g_name}")
            # Request group detail
            detail = make_request(f"/group/{g_name}") or make_request(f"/groups/{g_name}")
            if detail:
                groups_detailed[g_name] = detail
            else:
                # Fallback if API fails
                groups_detailed[g_name] = {
                    "description": f"No detailed profile available for group '{g_name}'. Tracked victims: {count}.",
                    "victims": count,
                    "firstseen": None,
                    "lastseen": None,
                    "locations": [],
                    "ttps": [],
                    "vulnerabilities": [],
                    "tools": []
                }
            # Sleep 1 second between requests to respect rate limiting/fair use
            time.sleep(1.0)
            
    with open("data/groups.json", "w") as f:
        json.dump(groups_detailed, f, indent=2)
    print("Saved group profiles to data/groups.json")
    print("\nData synchronization pipeline complete!")

if __name__ == "__main__":
    main()
