import { Hash, X, Tag, Folder } from "lucide-react";
import { Note } from "@/hooks/use-notes";

interface MetadataBarProps {
  note: Note;
  tagInput: string;
  setTagInput: (val: string) => void;
  onTagKeyDown: (e: React.KeyboardEvent) => void;
  handleAddTag: () => void;
  removeTag: (tag: string) => void;
  folderInput: string;
  setFolderInput: (val: string) => void;
  updateFolder: (e: React.KeyboardEvent) => void;
}

export const MetadataBar = ({
  note,
  tagInput,
  setTagInput,
  onTagKeyDown,
  handleAddTag,
  removeTag,
  folderInput,
  setFolderInput,
  updateFolder
}: MetadataBarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-4 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {note.tags?.map(tag => (
            <span 
              key={tag} 
              className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-full border border-primary/20 group/tag"
            >
              <Hash className="w-3 h-3 opacity-60" />
              {tag}
              <button 
                onClick={() => removeTag(tag)}
                className="hover:text-primary/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="relative flex items-center">
          <Tag className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Add tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={onTagKeyDown}
            onBlur={handleAddTag}
            className="pl-8 pr-3 py-1 text-[11px] font-medium bg-muted border-transparent focus:bg-background focus:border-border rounded-full outline-none transition-all w-24 focus:w-32 text-foreground"
          />
        </div>
      </div>

      <div className="h-4 w-px bg-border hidden sm:block" />

      <div className="relative flex items-center">
        <Folder className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
        <input 
          type="text"
          placeholder={note.folderId || "Add to folder..."}
          value={folderInput}
          onChange={(e) => setFolderInput(e.target.value)}
          onKeyDown={updateFolder}
          className="pl-8 pr-3 py-1 text-[11px] font-medium bg-muted border-transparent focus:bg-background focus:border-border rounded-full outline-none transition-all w-32 focus:w-40 text-foreground"
        />
      </div>
    </div>
  );
};
