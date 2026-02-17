import re

file_path = r'c:\github\DMIT-2018\rblackbeard.com\rev\bundle.js'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Patterns to look for
patterns = {
    'Absolute URLs': r'["\'](https?://[^"\']+)["\']',
    'API Paths': r'["\'](/api/[^"\']+)["\']',
    'Specific Keywords': r'["\']([^"\']*(?:OrderOfPlay|Draw|Schedule|Live|TournamentKey)[^"\']*)["\']',
}

print("Scan Results:")
for label, pattern in patterns.items():
    matches = re.findall(pattern, content, re.IGNORECASE)
    unique_matches = sorted(list(set(matches)))
    print(f"\n--- {label} ---")
    for m in unique_matches:
        # Filter out some noise if needed, keeping it broad for now
        if len(m) < 200: 
            print(m)
