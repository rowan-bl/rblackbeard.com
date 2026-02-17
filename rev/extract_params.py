import re

file_path = r'c:\github\DMIT-2018\rblackbeard.com\rev\bundle.js'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

patterns = {
    'Circuit Codes': r'circuitCode["\']?:\s*["\']([^"\']+)["\']',
    'Surface Codes': r'surfaceCode["\']?:\s*["\']([^"\']+)["\']',
    'Zone Codes': r'zoneCode["\']?:\s*["\']([^"\']+)["\']',
    'Possible Lists': r'\[\s*["\'](Clay|Hard|Grass|Carpet)["\']',
    'Gender/Category': r'["\'](MT|WT|JT|VT)["\']',
}

print("Scan Results:")
for label, pattern in patterns.items():
    matches = re.findall(pattern, content, re.IGNORECASE)
    unique_matches = sorted(list(set(matches)))
    print(f"\n--- {label} ---")
    for m in unique_matches:
        if len(m) < 50:
             print(m)
