import { useState, useCallback, useEffect, useRef } from 'react';
import { Note } from '@/hooks/use-notes';
import { HistoryItem } from './utils';

export const useEditorHistory = (note: Note | null, onUpdateNote: (id: string, updates: Partial<Note>) => void) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);

  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  // Reset history when note changes
  useEffect(() => {
    if (note && (history.length === 0 || history[historyIndex]?.title !== note.title)) {
      const initialHistory = [{ title: note.title, content: note.content }];
      setHistory(initialHistory);
      setHistoryIndex(0);
      historyRef.current = initialHistory;
      historyIndexRef.current = 0;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addToHistory = useCallback((title: string, content: string, immediate = false) => {
    setSaveStatus("saving");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const performAdd = () => {
      const currentIndex = historyIndexRef.current;
      const currentHistory = historyRef.current;
      const lastItem = currentHistory[currentIndex];
      
      if (lastItem && lastItem.title === title && lastItem.content === content) {
        setSaveStatus("saved");
        return;
      }
      
      const newHistory = currentHistory.slice(0, currentIndex + 1);
      newHistory.push({ title, content });
      
      const finalHistory = newHistory.length > 100 ? newHistory.slice(newHistory.length - 100) : newHistory;
      
      historyRef.current = finalHistory;
      historyIndexRef.current = finalHistory.length - 1;
      
      setHistory(finalHistory);
      setHistoryIndex(finalHistory.length - 1);
      setSaveStatus("saved");
    };

    if (immediate) {
      performAdd();
    } else {
      debounceTimerRef.current = setTimeout(performAdd, 1000);
    }
  }, []);

  const handleUndo = useCallback(() => {
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    
    if (currentIndex > 0 && note) {
      const prevItem = currentHistory[currentIndex - 1];
      onUpdateNote(note.id, { title: prevItem.title, content: prevItem.content });
      
      historyIndexRef.current = currentIndex - 1;
      setHistoryIndex(currentIndex - 1);
    }
  }, [note, onUpdateNote]);

  const handleRedo = useCallback(() => {
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    
    if (currentIndex < currentHistory.length - 1 && note) {
      const nextItem = currentHistory[currentIndex + 1];
      onUpdateNote(note.id, { title: nextItem.title, content: nextItem.content });
      
      historyIndexRef.current = currentIndex + 1;
      setHistoryIndex(currentIndex + 1);
    }
  }, [note, onUpdateNote]);

  return {
    history,
    historyIndex,
    saveStatus,
    addToHistory,
    handleUndo,
    handleRedo
  };
};
