import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
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
  const [folders, setFolders] = useState<Folder[]>(() => {
    if (typeof window !== 'undefined') {
      const savedFolders = localStorage.getItem('lumina-folders');
      if (savedFolders) {
        try {
          return JSON.parse(savedFolders);
        } catch (e) {
          console.error('Failed to parse folders', e);
        }
      }
    }
    return [];
  });

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
      localStorage.setItem('lumina-folders', JSON.stringify(folders));
    }
  }, [notes, folders, isLoaded]);

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  const createNote = (title?: string, content?: string, folderId?: string) => {
    const newNote: Note = {
      id: uuidv4(),
      title: title || 'Untitled Note',
      content: content || '',
      tags: [],
      folderId,
      updatedAt: Date.now(),
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    return newNote.id;
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => 
      n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
    ));
  };

  const reorderNote = (id: string, folderId: string | null, referenceNoteId?: string | null) => {
    setNotes(prev => {
      const sourceIndex = prev.findIndex(n => n.id === id);
      if (sourceIndex === -1) return prev;
      const sourceNote = prev[sourceIndex];
      const updatedNote = { ...sourceNote, folderId: folderId === null ? undefined : folderId, updatedAt: Date.now() };

      const newNotes = [...prev];
      newNotes.splice(sourceIndex, 1);

      if (referenceNoteId) {
        const targetIndex = newNotes.findIndex(n => n.id === referenceNoteId);
        if (targetIndex !== -1) {
          newNotes.splice(targetIndex + 1, 0, updatedNote);
          return newNotes;
        }
      }

      newNotes.unshift(updatedNote);
      return newNotes;
    });
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

  const createFolder = (name: string, parentId: string | null = null) => {
    const newFolder: Folder = {
      id: uuidv4(),
      name,
      parentId,
      createdAt: Date.now(),
    };
    setFolders(prev => [...prev, newFolder]);
    return newFolder.id;
  };

  const updateFolder = (id: string, updates: Partial<Folder>) => {
    setFolders(prev => prev.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ));
  };

  const reorderFolder = (id: string, parentId: string | null, referenceFolderId?: string | null) => {
    setFolders(prev => {
      const sourceIndex = prev.findIndex(f => f.id === id);
      if (sourceIndex === -1) return prev;
      const sourceFolder = prev[sourceIndex];
      const updatedFolder = { ...sourceFolder, parentId };

      const newFolders = [...prev];
      newFolders.splice(sourceIndex, 1);

      if (referenceFolderId) {
        const targetIndex = newFolders.findIndex(f => f.id === referenceFolderId);
        if (targetIndex !== -1) {
          newFolders.splice(targetIndex + 1, 0, updatedFolder);
          return newFolders;
        }
      }

      newFolders.unshift(updatedFolder);
      return newFolders;
    });
  };

  const deleteFolder = (id: string) => {
    setFolders(prev => {
      // Find all nested folders to delete
      const getNestedFolderIds = (parentId: string): string[] => {
        const children = prev.filter(f => f.parentId === parentId);
        return [
          parentId,
          ...children.flatMap(child => getNestedFolderIds(child.id))
        ];
      };
      
      const idsToDelete = new Set(getNestedFolderIds(id));
      
      // Also update notes in these folders to be at root (or move to parent?)
      // Actually, standard behavior is often just move them to root, or delete them.
      // Let's move them to root for safety.
      setNotes(notesPrev => notesPrev.map(n => 
        n.folderId && idsToDelete.has(n.folderId) ? { ...n, folderId: undefined } : n
      ));

      return prev.filter(f => !idsToDelete.has(f.id));
    });
  };

  return {
    notes,
    folders,
    activeNoteId,
    activeNote,
    setActiveNoteId,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    updateFolder,
    deleteFolder,
    reorderNote,
    reorderFolder,
    isLoaded
  };
}
