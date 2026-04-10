import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: number;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lumina-notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNotes(parsed);
        if (parsed.length > 0) {
          setActiveNoteId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to parse notes', e);
      }
    } else {
      const defaultNote = {
        id: uuidv4(),
        title: 'Welcome to Lumina Notes',
        content: 'Start typing here...\n\nYour notes are automatically saved to your browser.',
        tags: ['getting-started'],
        updatedAt: Date.now(),
      };
      setNotes([defaultNote]);
      setActiveNoteId(defaultNote.id);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('lumina-notes', JSON.stringify(notes));
    }
  }, [notes, isLoaded]);

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  const createNote = () => {
    const newNote: Note = {
      id: uuidv4(),
      title: 'Untitled Note',
      content: '',
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

  return {
    notes,
    activeNoteId,
    activeNote,
    setActiveNoteId,
    createNote,
    updateNote,
    deleteNote,
    isLoaded
  };
}
