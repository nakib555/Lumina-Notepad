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

  const reorderNote = (id: string, folderId: string | null, referenceNoteId?: string | null, position: 'before' | 'after' | 'inside' = 'after') => {
    console.log("EXEC REORDER_NOTE", { id, folderId, referenceNoteId, position });
    setNotes(prev => {
      const sourceIndex = prev.findIndex(n => n.id === id);
      if (sourceIndex === -1) return prev;
      const sourceNote = prev[sourceIndex];
      const updatedNote = { ...sourceNote, folderId: folderId === null ? undefined : folderId, updatedAt: Date.now() };

      const newNotes = [...prev];
      newNotes.splice(sourceIndex, 1);

      if (referenceNoteId) {
        let targetIndex = newNotes.findIndex(n => n.id === referenceNoteId);
        if (targetIndex !== -1) {
          if (position === 'after') {
            targetIndex += 1;
          }
          newNotes.splice(targetIndex, 0, updatedNote);
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

  const reorderFolder = (id: string, parentId: string | null, referenceFolderId?: string | null, position: 'before' | 'after' | 'inside' = 'after') => {
    console.log("EXEC REORDER_FOLDER", { id, parentId, referenceFolderId, position });
    setFolders(prev => {
      const sourceIndex = prev.findIndex(f => f.id === id);
      if (sourceIndex === -1) return prev;
      const sourceFolder = prev[sourceIndex];
      const updatedFolder = { ...sourceFolder, parentId: parentId === undefined ? null : parentId };

      const newFolders = [...prev];
      newFolders.splice(sourceIndex, 1);

      if (referenceFolderId && position !== 'inside') {
        let targetIndex = newFolders.findIndex(f => f.id === referenceFolderId);
        if (targetIndex !== -1) {
          if (position === 'after') {
            targetIndex += 1;
          }
          newFolders.splice(targetIndex, 0, updatedFolder);
          return newFolders;
        }
      }

      if (position === 'inside' || !referenceFolderId) {
         newFolders.unshift(updatedFolder);
      }
      return newFolders;
    });
  };

  const deleteFolder = (id: string) => {
    // Delete the folder and all its contents (nested folders and notes)
    const getNestedFolderIds = (parentId: string): string[] => {
      const children = folders.filter(f => f.parentId === parentId);
      return [
        parentId,
        ...children.flatMap(child => getNestedFolderIds(child.id))
      ];
    };
    
    const idsToDelete = new Set(getNestedFolderIds(id));

    setFolders(prev => prev.filter(f => !idsToDelete.has(f.id)));
    
    setNotes(prev => {
      const filtered = prev.filter(n => !(n.folderId && idsToDelete.has(n.folderId)));
      if (activeNoteId && !filtered.some(n => n.id === activeNoteId)) {
        setTimeout(() => {
          setActiveNoteId(filtered.length > 0 ? filtered[0].id : null);
        }, 0);
      }
      return filtered;
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
