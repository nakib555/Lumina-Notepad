import sys, re

with open('components/editor/editor-area.tsx', 'r') as f:
    text = f.read()

replacement1 = """return `<div class="code-block-wrapper not-prose my-6" contenteditable="false">
  <div class="rounded-xl font-sans group transition-colors duration-300 border border-border relative overflow-hidden bg-muted/10">
    <div class="sticky top-0 z-10 flex justify-between items-center px-5 py-2.5 border-b border-border select-none bg-muted/30">
      <div class="flex items-center gap-3">
        <span class="text-[13px] font-semibold text-muted-foreground font-mono capitalize language-label">
          ${displayLang}
        </span>
      </div>
      <div class="flex items-center gap-4">
        <button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium transition-all text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400" title="Run Code">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          Run
        </button>
        <button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-purple-600 hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-400 transition-all" title="Open in Side Panel">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          Open
        </button>
        <button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all active:scale-95 copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('.code-element').textContent); const span = this.querySelector('.copy-text'); span.textContent='Copied'; setTimeout(() => span.textContent='Copy', 2000);" title="Copy code">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span class="copy-text">Copy</span>
        </button>
        <button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 delete-btn" onclick="const wrapper = this.closest('.code-block-wrapper'); const next = wrapper.nextElementSibling; if(next && next.tagName === 'P' && next.innerHTML.includes('&#8203;')) next.remove(); wrapper.remove();" title="Delete code block">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    </div>
    <div class="relative overflow-x-auto text-[14px] leading-relaxed custom-scrollbar bg-transparent code-container whitespace-pre print:whitespace-pre-wrap font-mono m-0 text-slate-800 dark:text-slate-200">
      ${highlightedContent}
    </div>
  </div>
</div>`;
"""

replacement2 = """                  finalHtml += `<div class="code-block-wrapper not-prose my-6" contenteditable="false">
  <div class="rounded-xl font-sans group transition-colors duration-300 border border-border relative overflow-hidden bg-muted/10">
    <div class="sticky top-0 z-10 flex justify-between items-center px-5 py-2.5 border-b border-border select-none bg-muted/30">
      <div class="flex items-center gap-3">
        <span class="text-[13px] font-semibold text-muted-foreground font-mono capitalize language-label">
          ${part.language}
        </span>
      </div>
      <div class="flex items-center gap-4">
        <button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium transition-all text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400" title="Run Code">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          Run
        </button>
        <button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-purple-600 hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-400 transition-all" title="Open in Side Panel">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          Open
        </button>
        <button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all active:scale-95 copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('.code-element').textContent); const span = this.querySelector('.copy-text'); span.textContent='Copied'; setTimeout(() => span.textContent='Copy', 2000);" title="Copy code">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span class="copy-text">Copy</span>
        </button>
        <button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 delete-btn" onclick="const wrapper = this.closest('.code-block-wrapper'); const next = wrapper.nextElementSibling; if(next && next.tagName === 'P' && next.innerHTML.includes('&#8203;')) next.remove(); wrapper.remove();" title="Delete code block">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    </div>
    <div class="relative overflow-x-auto text-[14px] leading-relaxed custom-scrollbar bg-transparent code-container whitespace-pre print:whitespace-pre-wrap font-mono m-0 text-slate-800 dark:text-slate-200">
      ${codeHtml}
    </div>
  </div>
</div>`;"""

# Target 1: around line 170
old1_start = text.find('return `<div class="code-block-wrapper border border-[#e5e7eb]')
old1_end = text.find('</div>`;', old1_start) + 8

# Target 2: around line 2311
old2_start = text.find('finalHtml += `<div class="code-block-wrapper border border-[#e5e7eb]')
old2_end = text.find('</div>`;', old2_start) + 8

text = text[:old1_start] + replacement1 + text[old1_end:old2_start] + replacement2 + text[old2_end:]

with open('components/editor/editor-area.tsx', 'w') as f:
    f.write(text)
