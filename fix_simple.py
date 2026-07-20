import re

with open('components/editor/editor-area.tsx', 'r') as f:
    text = f.read()

s1 = 'return `<div class="code-block-wrapper border border-[#e5e7eb]'
i1 = text.find(s1)
if i1 != -1:
    print("Found s1 at", i1)
else:
    print("s1 not found!")

s2 = 'finalHtml += `<div class="code-block-wrapper border border-[#e5e7eb]'
i2 = text.find(s2)
if i2 != -1:
    print("Found s2 at", i2)
else:
    print("s2 not found!")
