import { useState, useRef } from 'react';
import { Note } from '@/hooks/use-notes';
import { toast } from 'sonner';

export const useEditorLogic = (
  note: Note | null,
  onUpdateNote: (id: string, updates: Partial<Note>) => void,
  addToHistory: (title: string, content: string) => void
) => {
  const textareaRef = useRef<HTMLDivElement>(null); // Changed to HTMLDivElement
  const [tagInput, setTagInput] = useState("");
  const [folderInput, setFolderInput] = useState("");

  const handleContentChange = (newContent: string) => {
    if (!note) return;
    onUpdateNote(note.id, { content: newContent });
    addToHistory(note.title, newContent);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!note) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      const file = imageFiles[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        
        // Insert image using execCommand
        document.execCommand('insertImage', false, base64String);
        
        toast.success("Image added successfully");
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && note) {
      const newTag = tagInput.trim().toLowerCase();
      if (!note.tags?.includes(newTag)) {
        onUpdateNote(note.id, { tags: [...(note.tags || []), newTag] });
      }
      setTagInput("");
    }
  };

  const onTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (!note) return;
    onUpdateNote(note.id, { tags: note.tags?.filter(t => t !== tagToRemove) });
  };

  const updateFolder = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && note) {
      const newFolder = folderInput.trim();
      onUpdateNote(note.id, { folderId: newFolder || undefined });
      toast.success(newFolder ? `Moved to ${newFolder}` : "Removed from folder");
    }
  };

  const getStats = () => {
    if (!note) return { words: 0, chars: 0, readingTime: 0 };
    const text = note.content;
    const chars = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(words / 200);
    return { words, chars, readingTime };
  };

  return {
    textareaRef,
    tagInput,
    setTagInput,
    folderInput,
    setFolderInput,
    handleContentChange,
    handleDrop,
    handleDragOver,
    handleAddTag,
    onTagKeyDown,
    removeTag,
    updateFolder,
    getStats
  };
};
