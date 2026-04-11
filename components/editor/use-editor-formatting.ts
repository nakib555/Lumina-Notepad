import { useCallback } from 'react';
import { Note } from '@/hooks/use-notes';

export const useEditorFormatting = (
  note: Note | null,
  onUpdateNote: (id: string, updates: Partial<Note>) => void,
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  addToHistory: (title: string, content: string, immediate?: boolean) => void,
  setSlashMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const applyFormatting = useCallback((prefix: string, suffix: string = "") => {
    if (!textareaRef.current || !note) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = note.content;
    
    const selectedText = text.substring(start, end);
    const newContent = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    
    onUpdateNote(note.id, { content: newContent });
    addToHistory(note.title, newContent, true);
    
    // Reset focus and cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }, [note, onUpdateNote, textareaRef, addToHistory]);

  const applyFontSize = useCallback((size: string) => {
    applyFormatting(`[`, `]{${size}px}`);
  }, [applyFormatting]);

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
