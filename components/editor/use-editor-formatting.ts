import { useCallback } from 'react';
import { Note } from '@/hooks/use-notes';

export const useEditorFormatting = (
  note: Note | null,
  onUpdateNote: (id: string, updates: Partial<Note>) => void,
  textareaRef: React.RefObject<HTMLDivElement | null>,
  addToHistory: (title: string, content: string, immediate?: boolean) => void
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
      const tableHTML = `<div class="overflow-x-auto w-full"><table class="w-full"><thead><tr><th>Header</th><th>Header</th></tr></thead><tbody><tr><td>Cell</td><td>Cell</td></tr></tbody></table></div><p><br></p>`;
      document.execCommand('insertHTML', false, tableHTML);
    } else if (prefix === "```\n") {
      const codeHTML = `<pre><code>// Your code here...</code></pre><p><br></p>`;
      document.execCommand('insertHTML', false, codeHTML);
    } else {
      document.execCommand('insertText', false, prefix);
    }
  }, []);

  const applyFontSize = useCallback((size: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const text = selection.toString();
      if (!text.trim()) return;
      
      // Use execCommand to apply a temporary font size
      document.execCommand('fontSize', false, '7');
      
      // Find the created font elements and replace them with spans
      const fontElements = document.getElementsByTagName('font');
      for (let i = fontElements.length - 1; i >= 0; i--) {
        const fontEl = fontElements[i];
        if (fontEl.getAttribute('size') === '7') {
          fontEl.removeAttribute('size');
          fontEl.style.fontSize = `${size}pt`;
          
          // Change <font> to <span>
          const span = document.createElement('span');
          span.style.fontSize = `${size}pt`;
          span.innerHTML = fontEl.innerHTML;
          fontEl.parentNode?.replaceChild(span, fontEl);
        }
      }
      
      // Trigger input event to sync with React state
      if (textareaRef.current) {
        textareaRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, [textareaRef]);

  return {
    applyFormatting,
    applyFontSize
  };
};
