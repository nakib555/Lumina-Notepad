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
                  --color-border: #e2e8f0;
                  --color-bg-muted: #f8fafc;
                }
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                  line-height: 1.6; 
                  padding: 24px; 
                  color: var(--color-text); 
                  font-size: 16px;
                  max-width: 100%;
                  margin: 0 auto;
                }
                h1, h2, h3, h4, h5, h6 { 
                  margin-top: 1.5em; 
                  margin-bottom: 0.5em; 
                  font-weight: 600;
                  line-height: 1.25;
                  break-after: avoid;
                  page-break-after: avoid;
                }
                h1 { font-size: 2.25em; text-align: center; margin-bottom: 1em; }
                p, ul, ol { margin-top: 0; margin-bottom: 1em; white-space: pre-wrap; }
                ul, ol { padding-left: 1.5em; }
                li { margin-bottom: 0.25em; }
                img, .sketch-container { 
                  max-width: 100%; 
                  height: auto; 
                  border-radius: 8px; 
                  break-inside: avoid;
                  page-break-inside: avoid;
                  margin: 1.5em 0;
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
                  padding: 16px; 
                  border-radius: 8px; 
                  overflow-x: auto; 
                  break-inside: avoid;
                  page-break-inside: avoid;
                  border: 1px solid var(--color-border);
                  white-space: pre;
                }
                code { 
                  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                  font-size: 0.85em; 
                  background: var(--color-bg-muted); 
                  padding: 0.2em 0.4em; 
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
                  border-left: 4px solid var(--color-border); 
                  padding-left: 16px; 
                  color: var(--color-muted); 
                  margin: 1.5em 0; 
                  font-style: italic;
                }
                table { 
                  width: 100%; 
                  border-collapse: collapse; 
                  margin: 1.5em 0; 
                  break-inside: avoid;
                  page-break-inside: avoid;
                }
                th, td { 
                  border: 1px solid var(--color-border); 
                  padding: 8px 12px; 
                  text-align: left; 
                }
                th { 
                  background-color: var(--color-bg-muted); 
                  font-weight: 600; 
                }
                input[type="checkbox"] {
                  margin-right: 0.5em;
                }
                @media print {
                  body { padding: 0; margin: 0; }
                  @page { margin: 20mm; }
                }
              </style>
            </head>
            <body>
              <h1 class="note-title">${note.title || 'Untitled Note'}</h1>
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
        if ('showSaveFilePicker' in window) {
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
          toast.success(`Exported as ${format.toUpperCase()}`);
        } else {
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
        if (err && typeof err === 'object' && 'name' in err && err.name !== 'AbortError') {
          console.error('Failed to save file:', err);
          toast.error('Failed to export.');
        }
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
      if ('showSaveFilePicker' in window) {
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
        toast.success("Debug logs downloaded");
      } else {
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
      if (err && typeof err === 'object' && 'name' in err && err.name !== 'AbortError') {
        console.error(err);
      }
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
