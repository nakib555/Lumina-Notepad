import { useState, useMemo, useRef } from 'react';
import { Note, Folder as CommonFolder } from '@/hooks/use-notes';
import { ChevronRight, ChevronDown, Folder, Trash2, Download, Plus, Upload, MoreHorizontal, FileText, FileUp, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FileTreeProps {
  notes: Note[];
  folders: CommonFolder[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: (title?: string, content?: string, folderId?: string) => string | void;
  onDeleteNote: (id: string) => void;
  onCreateFolder: (name: string, parentId?: string | null) => string | void;
  onUpdateFolder: (id: string, updates: Partial<CommonFolder>) => void;
  onDeleteFolder: (id: string) => void;
  onMoveNote: (noteId: string, folderId: string | null, referenceId?: string, position?: 'before' | 'after' | 'inside') => void;
  onMoveFolder?: (folderId: string, parentId: string | null, referenceId?: string, position?: 'before' | 'after' | 'inside') => void;
  searchQuery: string;
  selectedTags: string[];
}

export function SidebarFileTree({
  notes,
  folders,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onMoveNote,
  onMoveFolder,
  searchQuery,
  selectedTags
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  type DragPosition = 'before' | 'after' | 'inside';
  const [dragState, setDragState] = useState<{ id: string | 'root', type: 'note' | 'folder' | 'root', position: DragPosition } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetFolder, setUploadTargetFolder] = useState<string | null>(null);
  
  // Folder Creation State
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  // Folder Rename State
  const [isRenameFolderDialogOpen, setIsRenameFolderDialogOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<{id: string, name: string} | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  const handleCreateFolderSubmit = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), newFolderParentId);
      if (newFolderParentId) {
        expandFolder(newFolderParentId);
      }
    }
    setIsFolderDialogOpen(false);
    setNewFolderName("");
    setNewFolderParentId(null);
  };

  const openNewFolderDialog = (parentId: string | null = null) => {
    setNewFolderParentId(parentId);
    setNewFolderName("");
    setIsFolderDialogOpen(true);
  };

  const handleRenameFolderSubmit = () => {
    if (folderToRename && editFolderName.trim() && editFolderName.trim() !== folderToRename.name) {
      onUpdateFolder(folderToRename.id, { name: editFolderName.trim() });
    }
    setIsRenameFolderDialogOpen(false);
    setFolderToRename(null);
    setEditFolderName("");
  };

  const openRenameFolderDialog = (folder: CommonFolder) => {
    setFolderToRename({ id: folder.id, name: folder.name });
    setEditFolderName(folder.name);
    setIsRenameFolderDialogOpen(true);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
         next.delete(folderId);
      } else {
         next.add(folderId);
      }
      return next;
    });
  };

  const expandFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.add(folderId);
      return next;
    });
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => note.tags?.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [notes, searchQuery, selectedTags]);

  const handleDragStart = (e: React.DragEvent, id: string, type: 'note' | 'folder') => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ id, type }));
    // Required for mobile-drag-drop to recognize the item payload
    e.dataTransfer.setData('text/plain', JSON.stringify({ id, type })); 
  };

  const handleDragOver = (e: React.DragEvent, id: string | 'root', type: 'note' | 'folder' | 'folder-container' | 'root') => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    let position: DragPosition = 'inside';
    
    if (type !== 'root' && type !== 'folder-container') {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      
      if (type === 'note') {
        position = (y / rect.height) < 0.5 ? 'before' : 'after';
      } else if (type === 'folder') {
        if ((y / rect.height) < 0.3) position = 'before';
        else if ((y / rect.height) > 0.7) position = 'after';
        else position = 'inside';
      }
    }

    if (dragState?.id !== id || dragState?.position !== position) {
      setDragState({ id, type: type === 'folder-container' ? 'folder' : type, position });
      // If we hover over a folder in 'inside' position, expand it after a short delay
      if ((type === 'folder' || type === 'folder-container') && position === 'inside' && id !== 'root') {
          setTimeout(() => expandFolder(id as string), 500);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent flickering when hovering over text or icons inside the draggable row
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    
    setDragState(null);
  };

  const isDescendant = (folderId: string, potentialParentId: string | null): boolean => {
    if (!potentialParentId) return false;
    if (folderId === potentialParentId) return true;
    const parent = folders.find(f => f.id === potentialParentId);
    return parent ? isDescendant(folderId, parent.parentId) : false;
  };

  const handleDrop = async (e: React.DragEvent, dropTargetId: string | 'root', dropTargetType: 'note' | 'folder' | 'folder-container' | 'root') => {
    e.preventDefault();
    e.stopPropagation();
    
    const pos = dragState?.position || 'inside';
    setDragState(null);

    let targetFolderId: string | null = null;
    let referenceId: string | undefined = undefined;

    if (dropTargetType === 'root') {
      targetFolderId = null;
    } else if (dropTargetType === 'note') {
      const targetNote = notes.find(n => n.id === dropTargetId);
      targetFolderId = targetNote?.folderId || null;
      referenceId = dropTargetId !== 'root' ? dropTargetId : undefined;
    } else if (dropTargetType === 'folder' || dropTargetType === 'folder-container') {
      if (pos === 'inside' || dropTargetType === 'folder-container') {
        targetFolderId = dropTargetId !== 'root' ? dropTargetId : null;
      } else {
        const targetFolder = folders.find(f => f.id === dropTargetId);
        targetFolderId = targetFolder?.parentId || null;
        referenceId = dropTargetId !== 'root' ? dropTargetId : undefined;
      }
    }

    // 1. Check for OS file drops
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadTargetFolder(targetFolderId);
      const files = Array.from(e.dataTransfer.files);
      const items = e.dataTransfer.items;

      // Handle raw ZIP drop
      if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
        const jszip = new JSZip();
        try {
          const result = await jszip.loadAsync(files[0]);
          await processZipContent(result, targetFolderId);
        } catch (err) {
          console.error("Failed to parse dropped zip", err);
        }
        setUploadTargetFolder(null);
        return;
      }

      // Handle folder / file drop via WebKit API
      if (items && items.length > 0) {
        await processDroppedItems(items, targetFolderId);
      }
      setUploadTargetFolder(null);
      return;
    }

    // 2. Check for internal react drag-and-drop
    try {
      const payload = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      console.log("DROP PAYLOAD:", payload);
      if (!payload) return;
      const data = JSON.parse(payload);
      
      console.log("DRAG DROP TARGET INFO", {
        dataId: data.id,
        dropTargetId,
        pos,
        targetFolderId,
        referenceId,
      });

      if (data.id === dropTargetId) return;

      const passPosition = pos === 'inside' ? 'after' : pos;
      if (data.type === 'note') {
        console.log("MOVING NOTE");
        onMoveNote(data.id, targetFolderId, referenceId, passPosition);
      } else if (data.type === 'folder' && referenceId !== data.id) {
        console.log("MOVING FOLDER", data.id, targetFolderId);
        if (!isDescendant(data.id, targetFolderId)) {
          if (onMoveFolder) {
            console.log("onMoveFolder CALLED");
            onMoveFolder(data.id, targetFolderId, referenceId, passPosition);
          } else {
            console.log("onUpdateFolder CALLED FALLBACK");
            onUpdateFolder(data.id, { parentId: targetFolderId });
          }
        } else {
            console.log("IS DESCENDANT SO CANCELLED");
        }
      }
    } catch (err) {
      console.error("Drop parsing error", err);
    }
  };

  const processDroppedItems = async (items: DataTransferItemList, parentId: string | null) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getFileFromEntry = (entry: any): Promise<File> => 
      new Promise(resolve => entry.file(resolve));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const readEntriesPromise = (reader: any): Promise<any[]> =>
      new Promise(resolve => reader.readEntries(resolve));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processEntry = async (entry: any, currentParentId: string | null) => {
      if (entry.isFile) {
        const extension = entry.name.split('.').pop()?.toLowerCase();
        if (!['md', 'txt'].includes(extension || '')) return;

        const file = await getFileFromEntry(entry);
        const text = await file.text();
        let title = file.name.replace(/\.[^/.]+$/, "") || "Untitled"; 
        const headingMatch = text.match(/^#+\s+(.*)/);
        let content = text;
        if (headingMatch && headingMatch[1]) {
           title = headingMatch[1].trim(); 
           content = content.replace(/^#+\s+.*\n?/, "").trimStart();
        }
        onCreateNote(title, content, currentParentId || undefined);
      } else if (entry.isDirectory) {
         const newId = onCreateFolder(entry.name, currentParentId) as string;
         const reader = entry.createReader();
         const entries = await readEntriesPromise(reader);
         for (const child of entries) {
            await processEntry(child, newId);
         }
      }
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) await processEntry(entry, parentId);
      }
    }
  };

  const processZipContent = async (result: JSZip, parentId: string | null) => {
    const pathToId: Record<string, string> = {};
    const fileEntries = Object.entries(result.files).filter(([, f]) => !f.dir);

    for (const [relativePath, fileEntry] of fileEntries) {
       if (relativePath.includes('__MACOSX')) continue; 
       if (relativePath.split('/').some(p => p.startsWith('.') && p !== '.' && p !== '..')) continue;

       const extension = relativePath.split('.').pop()?.toLowerCase();
       if (!['md', 'txt'].includes(extension || '')) continue;

       const pathParts = relativePath.split('/');
       const fileName = pathParts.pop();
       
       let currentParentId = parentId; 
       let currentPathPath = "";

       for (const part of pathParts) {
         currentPathPath = currentPathPath ? `${currentPathPath}/${part}` : part;
         if (pathToId[currentPathPath]) {
           currentParentId = pathToId[currentPathPath];
         } else {
           const tempParentId = currentParentId;
           const newId = onCreateFolder(part, tempParentId) as string;
           currentParentId = newId;
           pathToId[currentPathPath] = currentParentId;
         }
       }

       const text = await fileEntry.async('text');
       let title = fileName?.replace(/\.[^/.]+$/, "") || "Untitled"; 
       const headingMatch = text.match(/^#+\s+(.*)/);
       let content = text;
       if (headingMatch && headingMatch[1]) {
          title = headingMatch[1].trim(); 
          content = content.replace(/^#+\s+.*\n?/, "").trimStart();
       }
       onCreateNote(title, content, currentParentId || undefined);
    }
  };

  const handleZipDownload = async (folder: CommonFolder) => {
    const zip = new JSZip();

    const addToZip = (fldId: string, currentZip: JSZip) => {
      const childrenFolders = folders.filter(f => f.parentId === fldId);
      const _notes = notes.filter(n => n.folderId === fldId);

      _notes.forEach(note => {
        currentZip.file(`${note.title || 'Untitled'}.md`, note.content);
      });

      childrenFolders.forEach(cf => {
        const subFolder = currentZip.folder(cf.name);
        if (subFolder) addToZip(cf.id, subFolder);
      });
    };

    addToZip(folder.id, zip);
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${folder.name}.zip`);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        let content = event.target?.result as string;
        let title = file.name.replace(/\.[^/.]+$/, ""); 
        const headingMatch = content.match(/^#+\s+(.*)/);
        if (headingMatch && headingMatch[1]) {
           title = headingMatch[1].trim(); 
           content = content.replace(/^#+\s+.*\n?/, "").trimStart();
        }
        onCreateNote(title, content, uploadTargetFolder || undefined);
      };
      reader.readAsText(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUploadTargetFolder(null); // Reset
  };

  const handleNativeFolderImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const pathToId: Record<string, string> = {};

    for (const file of Array.from(files)) {
       const extension = file.name.split('.').pop()?.toLowerCase();
       if (!['md', 'txt'].includes(extension || '')) continue; 

       const pathParts = file.webkitRelativePath.split('/');
       const fileName = pathParts.pop(); // remove file name from path
       
       let currentParentId = uploadTargetFolder; 
       let currentPathPath = "";

       for (const part of pathParts) {
         currentPathPath = currentPathPath ? `${currentPathPath}/${part}` : part;
         if (pathToId[currentPathPath]) {
           currentParentId = pathToId[currentPathPath];
         } else {
           const tempParentId = currentParentId;
           // If onCreateFolder doesn't return an ID due to being typed loosely elsewhere, fallback
           // but we assume it handles string return internally if updated.
           const newId = onCreateFolder(part, tempParentId) as string;
           currentParentId = newId;
           pathToId[currentPathPath] = currentParentId;
         }
       }

       const text = await file.text();
       let title = fileName?.replace(/\.[^/.]+$/, "") || "Untitled"; 
       const headingMatch = text.match(/^#+\s+(.*)/);
       let content = text;
       if (headingMatch && headingMatch[1]) {
          title = headingMatch[1].trim(); 
          content = content.replace(/^#+\s+.*\n?/, "").trimStart();
       }
       onCreateNote(title, content, currentParentId || undefined);
    }
    
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const handleZipImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const jszip = new JSZip();
    try {
      const result = await jszip.loadAsync(file);
      await processZipContent(result, uploadTargetFolder);
    } catch (err) {
      console.error("Failed to parse zip", err);
    }
    
    if (zipInputRef.current) zipInputRef.current.value = "";
  };

  const getDragStyle = (id: string, isFolderInner = false) => {
    if (dragState?.id !== id) return "";
    if (isFolderInner) {
       // folder has an outer container for children drop ('inside'), and inner actual row for before/after/inside
       if (dragState.position === 'inside') return "bg-primary/20 ring-1 ring-primary/50";
       if (dragState.position === 'before') return "shadow-[0_-3px_0_0_hsl(var(--primary))] ring-0 bg-primary/5 z-10 relative left-0 right-0";
       if (dragState.position === 'after') return "shadow-[0_3px_0_0_hsl(var(--primary))] ring-0 bg-primary/5 z-10 relative left-0 right-0";
    } else {
       if (dragState.position === 'inside') return "bg-primary/10 ring-1 ring-primary/30";
       if (dragState.position === 'before') return "shadow-[0_-3px_0_0_hsl(var(--primary))] ring-0 bg-primary/5 z-10 relative left-0 right-0";
       if (dragState.position === 'after') return "shadow-[0_3px_0_0_hsl(var(--primary))] ring-0 bg-primary/5 z-10 relative left-0 right-0";
    }
    return "";
  };

  const renderNote = (note: Note, level = 0) => (
    <div
      key={note.id}
      draggable="true"
      onDragStart={(e) => handleDragStart(e, note.id, 'note')}
      onDragEnter={(e) => e.preventDefault()}
      onDragOver={(e) => handleDragOver(e, note.id, 'note')}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, note.id, 'note')}
      className={cn(
        "group flex items-center justify-between py-2 px-2 rounded-lg cursor-pointer transition-all duration-200 border-none select-none",
        getDragStyle(note.id),
        activeNoteId === note.id 
          ? "bg-primary/10 text-primary font-medium" 
          : "hover:bg-muted/50 text-muted-foreground"
      )}
      style={{ paddingLeft: `${ level * 12 + 28 }px` }} // Aligns nicely past the Chevron and Folder icon
      onClick={() => onSelectNote(note.id)}
    >
      <div className="flex items-center gap-2 overflow-hidden w-full pointer-events-none">
        <span className="text-muted-foreground shrink-0 w-3.5 h-3.5 flex items-center justify-center">
            <span className={cn("w-1.5 h-1.5 rounded-full", activeNoteId === note.id ? "bg-primary" : "bg-primary/40")} />
        </span>
        <span className={cn(
          "text-sm truncate mr-2 w-full transition-colors",
          activeNoteId === note.id ? "text-primary font-medium" : "font-medium text-foreground/80 group-hover:text-foreground"
        )}>
          {note.title || "Untitled Note"}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteNote(note.id);
        }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );

  const renderFolder = (folder: CommonFolder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const childrenFolders = folders.filter(f => f.parentId === folder.id);
    const childrenNotes = filteredNotes.filter(n => n.folderId === folder.id);

    return (
      <div 
        key={folder.id} 
        className={cn(
          "w-full flex-col rounded-lg transition-colors border border-transparent"
        )}
      >
        <div
          draggable="true"
          onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
          onDragEnter={(e) => e.preventDefault()}
          onDragOver={(e) => handleDragOver(e, folder.id, 'folder')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id, 'folder')}
          className={cn(
            "group flex items-center justify-between py-2 px-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors select-none",
            getDragStyle(folder.id, true)
          )}
          style={{ paddingLeft: `${ level * 12 + 8 }px` }}
          onClick={() => toggleFolder(folder.id)}
        >
          <div className="flex items-center gap-2 overflow-hidden w-full pointer-events-none">
            <span className="text-muted-foreground shrink-0">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
            <Folder className="w-4 h-4 text-primary/70 shrink-0" />
            <span className="text-sm font-medium text-foreground/90 truncate mr-2 w-full">
              {folder.name}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-6 w-6")} onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setUploadTargetFolder(folder.id);
                  fileInputRef.current?.click();
                }}>
                  <Upload className="w-4 h-4 mr-2" /> Upload Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onCreateNote(undefined, undefined, folder.id);
                  expandFolder(folder.id);
                }}>
                  <Plus className="w-4 h-4 mr-2" /> New Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  openNewFolderDialog(folder.id);
                }}>
                  <Folder className="w-4 h-4 mr-2" /> New Folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  openRenameFolderDialog(folder);
                }}>
                  <Edit2 className="w-4 h-4 mr-2" /> Rename Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleZipDownload(folder);
                }}>
                  <Download className="w-4 h-4 mr-2" /> Download Zip
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder.id);
                }} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isExpanded && (
          <div
            className={cn(
               "w-full flex-col min-h-2",
               dragState?.id === folder.id && dragState?.position === 'inside' ? "bg-primary/5 ring-1 ring-primary/20 rounded-md py-1" : ""
            )}
            onDragEnter={(e) => e.preventDefault()}
            onDragOver={(e) => handleDragOver(e, folder.id, 'folder-container')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id, 'folder-container')}
          >
            {childrenFolders.map(childFolder => renderFolder(childFolder, level + 1))}
            {childrenNotes.map(childNote => renderNote(childNote, level + 1))}
            
            {childrenFolders.length === 0 && childrenNotes.length === 0 && (
              <div
                style={{ paddingLeft: `${(level) * 12 + 28}px` }}
                className="py-1.5 px-2 text-xs text-muted-foreground/50 italic pointer-events-none"
              >
                Empty
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter(f => !f.parentId);
  const rootNotes = filteredNotes.filter(n => !n.folderId);

  return (
    <div className="w-full">
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".md,.txt" 
        multiple 
        className="hidden" 
        onChange={handleFileImport}
      />
      <input 
        type="file" 
        ref={folderInputRef} 
        /* @ts-expect-error - directory attributes are non-standard but work in modern browsers */
        webkitdirectory="" directory=""
        className="hidden" 
        onChange={handleNativeFolderImport}
      />
      <input 
        type="file" 
        ref={zipInputRef} 
        accept=".zip" 
        className="hidden" 
        onChange={handleZipImport}
      />

      {/* Folders & Root Notes Container */}
      <div 
        className={cn(
          "min-h-[50vh] space-y-1 pb-[30vh] rounded-xl transition-all h-full",
          dragState?.id === 'root' ? "bg-primary/5 ring-1 ring-primary/30" : ""
        )}
        onDragEnter={(e) => e.preventDefault()}
        onDragOver={(e) => handleDragOver(e, 'root', 'root')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'root', 'root')}
      >
        <div className="flex items-center justify-between px-2 mb-2 mt-4">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">File Tree</span>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-5 w-5 text-muted-foreground hover:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0")}>
              <Plus className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => {
                onCreateNote(undefined, undefined, undefined);
              }}>
                <FileText className="w-4 h-4 mr-2" /> New Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openNewFolderDialog(null)}>
                <Folder className="w-4 h-4 mr-2" /> New Folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                 setUploadTargetFolder(null);
                 fileInputRef.current?.click();
              }}>
                <FileUp className="w-4 h-4 mr-2" /> Upload Note
              </DropdownMenuItem>
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Upload className="w-4 h-4 mr-2" /> Upload Folder
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => {
                      setUploadTargetFolder(null);
                      folderInputRef.current?.click();
                    }}>
                      <Folder className="w-4 h-4 mr-2" /> From Folder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setUploadTargetFolder(null);
                      if (zipInputRef.current) {
                         zipInputRef.current.value = "";
                         zipInputRef.current.click();
                      }
                    }}>
                      <Download className="w-4 h-4 mr-2" /> From .zip Extract
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {rootFolders.map(f => renderFolder(f, 0))}
        {rootNotes.map(n => renderNote(n, 0))}
      </div>

      {/* Folder Creation Dialog */ }
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <div className="grid flex-1 gap-2">
              <Input
                autoFocus
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolderSubmit();
                }}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setIsFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateFolderSubmit}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder Rename Dialog */}
      <Dialog open={isRenameFolderDialogOpen} onOpenChange={setIsRenameFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <div className="grid flex-1 gap-2">
              <Input
                autoFocus
                placeholder="Folder name"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameFolderSubmit();
                }}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setIsRenameFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleRenameFolderSubmit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}