import { useState, useRef, useEffect } from 'react';
import { Note } from '@/hooks/use-notes';
import { toast } from 'sonner';
import getCaretCoordinates from 'textarea-caret';

export const useEditorLogic = (
  note: Note | null,
  onUpdateNote: (id: string, updates: Partial<Note>) => void,
  addToHistory: (title: string, content: string) => void
) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [folderInput, setFolderInput] = useState("");
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashSearch, setSlashSearch] = useState("");

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    onUpdateNote(note!.id, { content: newContent });
    addToHistory(note!.title, newContent);

    if (textareaRef.current) {
      const scrollContainer = textareaRef.current.closest('.overflow-y-auto');
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
      }
    }

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newContent.substring(0, cursorPosition);
    const lastLine = textBeforeCursor.split('\n').pop() || '';
    
    const slashMatch = lastLine.match(/(?:^|\s)\/([a-zA-Z]*)$/);
    
    if (slashMatch) {
      setSlashSearch(slashMatch[1]);
      
      if (textareaRef.current) {
        const caret = getCaretCoordinates(textareaRef.current, cursorPosition);
        const rect = textareaRef.current.getBoundingClientRect();
        
        const rootContainer = textareaRef.current.closest('.bg-background.relative');
        const rootRect = rootContainer ? rootContainer.getBoundingClientRect() : { top: 0, left: 0 };
        
        const top = caret.top + rect.top - rootRect.top + 24;
        const left = caret.left + rect.left - rootRect.left;
        
        setSlashMenuPosition({ top, left });
        setSlashMenuOpen(true);
      }
    } else {
      setSlashMenuOpen(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (!note) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      const file = imageFiles[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        const imageMarkdown = `\n![${file.name}](${base64String})\n`;
        
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = note.content;
        
        const newContent = text.substring(0, start) + imageMarkdown + text.substring(end);
        onUpdateNote(note.id, { content: newContent });
        addToHistory(note.title, newContent);
        toast.success("Image added successfully");
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
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

  // Auto-resize on initial load or note change
  useEffect(() => {
    if (textareaRef.current && !isPreviewMode) {
      const scrollContainer = textareaRef.current.closest('.overflow-y-auto');
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
      }
    }
  }, [note?.content, isPreviewMode]);

  return {
    textareaRef,
    isPreviewMode,
    setIsPreviewMode,
    tagInput,
    setTagInput,
    folderInput,
    setFolderInput,
    slashMenuOpen,
    setSlashMenuOpen,
    slashMenuPosition,
    slashSearch,
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
