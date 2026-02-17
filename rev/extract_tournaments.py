import re

file_path = r'c:\github\DMIT-2018\rblackbeard.com\rev\bundle.js'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Patterns to look for
patterns = {
    'Tournament List/Calendar': r'["\']([^"\']*(?:GetCalendar|GetTournaments|TournamentList|Search)[^"\']*)["\']',
    'Filter Parameters': r'["\']([^"\']*(?:gender|circuit|category|dateRange|startdate|enddate)[^"\']*)["\']',
}

print("Scan Results:")
for label, pattern in patterns.items():
    matches = re.findall(pattern, content, re.IGNORECASE)
    unique_matches = sorted(list(set(matches)))
    print(f"\n--- {label} ---")
    for m in unique_matches:
        if len(m) < 100:
             # Filtering out some noise
            if "Get" in m or "api" in m or "filter" in m.lower():
                print(m)
