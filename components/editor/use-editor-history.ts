import { useState, useCallback, useEffect, useRef } from 'react';
import { Note } from '@/hooks/use-notes';
import { HistoryItem } from './utils';

export const useEditorHistory = (note: Note | null, onUpdateNote: (id: string, updates: Partial<Note>) => void) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  // Reset history when note changes
  useEffect(() => {
    if (note && (history.length === 0 || history[historyIndex]?.title !== note.title)) {
      setHistory([{ title: note.title, content: note.content }]);
      setHistoryIndex(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const historyIndexRef = useRef(historyIndex);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const addToHistory = useCallback((title: string, content: string, immediate = false) => {
    setSaveStatus("saving");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const performAdd = () => {
      setHistory(prev => {
        const currentIndex = historyIndexRef.current;
        const lastItem = prev[currentIndex];
        
        if (lastItem && lastItem.title === title && lastItem.content === content) {
          return prev;
        }
        
        const newHistory = prev.slice(0, currentIndex + 1);
        newHistory.push({ title, content });
        
        const finalHistory = newHistory.length > 100 ? newHistory.slice(newHistory.length - 100) : newHistory;
        
        setHistoryIndex(finalHistory.length - 1);
        return finalHistory;
      });
      setSaveStatus("saved");
    };

    if (immediate) {
      performAdd();
    } else {
      debounceTimerRef.current = setTimeout(performAdd, 1000);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && note) {
      const prevItem = history[historyIndex - 1];
      onUpdateNote(note.id, { title: prevItem.title, content: prevItem.content });
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, note, onUpdateNote]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1 && note) {
      const nextItem = history[historyIndex + 1];
      onUpdateNote(note.id, { title: nextItem.title, content: nextItem.content });
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, note, onUpdateNote]);

  return {
    history,
    historyIndex,
    saveStatus,
    addToHistory,
    handleUndo,
    handleRedo
  };
};
