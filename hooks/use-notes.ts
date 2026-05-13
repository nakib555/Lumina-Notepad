import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Preferences } from '@capacitor/preferences';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export interface SmartFolderRule {
  type: 'tag' | 'content' | 'title' | 'date';
  operator: 'contains' | 'equals' | 'startsWith' | 'after' | 'before';
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
  reminderAt?: number;
  date?: string; // YYYY-MM-DD for daily notes
}

const defaultNotes: Note[] = [{
  id: uuidv4(),
  title: 'Welcome to Lumina Notes',
  content: 'Start typing here...\n\nYour notes are automatically saved and synced to your device.',
  tags: ['getting-started'],
  updatedAt: Date.now(),
}];

export function useNotes() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>(defaultNotes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0].id);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (typeof window === 'undefined') {
        setIsLoaded(true);
        return;
      }
      
      try {
        const foldersItem = await Preferences.get({ key: 'lumina-folders' });
        if (foldersItem.value) {
          setFolders(JSON.parse(foldersItem.value));
        }

        const notesItem = await Preferences.get({ key: 'lumina-notes' });
        let loadedNotes = [];
        if (notesItem.value) {
          const parsed = JSON.parse(notesItem.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedNotes = parsed;
            setNotes(parsed);
          }
        }

        const activeItem = await Preferences.get({ key: 'lumina-active-note' });
        if (activeItem.value) {
          setActiveNoteId(activeItem.value);
        } else if (loadedNotes.length > 0) {
          setActiveNoteId(loadedNotes[0].id);
        }
      } catch (e) {
        console.error('Failed to parse data from preferences', e);
        // Fallback to localstorage just in case it's an initial migration
        try {
          const lsNotes = localStorage.getItem('lumina-notes');
          if (lsNotes) setNotes(JSON.parse(lsNotes));
          const lsFolders = localStorage.getItem('lumina-folders');
          if (lsFolders) setFolders(JSON.parse(lsFolders));
        } catch (e2) {}
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      const timeoutId = setTimeout(async () => {
        try {
          await Preferences.set({ key: 'lumina-notes', value: JSON.stringify(notes) });
          await Preferences.set({ key: 'lumina-folders', value: JSON.stringify(folders) });
          if (activeNoteId) {
            await Preferences.set({ key: 'lumina-active-note', value: activeNoteId });
          }
        } catch (e) {
          console.error("Failed to save state to preferences", e);
        }
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [notes, folders, activeNoteId, isLoaded]);

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  const createNote = (title?: string, content?: string, folderId?: string, metadata?: Partial<Note>) => {
    const newNote: Note = {
      id: uuidv4(),
      title: title || 'Untitled Note',
      content: content || '',
      tags: [],
      folderId,
      updatedAt: Date.now(),
      ...metadata
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
