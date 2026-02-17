import re

file_path = r'c:\github\DMIT-2018\rblackbeard.com\rev\bundle.js'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Patterns to look for
patterns = {
    'TournamentApi Methods': r'TournamentApi/([a-zA-Z0-9_]+)',
    'Any Get Methods': r'["\'](Get[a-zA-Z0-9_]+)["\']',
    'Possible Live Endpoints': r'["\']([^"\']*(?:Live|Score)[^"\']*)["\']',
    'JSON Properties': r'([a-zA-Z0-9_]+):',
}

print("Scan Results:")
for label, pattern in patterns.items():
    matches = re.findall(pattern, content)
    unique_matches = sorted(list(set(matches)))
    print(f"\n--- {label} ---")
    # filtered print
    for m in unique_matches:
        if len(m) < 50:
            if label == 'Any Get Methods' and len(m) < 4: continue 
            print(m)
