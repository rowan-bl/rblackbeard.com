import re

file_path = r'c:\github\DMIT-2018\rblackbeard.com\rev\bundle.js'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

keywords = ['M15', 'M25', 'W15', 'W25', 'W35', 'W50', 'W75', 'W100', 'J30', 'J60', 'J100', 'J200', 'J300', 'J500']

print("Category Code Search:")
for kw in keywords:
    print(f"\n--- {kw} ---")
    indices = [m.start() for m in re.finditer(re.escape(kw), content, re.IGNORECASE)]
    for i in indices:
        start = max(0, i - 50)
        end = min(len(content), i + 50)
        snippet = content[start:end]
        print(f"...{snippet}...")
