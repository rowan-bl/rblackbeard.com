import re

file_path = r'c:\github\DMIT-2018\rblackbeard.com\rev\bundle.js'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

keywords = [
    'TournamentApi/GetTieMatches'
]

print("Context Extraction:")
for kw in keywords:
    print(f"\n--- {kw} ---")
    indices = [m.start() for m in re.finditer(re.escape(kw), content)]
    for i in indices:
        start = max(0, i - 100)
        end = min(len(content), i + 300)
        snippet = content[start:end]
        print(f"...{snippet}...")
