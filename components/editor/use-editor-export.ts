import { useState } from 'react';
import { Note } from '@/hooks/use-notes';
import { toast } from 'sonner';

export const useEditorExport = (note: Note | null) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);

  const exportNote = (format: 'txt' | 'md' | 'pdf') => {
    if (!note) return;
    setShowExportMenu(false);
    
    if (format === 'pdf') {
      window.print();
      return;
    }

    const content = format === 'md' 
      ? `# ${note.title}\n\n${note.content}`
      : `${note.title}\n\n${note.content}`;
      
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || 'Untitled'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const handleCopyNote = (format: 'normal' | 'markdown') => {
    if (!note) return;
    let text = note.content;
    if (format === 'normal') {
      text = text
        .replace(/\[(.*?)\]\{\d+(?:px|pt)\}/g, '$1')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/#{1,6}\s?/g, '')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1')
        .replace(/>\s?/g, '')
        .replace(/!\[(.*?)\]\(.*?\)/g, '')
        .replace(/^\s*[-*+]\s/gm, '')
        .replace(/^\s*\d+\.\s/gm, '');
    }
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${format === 'markdown' ? 'as Markdown' : 'to clipboard'}`);
    setShowCopyMenu(false);
  };

  const downloadLogs = () => {
    const logs = (window as unknown as { __DEBUG_LOGS__?: unknown[] }).__DEBUG_LOGS__ || [];
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'editor-debug-logs.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Debug logs downloaded");
  };

  return {
    showExportMenu,
    setShowExportMenu,
    showCopyMenu,
    setShowCopyMenu,
    exportNote,
    handleCopyNote,
    downloadLogs
  };
};
