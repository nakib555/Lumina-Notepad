import { useCallback } from 'react';
import { Note } from '@/hooks/use-notes';

export const useEditorFormatting = (
  note: Note | null,
  onUpdateNote: (id: string, updates: Partial<Note>) => void,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  addToHistory: (title: string, content: string, immediate?: boolean) => void,
  setSlashMenuOpen: React.Dispatch<React.SetStateAction<boolean>>,
  isPreviewMode: boolean = false
) => {
  const applyFormatting = useCallback((prefix: string, suffix: string = "", toggle: boolean = true) => {
    if (isPreviewMode) {
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
        const tableHTML = `<table class="w-full border-collapse border border-border my-4"><thead><tr><th class="border border-border p-2">Header</th><th class="border border-border p-2">Header</th></tr></thead><tbody><tr><td class="border border-border p-2">Cell</td><td class="border border-border p-2">Cell</td></tr></tbody></table><p><br></p>`;
        document.execCommand('insertHTML', false, tableHTML);
      } else {
        document.execCommand('insertText', false, prefix);
      }
      return;
    }

    if (!textareaRef.current || !note) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = note.content;
    
    const selectedText = text.substring(start, end);
    
    if (start !== end && !selectedText.trim() && suffix) {
      return; // Don't apply inline formatting to empty space
    }
    
    let newContent = "";
    let newStart = start;
    let newEnd = end;

    const beforeSelection = text.substring(0, start);
    const afterSelection = text.substring(end);

    let actualPrefix = prefix;
    const isAtStartOfLine = beforeSelection === '' || beforeSelection.endsWith('\n');
    
    if (prefix.startsWith('\n')) {
      if (isAtStartOfLine) {
        actualPrefix = prefix.substring(1);
      } else if (beforeSelection.endsWith(prefix.substring(1))) {
        const beforePrefix = beforeSelection.slice(0, -(prefix.length - 1));
        if (beforePrefix === '' || beforePrefix.endsWith('\n')) {
          actualPrefix = prefix.substring(1);
        }
      }
    }

    let removePrefixOutside = "";
    if (beforeSelection.endsWith(prefix)) {
      removePrefixOutside = prefix;
    } else if (beforeSelection.endsWith(actualPrefix)) {
      removePrefixOutside = actualPrefix;
    }

    let removePrefixInside = "";
    if (selectedText.startsWith(prefix)) {
      removePrefixInside = prefix;
    } else if (selectedText.startsWith(actualPrefix)) {
      removePrefixInside = actualPrefix;
    }

    if (
      toggle && removePrefixOutside && suffix &&
      afterSelection.startsWith(suffix)
    ) {
      // Remove formatting from outside selection
      newContent = beforeSelection.slice(0, -removePrefixOutside.length) + selectedText + afterSelection.slice(suffix.length);
      newStart = start - removePrefixOutside.length;
      newEnd = end - removePrefixOutside.length;
    } else if (
      toggle && removePrefixOutside && !suffix
    ) {
      // Remove prefix from outside selection
      newContent = beforeSelection.slice(0, -removePrefixOutside.length) + selectedText + afterSelection;
      newStart = start - removePrefixOutside.length;
      newEnd = end - removePrefixOutside.length;
    } else if (
      toggle && removePrefixInside && suffix &&
      selectedText.endsWith(suffix)
    ) {
      // Remove formatting from inside selection
      const innerText = selectedText.slice(removePrefixInside.length, -suffix.length);
      newContent = beforeSelection + innerText + afterSelection;
      newStart = start;
      newEnd = end - removePrefixInside.length - suffix.length;
    } else if (
      toggle && removePrefixInside && !suffix
    ) {
      // Remove prefix from inside selection
      const innerText = selectedText.slice(removePrefixInside.length);
      newContent = beforeSelection + innerText + afterSelection;
      newStart = start;
      newEnd = end - removePrefixInside.length;
    } else {
      // Add formatting
      newContent = beforeSelection + actualPrefix + selectedText + suffix + afterSelection;
      newStart = start + actualPrefix.length;
      newEnd = end + actualPrefix.length;
    }
    
    onUpdateNote(note.id, { content: newContent });
    addToHistory(note.title, newContent, true);
    
    // Reset focus and cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  }, [note, onUpdateNote, textareaRef, addToHistory, isPreviewMode]);

  const applyFontSize = useCallback((size: string) => {
    if (isPreviewMode) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const text = selection.toString();
        if (!text.trim()) return;
        
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = `${size}pt`;
        span.appendChild(range.extractContents());
        range.insertNode(span);
      }
      return;
    }

    if (!textareaRef.current || !note) return;
    
    const textarea = textareaRef.current;
    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;
    
    if (start === end) return;
    
    const text = note.content;
    const initialSelectedText = text.substring(start, end);
    
    if (!initialSelectedText.trim()) return;
    
    // Expand selection to include any overlapping tags
    // Find all tags in the text
    const tagRegex = /\[(.*?)\]\{([^}]+)\}/g;
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
      const tagStart = match.index;
      const tagEnd = tagStart + match[0].length;
      
      // Check if selection overlaps with this tag
      let overlaps = false;
      if (start === end) {
        overlaps = start > tagStart && start < tagEnd;
      } else {
        overlaps = start < tagEnd && end > tagStart;
      }

      if (overlaps) {
        // Expand selection to include this tag
        if (tagStart < start) start = tagStart;
        if (tagEnd > end) end = tagEnd;
      }
    }

    const selectedText = text.substring(start, end);

    // Check if selectedText is a full tag `[text]{size}`
    const fullTagMatch = selectedText.match(/^\[(.*?)\]\{([^}]+)\}$/);
    let innerText = selectedText;
    if (fullTagMatch) {
      innerText = fullTagMatch[1];
    } else {
      // Remove any complete tags inside the selection
      innerText = selectedText.replace(/\[(.*?)\]\{([^}]+)\}/g, '$1');
    }
    
    const prefix = `[`;
    const suffix = `]{${size}pt}`;
    const newContent = text.substring(0, start) + prefix + innerText + suffix + text.substring(end);
    
    onUpdateNote(note.id, { content: newContent });
    addToHistory(note.title, newContent, true);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + innerText.length);
    }, 0);
  }, [note, onUpdateNote, textareaRef, addToHistory, isPreviewMode]);

  const executeSlashCommand = useCallback((prefix: string, suffix: string = "") => {
    if (!textareaRef.current || !note) return;
    
    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const text = note.content;
    
    // Find the slash that triggered the menu
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    if (lastSlashIndex !== -1) {
      const newContent = text.substring(0, lastSlashIndex) + prefix + suffix + text.substring(cursorPosition);
      
      onUpdateNote(note.id, { content: newContent });
      addToHistory(note.title, newContent, true);
      
      setTimeout(() => {
        textarea.focus();
        // Position cursor between prefix and suffix if suffix exists, else after prefix
        const newCursorPos = lastSlashIndex + prefix.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
    
    setSlashMenuOpen(false);
  }, [note, onUpdateNote, textareaRef, addToHistory, setSlashMenuOpen]);

  return {
    applyFormatting,
    applyFontSize,
    executeSlashCommand
  };
};
