import { Hash, X, Tag, Folder, Bell, Clock } from "lucide-react";
import { Note } from "@/hooks/use-notes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
  onSetReminder?: (date: Date) => void;
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
  updateFolder,
  onSetReminder
}: MetadataBarProps) => {
  const [reminderDate, setReminderDate] = useState<Date | undefined>(note.reminderAt ? new Date(note.reminderAt) : undefined);
  const [reminderTime, setReminderTime] = useState<string>("09:00");

  const handleSetReminder = () => {
    if (reminderDate && onSetReminder) {
      const [hours, minutes] = reminderTime.split(":").map(Number);
      const newDate = new Date(reminderDate);
      newDate.setHours(hours, minutes, 0, 0);
      onSetReminder(newDate);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 print:hidden w-full">
      <div className="flex flex-wrap items-center gap-4 -ml-[3px]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {note.tags?.map(tag => (
              <span 
                key={tag} 
                className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-full border border-primary/20 group/tag transition-all hover:shadow-sm hover:shadow-primary/20 hover:scale-105"
              >
                <Hash className="w-3 h-3 opacity-60" />
                {tag}
                <button 
                  onClick={() => removeTag(tag)}
                  className="hover:bg-primary/20 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-full p-0.5 ml-0.5 active:scale-95"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
          <div className="relative flex items-center group/taginput">
            <Tag className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/taginput:text-primary transition-colors" aria-hidden="true" />
            <input 
              type="text"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={handleAddTag}
              autoComplete="off"
              className="pl-8 pr-3 py-1 pt-[4px] -ml-[10px] text-[11px] font-medium bg-[#fef9f9] border border-transparent focus:bg-background focus:border-primary/30 rounded-full outline-none transition-all w-24 focus:w-32 text-foreground shadow-sm focus:shadow-md focus:shadow-primary/5 focus:ring-0"
              aria-label="Add tag"
            />
          </div>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" aria-hidden="true" />

        <div className="relative flex items-center group/folderinput">
          <Folder className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/folderinput:text-primary transition-colors" aria-hidden="true" />
          <input 
            type="text"
            placeholder={note.folderId || "Add to folder..."}
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            onKeyDown={updateFolder}
            autoComplete="off"
            className="pl-8 pr-3 py-1 text-[11px] font-medium bg-[#fffefe] border border-transparent focus:bg-background focus:border-primary/30 rounded-full outline-none transition-all w-32 focus:w-40 text-foreground shadow-sm focus:shadow-md focus:shadow-primary/5 focus:ring-0"
            aria-label="Add to folder"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {onSetReminder && (
          <Popover>
            <PopoverTrigger 
              render={<button type="button" />}
              className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 hover:bg-primary/10 hover:text-primary text-muted-foreground text-[11px] font-medium rounded-full transition-all duration-200 active:scale-90 border border-transparent hover:border-primary/20 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {note.reminderAt ? new Date(note.reminderAt).toLocaleString() : 'Set Reminder'}
              </span>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-4 flex flex-col gap-4 z-[100] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-75 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-top-2 duration-200 origin-top-right shadow-xl" 
              align="end"
            >
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Schedule Reminder</h4>
                <Calendar
                  mode="single"
                  selected={reminderDate}
                  onSelect={setReminderDate}
                  initialFocus
                  className="rounded-md border shadow"
                />
                <div className="flex items-center gap-2 w-full">
                  <div className="flex items-center gap-2 flex-1 border border-input rounded-md px-3 py-2 bg-background shadow-sm hover:border-primary/50 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 cursor-text">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <input 
                       type="time"
                       className="w-full bg-transparent text-sm border-none outline-none ring-0 p-0 focus:ring-0 appearance-none m-0 focus-visible:outline-none"
                       value={reminderTime}
                       onChange={(e) => setReminderTime(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSetReminder} disabled={!reminderDate} className="px-4">Save</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
