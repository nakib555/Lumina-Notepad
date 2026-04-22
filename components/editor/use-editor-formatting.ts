import { useCallback } from 'react';
import { Note } from '@/hooks/use-notes';

export const useEditorFormatting = (
  note: Note | null,
  onUpdateNote: (id: string, updates: Partial<Note>) => void,
  textareaRef: React.RefObject<HTMLDivElement | null>
) => {
  const applyFormatting = useCallback((prefix: string) => {
    const commandMap: Record<string, string> = {
      "**": "bold",
      "*": "italic",
      "<u>": "underline",
      "~~": "strikeThrough",
      "<sub>": "subscript",
      "<sup>": "superscript",
    };
    
    if (commandMap[prefix]) {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && !selection.toString().trim()) {
        return;
      }
      document.execCommand(commandMap[prefix], false, '');
    } else if (prefix === '<div align="left">\n\n') {
      document.execCommand('justifyLeft', false, '');
    } else if (prefix === '<div align="center">\n\n') {
      document.execCommand('justifyCenter', false, '');
    } else if (prefix === '<div align="right">\n\n') {
      document.execCommand('justifyRight', false, '');
    } else if (prefix === "\n> ") {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        document.execCommand('formatBlock', false, 'BLOCKQUOTE');
      } else {
        document.execCommand('insertHTML', false, `<blockquote class="border-l-4 border-primary/40 bg-muted/20 px-6 py-3 italic text-muted-foreground rounded-r-lg"><p>&#8203;</p></blockquote><p>&#8203;</p>`);
      }
    } else if (prefix === "\n- ") {
      document.execCommand('insertUnorderedList', false, '');
    } else if (prefix === "\n1. ") {
      document.execCommand('insertOrderedList', false, '');
    } else if (prefix.startsWith("\n#")) {
      const level = prefix.trim().length;
      document.execCommand('formatBlock', false, `H${level}`);
    } else if (prefix === "[") {
      const url = prompt("Enter link URL:");
      if (url) document.execCommand('createLink', false, url);
    } else if (prefix === "![alt](") {
      const url = prompt("Enter image URL:");
      if (url) {
        const imgHTML = `<span class="image-wrapper block relative max-w-full my-4"><img src="${url}" alt="image" class="rounded-lg max-w-full h-auto cursor-pointer border border-transparent hover:border-indigo-500 transition-colors" /></span><p>&#8203;</p>`;
        document.execCommand('insertHTML', false, imgHTML);
      }
    } else if (prefix === "\n---\n") {
      document.execCommand('insertHorizontalRule', false, '');
      document.execCommand('insertHTML', false, '<p>&#8203;</p>');
    } else if (prefix === "`") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const text = selection.toString();
        if (!text.trim()) return;
        
        const range = selection.getRangeAt(0);
        const code = document.createElement('code');
        code.appendChild(range.extractContents());
        range.insertNode(code);
      }
    } else if (prefix === "\n- [ ] ") {
      const taskHTML = `<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" disabled /> </li></ul>`;
      document.execCommand('insertHTML', false, taskHTML);
    } else if (prefix.includes("| Header |")) {
      const tableHTML = `<div class="overflow-x-auto w-full table-wrapper my-8"><table class="w-full m-0"><thead><tr><th>Header</th><th>Header</th></tr></thead><tbody><tr><td>Cell</td><td>Cell</td></tr></tbody></table></div><p>&#8203;</p>`;
      document.execCommand('insertHTML', false, tableHTML);
    } else if (prefix.match(/^```[a-zA-Z0-9-]*\n$/)) {
      const match = prefix.match(/^```([a-zA-Z0-9-]*)\n$/);
      const langRaw = match ? match[1] : '';
      const displayLang = langRaw ? langRaw.charAt(0).toUpperCase() + langRaw.slice(1) : 'Code';
      
      const codeHTML = `
<div class="code-block-wrapper border border-[#e5e7eb] dark:border-[#374151] rounded-md my-4 overflow-hidden not-prose shadow-sm" contenteditable="false">
  <div class="bg-[#f8f9fa] dark:bg-[#1f2937] border-b border-[#e5e7eb] dark:border-[#374151] px-4 py-2 flex justify-between items-center text-[13px]">
    <div class="font-semibold text-[#6366f1] dark:text-[#818cf8] language-label flex items-center">
      ${displayLang}
    </div>
    <div class="flex items-center gap-4">
      <button class="flex items-center gap-1 text-[#6366f1] dark:text-[#818cf8] hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer">
        <span class="text-xs">»</span> Open
      </button>
      <button class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity bg-transparent border-none cursor-pointer copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('.code-element').textContent); const span = this.querySelector('.copy-text'); span.textContent='Copied'; setTimeout(() => span.textContent='Copy', 2000);">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span class="copy-text">Copy</span>
      </button>
      <button class="flex items-center gap-1.5 text-slate-400 hover:text-red-500 transition-opacity bg-transparent border-none cursor-pointer delete-btn" onclick="const wrapper = this.closest('.code-block-wrapper'); const next = wrapper.nextElementSibling; if(next && next.tagName === 'P' && next.innerHTML.includes('&#8203;')) next.remove(); wrapper.remove();" title="Delete code block">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
    </div>
  </div>
  <div class="bg-[#f4f7f9] dark:bg-[#0d1117] overflow-x-auto w-full code-container m-0 text-slate-800 dark:text-slate-200">
    <pre style="margin:0;padding:1rem 1.25rem;font-size:13px;line-height:1.5;font-family:'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;background:transparent;"><code class="code-element outline-none block min-h-[20px] whitespace-pre [font-variant-ligatures:none]" contenteditable="plaintext-only">// Your code here...</code></pre>
  </div>
</div>
<p>&#8203;</p>`;
      document.execCommand('insertHTML', false, codeHTML);
    } else {
      document.execCommand('insertText', false, prefix);
    }
    textareaRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
  }, [textareaRef]);

  const applyFontSize = useCallback((size: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const isCollapsed = selection.isCollapsed;
    
    // Use a unique font name to reliably find the wrapped elements
    const tempFontName = `__temp_font_${Date.now()}__`;
    document.execCommand('fontName', false, tempFontName);
    
    // Find all elements with this temporary font family
    const elements = document.querySelectorAll(`[style*="${tempFontName}"], font[face="${tempFontName}"]`);
    
    if (elements.length === 0 && !isCollapsed) {
       // fallback if execCommand failed
       document.execCommand('fontSize', false, '7');
       const fontElements = document.getElementsByTagName('font');
       for (let i = fontElements.length - 1; i >= 0; i--) {
         if (fontElements[i].getAttribute('size') === '7') {
             const span = document.createElement('span');
             span.style.fontSize = `${size}pt`;
             span.innerHTML = fontElements[i].innerHTML;
             fontElements[i].parentNode?.replaceChild(span, fontElements[i]);
         }
       }
    } else {
      elements.forEach((el) => {
        const span = document.createElement('span');
        span.style.fontSize = `${size}pt`;
        
        if (isCollapsed && !el.innerHTML) {
          span.innerHTML = '&#8203;'; // Zero-width space to allow typing inside
        } else {
          span.innerHTML = el.innerHTML;
        }
        
        el.parentNode?.replaceChild(span, el);
        
        if (isCollapsed) {
          const range = document.createRange();
          range.selectNodeContents(span);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      });
    }
    
    // Trigger input event to sync with React state
    if (textareaRef.current) {
      textareaRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, [textareaRef]);

  const clearFormatting = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    // Use built-in removeFormat command
    document.execCommand('removeFormat', false, '');

    // For any remaining styled spans (like font-size), we can unwrap them manually
    // The previous removeFormat should remove most inline styles in standard contenteditable
    
    // Also remove block-level formatting like align or H1-H6 inside the selected range
    const tempFontName = `__temp_clear_${Date.now()}__`;
    document.execCommand('fontName', false, tempFontName);
    
    // Find wrapped elements
    const elements = document.querySelectorAll(`[style*="${tempFontName}"], font[face="${tempFontName}"]`);
    
    elements.forEach(el => {
       // Look up the tree for block elements (H1-H6, BLOCKQUOTE, PRE, DIV with align)
       let current = el.parentElement;
       const editor = textareaRef.current;
       while (current && current !== editor) {
         if (/^(H[1-6]|BLOCKQUOTE|PRE)$/i.test(current.tagName)) {
           // Swap it for a P tag by moving nodes to preserve references
           const p = document.createElement('p');
           while (current.firstChild) {
             p.appendChild(current.firstChild);
           }
           current.parentNode?.replaceChild(p, current);
           current = p; // Continue up from the p tag
         } else if (current.tagName === 'DIV' && (current.getAttribute('align') || current.style.textAlign)) {
           current.removeAttribute('align');
           current.style.textAlign = '';
         } else if (current.tagName === 'SPAN') {
             // Remove styles on span
             current.removeAttribute('style');
             if (current.className.includes('katex')) {
                 // Convert katex back
             }
         }
         current = current.parentElement;
       }
       
       // remove the temporary font wrapper
       const parent = el.parentNode;
       while(el.firstChild) {
         parent?.insertBefore(el.firstChild, el);
       }
       parent?.removeChild(el);
    });

    if (textareaRef.current) {
      textareaRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, [textareaRef]);

  return {
    applyFormatting,
    applyFontSize,
    clearFormatting
  };
};
