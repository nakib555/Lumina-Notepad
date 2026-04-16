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
      document.execCommand('formatBlock', false, 'BLOCKQUOTE');
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
      if (url) document.execCommand('insertImage', false, url);
    } else if (prefix === "\n---\n") {
      document.execCommand('insertHorizontalRule', false, '');
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
      const tableHTML = `<div class="overflow-x-auto w-full table-wrapper my-8"><table class="w-full m-0"><thead><tr><th>Header</th><th>Header</th></tr></thead><tbody><tr><td>Cell</td><td>Cell</td></tr></tbody></table></div><p><br></p>`;
      document.execCommand('insertHTML', false, tableHTML);
    } else if (prefix === "```\n") {
      const codeHTML = `
<div class="code-block-wrapper border border-slate-200 rounded-xl my-6 overflow-hidden not-prose shadow-sm" contenteditable="false">
  <div class="bg-slate-50 px-4 py-2.5 flex justify-between items-center border-b border-slate-200">
    <span class="text-xs font-bold text-slate-500 tracking-wider uppercase language-label">CODE</span>
    <button class="bg-white border border-slate-200 text-indigo-500 px-3 py-1 rounded-md text-xs font-medium shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all active:scale-95 copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.querySelector('code').textContent); this.textContent='Copied!'; setTimeout(() => this.textContent='Source', 2000);">Source</button>
  </div>
  <div class="flex bg-[#f8fafc] m-0 items-stretch">
    <div class="line-numbers py-4 pl-4 pr-3 text-right text-slate-400 select-none font-mono text-[13px] leading-[1.6] min-w-[3rem] italic border-r border-slate-200/50">
      1
    </div>
    <pre class="py-4 px-0 overflow-x-auto m-0 w-full"><code class="hljs bg-transparent px-4 py-0 text-[13px] leading-[1.6] font-mono text-slate-800 border-none outline-none block" contenteditable="true" oninput="this.parentElement.previousElementSibling.innerHTML = Array.from({ length: (this.innerText.match(/\\n/g) || []).length + 1 }, (_, i) => i + 1).join('<br/>')">// Your code here...</code></pre>
  </div>
</div><p><br></p>`;
      document.execCommand('insertHTML', false, codeHTML);
    } else {
      document.execCommand('insertText', false, prefix);
    }
  }, []);

  const applyFontSize = useCallback((size: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const isCollapsed = selection.isCollapsed;
    
    // Use execCommand to apply a temporary font size
    document.execCommand('fontSize', false, '7');
    
    // Find the created font elements and replace them with spans
    const fontElements = document.getElementsByTagName('font');
    for (let i = fontElements.length - 1; i >= 0; i--) {
      const fontEl = fontElements[i];
      if (fontEl.getAttribute('size') === '7') {
        fontEl.removeAttribute('size');
        
        // Change <font> to <span>
        const span = document.createElement('span');
        span.style.fontSize = `${size}pt`;
        
        if (isCollapsed && !fontEl.innerHTML) {
          span.innerHTML = '&#8203;'; // Zero-width space to allow typing inside
        } else {
          span.innerHTML = fontEl.innerHTML;
        }
        
        if (fontEl.parentNode) {
          fontEl.parentNode.replaceChild(span, fontEl);
        }
        
        if (isCollapsed) {
          const range = document.createRange();
          range.selectNodeContents(span);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
    
    // Trigger input event to sync with React state
    if (textareaRef.current) {
      textareaRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, [textareaRef]);

  return {
    applyFormatting,
    applyFontSize
  };
};
