#!/usr/bin/env python3
import os
import json
import random
import datetime

# Create data directory if it doesn't exist
os.makedirs("data", exist_ok=True)

# Predefined variables for realistic details
SECTORS = ["Technology", "Business Services", "Manufacturing", "Education", "Healthcare", 
           "Public Sector", "Financial Services", "Consumer Services", "Transportation/Logistics", "Energy"]
COUNTRIES = ["US", "GB", "CA", "BR", "FR", "IN", "DE", "ES", "IT", "AU", "MX", "JP", "TW", "TH", "ID"]
RANSOM_GROUPS = ["lockbit3", "blackcat", "clop", "play", "alphv", "bianlian", "akira", "medusa", "blackbasta", "rhysida", "cactus", "hunters"]
STEALER_FAMILIES = ["RedLine", "Lumma", "Generic Stealer", "Raccoon", "StealC", "Vidar", "Azorult", "CRYPTBOT", "Acreed", "Mystic", "Atomic", "DarkCrystal"]
STEALER_PALETTE_PROBS = [0.45, 0.22, 0.15, 0.08, 0.04, 0.03, 0.015, 0.005, 0.004, 0.003, 0.002, 0.001]

DOMAINS = [
    "epicgames.com", "github.com", "ubisoft.com", "sony.com", "udemy.com", 
    "hbomax.com", "reddit.com", "wordpress.com", "hp.com", "nike.com",
    "toyota.co.jp", "siemens.com", "accenture.com", "capgemini.com", "deloitte.com",
    "honeywell.com", "boeing.com", "lufthansa.com", "shell.com", "bp.com",
    "novartis.com", "pfizer.com", "hsbc.com", "barclays.com", "santander.com"
]

def generate_mock_infostealer(domain):
    # Determine size/scale of exposure
    if domain in DOMAINS[:5]:
        scale = "huge"
    elif domain in DOMAINS[5:15]:
        scale = "medium-large"
    else:
        scale = "random"
        
    if scale == "huge":
        employees = random.randint(100, 300)
        users = random.randint(500000, 3000000)
        thirdparties = random.randint(50, 800)
    elif scale == "medium-large":
        employees = random.randint(50, 150)
        users = random.randint(10000, 100000)
        thirdparties = random.randint(10, 100)
    else:
        employees = random.choice([0, random.randint(1, 20)])
        users = random.choice([0, random.randint(10, 5000)])
        thirdparties = random.choice([0, random.randint(1, 10)])
        
    if employees == 0 and users == 0:
        return {} # No infostealer data for this victim
        
    employees_url = employees + random.randint(5, 50)
    users_url = users + random.randint(100, 1000)
    
    # Generate stealer family distributions
    infostealer_stats = {}
    total_credentials = employees + users + thirdparties
    
    # Distribute total_credentials across families based on probabilities
    remaining = total_credentials
    for i, family in enumerate(STEALER_FAMILIES):
        if i == len(STEALER_FAMILIES) - 1:
            infostealer_stats[family] = remaining
        else:
            count = int(total_credentials * STEALER_PALETTE_PROBS[i] * random.uniform(0.7, 1.3))
            count = min(count, remaining)
            infostealer_stats[family] = count
            remaining -= count
            
    # Clean zero items
    infostealer_stats = {k: v for k, v in infostealer_stats.items() if v > 0}
    
    return {
        "employees": employees,
        "users": users,
        "thirdparties": thirdparties,
        "employees_url": employees_url,
        "users_url": users_url,
        "infostealer_stats": infostealer_stats
    }

def main():
    print("Generating high-fidelity mock data...")
    
    # 1. Generate Victims list
    victims = []
    start_date = datetime.date(2025, 1, 1)
    end_date = datetime.date(2026, 5, 21)
    date_delta = end_date - start_date
    
    # Seed for reproducibility
    random.seed(42)
    
    total_victims_count = 350
    for i in range(total_victims_count):
        # Generate random date
        random_days = random.randint(0, date_delta.days)
        attack_dt = start_date + datetime.timedelta(days=random_days)
        discovered_dt = attack_dt + datetime.timedelta(days=random.randint(0, 3))
        
        # Pick industry and country
        sector = random.choice(SECTORS)
        country = random.choice(COUNTRIES)
        group = random.choice(RANSOM_GROUPS)
        
        # Pick or generate domain
        if i < len(DOMAINS):
            domain = DOMAINS[i]
            company_name = domain.split('.')[0].capitalize()
        else:
            company_name = f"VictimCorp {i}"
            domain = f"victimcorp{i}.com"
            
        infostealer_data = generate_mock_infostealer(domain)
        
        victim_id = f"victim{i}@{group}"
        # Base64 mock representation
        import base64
        b64_id = base64.b64encode(victim_id.encode('utf-8')).decode('utf-8')
        
        has_stealer = len(infostealer_data) > 0
        
        victim_entry = {
            "id": b64_id,
            "victim": company_name,
            "group": group,
            "attackdate": attack_dt.isoformat(),
            "discovered": discovered_dt.isoformat() + "T10:00:00Z",
            "country": country,
            "activity": sector,
            "website": domain,
            "screenshot": f"https://images.ransomware.live/screenshots/{group}.png" if random.choice([True, False]) else "",
            "press": f"https://www.bleepingcomputer.com/news/security/cyberattack-disrupts-{company_name.lower()}-operations/" if random.choice([True, False, False]) else None,
            "permalink": f"https://www.ransomware.live/victim/{group}/{company_name.lower()}",
            "infostealer": infostealer_data
        }
        victims.append(victim_entry)
        
    # Sort victims by discovered date descending
    victims.sort(key=lambda x: x["discovered"], reverse=True)
    
    # Write victims.json
    with open("data/victims.json", "w") as f:
        json.dump(victims, f, indent=2)
    print(f"  Saved {len(victims)} victims to data/victims.json")
    
    # 2. Compile Summary statistics
    # Aggregate counts
    total_domains_tracked = 0
    total_employees = 0
    total_users = 0
    total_thirdparties = 0
    family_aggregates = {family: 0 for family in STEALER_FAMILIES}
    
    sector_exposure = {sector: 0 for sector in SECTORS}
    country_exposure = {country: 0 for country in COUNTRIES}
    country_totals = {country: 0 for country in COUNTRIES}
    country_with_stealer = {country: 0 for country in COUNTRIES}
    
    group_totals = {group: 0 for group in RANSOM_GROUPS}
    group_with_stealer = {group: 0 for group in RANSOM_GROUPS}
    
    monthly_ingestion = {}
    
    for v in victims:
        country = v["country"]
        sector = v["activity"]
        group = v["group"]
        
        # Country and Group totals for percentages
        country_totals[country] += 1
        group_totals[group] += 1
        
        # Ingestion over time
        discovered_date = datetime.datetime.strptime(v["discovered"][:10], "%Y-%m-%d").date()
        month_key = discovered_date.strftime("%Y-%m")
        if month_key not in monthly_ingestion:
            monthly_ingestion[month_key] = 0
            
        if v["infostealer"]:
            total_domains_tracked += 1
            is_data = v["infostealer"]
            total_employees += is_data.get("employees", 0)
            total_users += is_data.get("users", 0)
            total_thirdparties += is_data.get("thirdparties", 0)
            
            # Month count
            monthly_ingestion[month_key] += 1
            
            # Country, Sector, Group stats
            country_with_stealer[country] += 1
            group_with_stealer[group] += 1
            sector_exposure[sector] += is_data.get("employees", 0) + is_data.get("thirdparties", 0)
            country_exposure[country] += 1
            
            # Stealer family totals
            for fam, count in is_data.get("infostealer_stats", {}).items():
                if fam in family_aggregates:
                    family_aggregates[fam] += count
                else:
                    family_aggregates[fam] = count
                    
    # Format monthly ingestion sorted by month
    monthly_data = [{"month": m, "count": monthly_ingestion[m]} for m in sorted(monthly_ingestion.keys())]
    
    # Format family stats sorted by count
    family_stats = [{"name": fam, "count": family_aggregates[fam]} for fam in sorted(family_aggregates, key=family_aggregates.get, reverse=True) if family_aggregates[fam] > 0]
    
    # Format sectors exposure sorted by count
    sector_stats = [{"name": s, "count": sector_exposure[s]} for s in sorted(sector_exposure, key=sector_exposure.get, reverse=True)]
    
    # Format country absolute count
    country_stats = [{"name": c, "count": country_exposure[c]} for c in sorted(country_exposure, key=country_exposure.get, reverse=True)]
    
    # Format country percent
    country_pct_stats = []
    for c in COUNTRIES:
        total = country_totals[c]
        with_stealer = country_with_stealer[c]
        pct = (with_stealer / total * 100) if total > 0 else 0
        country_pct_stats.append({
            "name": c,
            "percent": pct,
            "total_victims": total,
            "stealer_victims": with_stealer
        })
    country_pct_stats.sort(key=lambda x: x["percent"], reverse=True)
    
    # Format group percent
    group_pct_stats = []
    for g in RANSOM_GROUPS:
        total = group_totals[g]
        with_stealer = group_with_stealer[g]
        pct = (with_stealer / total * 100) if total > 0 else 0
        group_pct_stats.append({
            "group": g,
            "percent": pct,
            "total_victims": total,
            "stealer_victims": with_stealer
        })
    group_pct_stats.sort(key=lambda x: x["percent"], reverse=True)
    
    summary = {
        "totals": {
            "domains_tracked": total_domains_tracked,
            "employees_exposed": total_employees,
            "users_exposed": total_users,
            "thirdparties_exposed": total_thirdparties,
            "stealer_families_count": len([f for f in family_aggregates.values() if f > 0])
        },
        "families": family_stats,
        "monthly": monthly_data,
        "sectors": sector_stats,
        "countries": country_stats,
        "countries_pct": country_pct_stats,
        "groups_pct": group_pct_stats
    }
    
    with open("data/summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    print("  Saved stats summary to data/summary.json")
    
    # 3. Compile Groups detailed data
    groups_detailed = {}
    for g in RANSOM_GROUPS:
        groups_detailed[g] = {
            "description": f"The {g} ransomware group is a highly sophisticated cybercriminal syndicate known for target-rich double extortion campaigns. Sourcing initial access widely, often through infostealer credential sales on underground forums.",
            "victims": group_totals[g],
            "firstseen": "2025-01-10T12:00:00Z",
            "lastseen": "2026-05-20T18:00:00Z",
            "locations": [
                {
                    "url": f"http://{g}leaksite557asd.onion",
                    "type": "onion"
                }
            ],
            "ttps": ["T1190 - Exploit Public-Facing Application", "T1078 - Valid Accounts", "T1566 - Phishing"],
            "vulnerabilities": ["CVE-2023-4966 (Citrix Bleed)", "CVE-2024-21887 (Ivanti Connect Secure)"],
            "tools": ["Cobalt Strike", "Mimikatz", f"{g}_ransom_encryptor"],
            "has_negotiations": random.choice([True, False]),
            "negotiation_count": random.randint(0, 10),
            "has_ransomnote": True,
            "ransomnotes_count": random.randint(1, 3)
        }
        
    with open("data/groups.json", "w") as f:
        json.dump(groups_detailed, f, indent=2)
    print("  Saved groups details to data/groups.json")
    
    # 4. Compile SEC 8-K filings
    sec_filings = []
    filing_companies = [
        {"ticker": "MSFT", "cik": "0000789019", "name": "MICROSOFT CORP"},
        {"ticker": "CRM", "cik": "0001108524", "name": "Salesforce, Inc."},
        {"ticker": "AAPL", "cik": "0000320193", "name": "Apple Inc."},
        {"ticker": "GOOGL", "cik": "0001652044", "name": "Alphabet Inc."},
        {"ticker": "META", "cik": "0001326801", "name": "Meta Platforms, Inc."},
        {"ticker": "ORCL", "cik": "0001341439", "name": "ORACLE CORP"},
        {"ticker": "CSCO", "cik": "0000858877", "name": "CISCO SYSTEMS, INC."},
        {"ticker": "AMD", "cik": "0000002488", "name": "ADVANCED MICRO DEVICES, INC."}
    ]
    
    for i in range(12):
        company = random.choice(filing_companies)
        filing_dt = datetime.date(2026, 1, 1) + datetime.timedelta(days=random.randint(1, 140))
        item_type = random.choice(["Item 1.05", "Item 8.01"])
        
        filings_entry = {
            "ticker": company["ticker"],
            "cik": company["cik"],
            "company_name": company["name"],
            "filing_date": filing_dt.isoformat(),
            "item_type": item_type,
            "url": f"https://www.sec.gov/Archives/edgar/data/{int(company['cik'])}/0001193125260000{i}/d8k.htm",
            "description": f"On {filing_dt.isoformat()}, the registrant discovered that unauthorized actors gained access to certain corporate systems. A threat actor (likely affiliated with {random.choice(RANSOM_GROUPS)}) was found to have compromised administrative credentials."
        }
        sec_filings.append(filings_entry)
        
    sec_filings.sort(key=lambda x: x["filing_date"], reverse=True)
    with open("data/sec8k.json", "w") as f:
        json.dump(sec_filings, f, indent=2)
    print("  Saved SEC filings to data/sec8k.json")
    
    print("\nMock data generation complete!")
    print("Run this to regenerate stats whenever victims are modified.")

if __name__ == "__main__":
    main()
