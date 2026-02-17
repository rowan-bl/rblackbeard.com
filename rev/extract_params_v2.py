import re

file_path = r'c:\github\DMIT-2018\rblackbeard.com\rev\bundle.js'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Look for arrays or objects containing these keywords
keywords = ['Clay', 'Hard', 'Grass', 'Carpet', 'Outdoor', 'Indoor']

print("Context Extraction for Surfaces/Environments:")
for kw in keywords:
    print(f"\n--- {kw} ---")
    indices = [m.start() for m in re.finditer(re.escape(kw), content, re.IGNORECASE)]
    for i in indices:
        start = max(0, i - 100)
        end = min(len(content), i + 100)
        snippet = content[start:end]
        # Only print if it looks like code/structure, not just text
        if '[' in snippet or '{' in snippet or ':' in snippet:
             print(f"...{snippet}...")
