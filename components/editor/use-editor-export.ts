import { useState } from 'react';
import { Note } from '@/hooks/use-notes';
import { toast } from 'sonner';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { Printer } from '@capgo/capacitor-printer';
import { marked } from 'marked';

export const useEditorExport = (note: Note | null) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);

  const exportNote = async (format: 'txt' | 'md' | 'pdf') => {
    if (!note) return;
    setShowExportMenu(false);
    
    if (format === 'pdf') {
      if (Capacitor.isNativePlatform()) {
        try {
          const exportRenderer = new marked.Renderer();
          exportRenderer.code = function(token) {
            const code = token.text.replace(/^[\r\n]+/, '').replace(/[\r\n]+$/, '');
            const rawLang = (token.lang || '').match(/\S*/)?.[0]?.toLowerCase() || '';
            const langClass = rawLang ? ` class="language-${rawLang}"` : '';
            return `<pre><code${langClass}>${code}</code></pre>\n`;
          };
          const contentHTML = await marked.parse(note.content, { renderer: exportRenderer, async: true });
          
          const escapeHtml = (str: string) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
          const formattedDate = new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                :root {
                  --color-text: #0f172a;
                  --color-muted: #64748b;
                  --color-border: #cbd5e1;
                  --color-bg-muted: #f8fafc;
                }
                @page {
                  size: auto;
                  margin: 15mm;
                }
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                  line-height: 1.6; 
                  padding: 0; 
                  margin: 0;
                  color: var(--color-text); 
                  font-size: 10.5pt;
                  max-width: 100%;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .note-header {
                  margin-bottom: 1.5rem;
                  padding-bottom: 0.75rem;
                  border-bottom: 1px solid #cbd5e1;
                }
                .note-title { 
                  font-size: 1.85rem; 
                  font-weight: 700;
                  color: #0f172a;
                  text-align: left; 
                  margin: 0 0 0.4rem 0; 
                  line-height: 1.25;
                }
                .note-meta {
                  font-size: 8.5pt;
                  color: #64748b;
                  font-weight: 500;
                  display: flex;
                  gap: 0.5rem;
                  align-items: center;
                }
                .meta-folder {
                  font-weight: 600;
                  color: #334155;
                }
                h1, h2, h3, h4, h5, h6 { 
                  margin-top: 1.25rem; 
                  margin-bottom: 0.4rem; 
                  font-weight: 700;
                  line-height: 1.25;
                  color: #0f172a;
                  break-after: avoid;
                  page-break-after: avoid;
                  break-inside: avoid;
                }
                p, ul, ol { margin-top: 0; margin-bottom: 0.6rem; white-space: pre-wrap; line-height: 1.6; }
                ul, ol { padding-left: 1.6rem; }
                li { margin-bottom: 0.15rem; break-inside: avoid; }
                img, .sketch-container { 
                  max-width: 100%; 
                  height: auto; 
                  border-radius: 6px; 
                  break-inside: avoid;
                  page-break-inside: avoid;
                  margin: 0.75rem auto;
                }
                .sketch-container {
                   background: white !important;
                }
                .sketch-container svg {
                   max-width: 100% !important;
                   height: auto !important;
                }
                pre { 
                  background: var(--color-bg-muted); 
                  padding: 10px 14px; 
                  border-radius: 6px; 
                  overflow: visible; 
                  break-inside: avoid;
                  page-break-inside: avoid;
                  border: 1px solid var(--color-border);
                  white-space: pre-wrap;
                  word-break: break-word;
                  margin: 0.75rem 0;
                  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                  font-size: 9pt;
                  line-height: 1.5;
                }
                code { 
                  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                  font-size: 0.9em; 
                  background: var(--color-bg-muted); 
                  padding: 0.15em 0.35em; 
                  border-radius: 4px; 
                  border: 1px solid var(--color-border);
                  font-weight: 500;
                  break-inside: avoid;
                }
                pre code {
                  background: transparent;
                  padding: 0;
                  border: none;
                  font-weight: 400;
                }
                blockquote { 
                  border-left: 3.5px solid #94a3b8; 
                  padding: 0.4rem 1rem; 
                  color: #334155; 
                  background: #f8fafc;
                  border-radius: 0 4px 4px 0;
                  margin: 0.75rem 0; 
                  break-inside: avoid;
                }
                table { 
                  width: 100%; 
                  table-layout: auto;
                  border-collapse: collapse; 
                  margin: 0.8rem 0; 
                  border: 1px solid var(--color-border);
                  break-inside: auto;
                  page-break-inside: auto;
                }
                tr {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                thead {
                  display: table-header-group;
                }
                th, td { 
                  border: 1px solid var(--color-border); 
                  padding: 0.5rem 0.75rem; 
                  text-align: left; 
                  vertical-align: top;
                  word-break: normal;
                  overflow-wrap: break-word;
                  font-size: 9.5pt;
                  line-height: 1.4;
                }
                th { 
                  background-color: var(--color-bg-muted); 
                  font-weight: 600; 
                  color: #0f172a;
                  border-bottom: 2px solid #94a3b8;
                }
                .table-zebra tbody tr:nth-child(even),
                .table-zebra tbody tr:nth-child(even) td,
                .table-wrapper.table-zebra tbody tr:nth-child(even),
                .table-wrapper.table-zebra tbody tr:nth-child(even) td,
                .rounded-table.table-zebra tbody tr:nth-child(even),
                .rounded-table.table-zebra tbody tr:nth-child(even) td {
                  background-color: #f1f5f9 !important;
                }
                input[type="checkbox"] {
                  margin-right: 0.5em;
                }
              </style>
            </head>
            <body>
              <div class="note-header">
                <h1 class="note-title">${escapeHtml(note.title || 'Untitled Note')}</h1>
                <div class="note-meta">
                  <span>${formattedDate}</span>
                  ${note.folder ? `<span>•</span><span class="meta-folder">${escapeHtml(note.folder)}</span>` : ''}
                  ${note.tags && note.tags.length > 0 ? `<span>•</span><span>${note.tags.map(t => '#' + escapeHtml(t)).join(' ')}</span>` : ''}
                </div>
              </div>
              ${contentHTML}
            </body>
            </html>
          `;
          await Printer.printHtml({
            name: note.title || 'Untitled Note',
            html: html
          });
        } catch (err) {
          console.error('Print failed:', err);
          toast.error('Failed to export PDF format natively.');
        }
      } else {
        window.print();
      }
      return;
    }

    const content = format === 'md' 
      ? `# ${note.title}\n\n${note.content}`
      : `${note.title}\n\n${note.content}`;
      
    if (Capacitor.isNativePlatform()) {
      try {
        const fileName = `${note.title || 'Untitled'}.${format}`;
        
        try {
          const FileSaverPrompt = registerPlugin<{ saveFile: (options: { fileName: string, data: string, isBase64: boolean }) => Promise<void> }>('FileSaverPrompt');
          await FileSaverPrompt.saveFile({
            fileName: fileName,
            data: content,
            isBase64: false
          });
          toast.success(`Saved to device`);
        } catch (pluginErr: unknown) {
          if (pluginErr && typeof pluginErr === 'object' && 'message' in pluginErr && pluginErr.message === 'Save cancelled') {
            return;
          }
          console.warn("FileSaverPrompt not available, falling back to share", pluginErr);
          const writedFilePath = await Filesystem.writeFile({
            path: fileName,
            data: content,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
          });
          
          const canShare = await Share.canShare();
          if (canShare.value) {
            await Share.share({
               title: 'Export Note',
               text: `Save ${fileName}`,
               url: writedFilePath.uri,
               dialogTitle: 'Save File To...'
            });
            toast.success(`Export dialog opened`);
          } else {
             await Filesystem.writeFile({
               path: fileName,
               data: content,
               directory: Directory.Documents,
               encoding: Encoding.UTF8
             });
             toast.success(`Saved to Documents/${fileName}`);
          }
        }
      } catch (err) {
        console.error('Failed to save file:', err);
        toast.error('Failed to export. Please check permissions.');
      }
    } else {
      try {
        let savedWithPicker = false;
        if ('showSaveFilePicker' in window) {
          try {
            const handle = await (window as unknown as { showSaveFilePicker: (options: unknown) => Promise<{ createWritable: () => Promise<{ write: (data: string) => Promise<void>, close: () => Promise<void> }> }> }).showSaveFilePicker({
              suggestedName: `${note.title || 'Untitled'}.${format}`,
              types: [{
                description: format === 'md' ? 'Markdown File' : 'Text File',
                accept: { 'text/plain': format === 'md' ? ['.md'] : ['.txt'] },
              }],
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            savedWithPicker = true;
            toast.success(`Exported as ${format.toUpperCase()}`);
          } catch (err: unknown) {
            if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
              return; // User cancelled
            }
            console.warn('showSaveFilePicker failed, falling back to blob download', err);
          }
        }
        
        if (!savedWithPicker) {
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
        }
      } catch (err: unknown) {
        console.error('Failed to save file:', err);
        toast.error('Failed to export.');
      }
    }
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

  const downloadLogs = async () => {
    const logs = (window as unknown as { __DEBUG_LOGS__?: unknown[] }).__DEBUG_LOGS__ || [];
    const content = JSON.stringify(logs, null, 2);
    
    if (Capacitor.isNativePlatform()) {
      try {
        const fileName = 'editor-debug-logs.json';
        
        try {
          const FileSaverPrompt = registerPlugin<{ saveFile: (options: { fileName: string, data: string, isBase64: boolean }) => Promise<void> }>('FileSaverPrompt');
          await FileSaverPrompt.saveFile({
            fileName: fileName,
            data: content,
            isBase64: false
          });
          toast.success(`Saved logs device`);
        } catch (pluginErr: unknown) {
          if (pluginErr && typeof pluginErr === 'object' && 'message' in pluginErr && pluginErr.message === 'Save cancelled') {
            return;
          }
          const writedFilePath = await Filesystem.writeFile({
            path: fileName,
            data: content,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
          });
          
          const canShare = await Share.canShare();
          if (canShare.value) {
            await Share.share({
               title: 'Export Logs',
               text: `Save ${fileName}`,
               url: writedFilePath.uri,
               dialogTitle: 'Save Logs To...'
            });
            toast.success(`Export dialog opened`);
          } else {
             await Filesystem.writeFile({
               path: fileName,
               data: content,
               directory: Directory.Documents,
               encoding: Encoding.UTF8
             });
             toast.success(`Saved to Documents/${fileName}`);
          }
        }
      } catch (err) {
        console.error('Failed to save logs:', err);
        toast.error('Failed to export.');
      }
      return;
    }

    try {
      let savedWithPicker = false;
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as unknown as { showSaveFilePicker: (options: unknown) => Promise<{ createWritable: () => Promise<{ write: (data: string) => Promise<void>, close: () => Promise<void> }> }> }).showSaveFilePicker({
            suggestedName: 'editor-debug-logs.json',
            types: [{
              description: 'JSON File',
              accept: { 'application/json': ['.json'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
          savedWithPicker = true;
          toast.success("Debug logs downloaded");
        } catch (err: unknown) {
          if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
            return; // User cancelled
          }
          console.warn('showSaveFilePicker failed, falling back to blob download', err);
        }
      }
      
      if (!savedWithPicker) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'editor-debug-logs.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Debug logs downloaded");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to export.');
    }
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
