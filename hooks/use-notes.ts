import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface SmartFolderRule {
  type: 'tag' | 'keyword' | 'date';
  operator: 'contains' | 'equals' | 'after' | 'before';
  value: string;
}

export interface SmartFolder {
  id: string;
  name: string;
  rules: SmartFolderRule[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folderId?: string;
  updatedAt: number;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(() => {
    if (typeof window !== 'undefined') {
      const savedNotes = localStorage.getItem('lumina-notes');
      if (savedNotes) {
        try {
          const parsed = JSON.parse(savedNotes);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error('Failed to parse notes', e);
        }
      }
    }
    return [{
      id: uuidv4(),
      title: 'Welcome to Lumina Notes',
      content: 'Start typing here...\n\nYour notes are automatically saved to your browser.',
      tags: ['getting-started'],
      updatedAt: Date.now(),
    }];
  });

  const [smartFolders, setSmartFolders] = useState<SmartFolder[]>(() => {
    if (typeof window !== 'undefined') {
      const savedSmartFolders = localStorage.getItem('lumina-smart-folders');
      if (savedSmartFolders) {
        try {
          return JSON.parse(savedSmartFolders);
        } catch (e) {
          console.error('Failed to parse smart folders', e);
        }
      }
    }
    return [];
  });

  const [activeNoteId, setActiveNoteId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const savedNotes = localStorage.getItem('lumina-notes');
      if (savedNotes) {
        try {
          const parsed = JSON.parse(savedNotes);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0].id;
          }
        } catch (e) {
          console.error('Failed to parse notes', e);
        }
      }
    }
    return notes.length > 0 ? notes[0].id : null;
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('lumina-notes', JSON.stringify(notes));
      localStorage.setItem('lumina-smart-folders', JSON.stringify(smartFolders));
    }
  }, [notes, smartFolders, isLoaded]);

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  const createNote = (title?: string, content?: string) => {
    const newNote: Note = {
      id: uuidv4(),
      title: title || 'Untitled Note',
      content: content || '',
      tags: [],
      updatedAt: Date.now(),
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => 
      n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
    ));
  };

  const deleteNote = (id: string) => {
    setNotes(prev => {
      const filtered = prev.filter(n => n.id !== id);
      if (activeNoteId === id) {
        setActiveNoteId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const createSmartFolder = (folder: Omit<SmartFolder, 'id'>) => {
    const newFolder: SmartFolder = {
      ...folder,
      id: uuidv4(),
    };
    setSmartFolders(prev => [...prev, newFolder]);
  };

  const updateSmartFolder = (id: string, updates: Partial<SmartFolder>) => {
    setSmartFolders(prev => prev.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ));
  };

  const deleteSmartFolder = (id: string) => {
    setSmartFolders(prev => prev.filter(f => f.id !== id));
  };

  return {
    notes,
    smartFolders,
    activeNoteId,
    activeNote,
    setActiveNoteId,
    createNote,
    updateNote,
    deleteNote,
    createSmartFolder,
    updateSmartFolder,
    deleteSmartFolder,
    isLoaded
  };
}
