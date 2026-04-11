import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { SmartFolder, SmartFolderRule } from "@/hooks/use-notes";

interface SmartFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folder: Omit<SmartFolder, 'id'>) => void;
  existingFolder?: SmartFolder;
}

export function SmartFolderDialog({ isOpen, onClose, onSave, existingFolder }: SmartFolderDialogProps) {
  const [name, setName] = useState("");
  const [rules, setRules] = useState<SmartFolderRule[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (existingFolder) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(existingFolder.name);
        setRules(existingFolder.rules);
      } else {
        setName("");
        setRules([{ type: 'tag', operator: 'contains', value: '' }]);
      }
    }
  }, [isOpen, existingFolder]);

  const handleAddRule = () => {
    setRules([...rules, { type: 'tag', operator: 'contains', value: '' }]);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, field: keyof SmartFolderRule, value: string) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value } as SmartFolderRule;
    
    // Reset operator if type changes
    if (field === 'type') {
      if (value === 'date') newRules[index].operator = 'after';
      else newRules[index].operator = 'contains';
    }
    
    setRules(newRules);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name, rules: rules.filter(r => r.value.trim() !== '') });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden flex flex-col p-0 gap-0" showCloseButton={false}>
        <div className="p-4 border-b shrink-0 flex items-center justify-between">
          <DialogTitle>{existingFolder ? 'Edit Smart Folder' : 'Create Smart Folder'}</DialogTitle>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 shrink-0">
          <div className="space-y-2">
            <label className="text-sm font-medium">Folder Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Important Notes"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            />
          </div>
        </div>

        <div className="px-4 py-3 shrink-0 flex items-center justify-between bg-background">
          <label className="text-sm font-medium">Rules</label>
          <button type="button" onClick={handleAddRule} className="h-8 px-3 text-xs font-medium border border-border rounded-md hover:bg-muted flex items-center transition-colors">
            <Plus className="w-4 h-4 mr-1" /> Add Rule
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-3">
            {rules.map((rule, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-muted/50 p-2 sm:p-3 rounded-lg border border-border w-full">
                  <div className="flex items-center gap-2 w-full sm:w-1/2">
                    <select
                      value={rule.type}
                      onChange={(e) => handleRuleChange(index, 'type', e.target.value)}
                      className="bg-background border border-border rounded-md px-2 py-1.5 text-sm flex-1 min-w-0"
                    >
                      <option value="tag">Tag</option>
                      <option value="keyword">Keyword</option>
                      <option value="date">Date</option>
                    </select>
                    
                    <select
                      value={rule.operator}
                      onChange={(e) => handleRuleChange(index, 'operator', e.target.value)}
                      className="bg-background border border-border rounded-md px-2 py-1.5 text-sm flex-1 min-w-0"
                    >
                      {rule.type === 'date' ? (
                        <>
                          <option value="after">After</option>
                          <option value="before">Before</option>
                        </>
                      ) : (
                        <>
                          <option value="contains">Contains</option>
                          <option value="equals">Equals</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-1/2">
                    {rule.type === 'date' ? (
                      <input
                        type="date"
                        value={rule.value}
                        onChange={(e) => handleRuleChange(index, 'value', e.target.value)}
                        className="flex-1 bg-background border border-border rounded-md px-2 py-1.5 text-sm min-w-0"
                      />
                    ) : (
                      <input
                        type="text"
                        value={rule.value}
                        onChange={(e) => handleRuleChange(index, 'value', e.target.value)}
                        placeholder="Value..."
                        className="flex-1 bg-background border border-border rounded-md px-2 py-1.5 text-sm min-w-0"
                      />
                    )}
                    
                    <button 
                      type="button" 
                      onClick={() => handleRemoveRule(index)} 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {rules.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  No rules defined. Notes will not be automatically added.
                </div>
              )}
          </div>
        </div>

        <div className="p-4 shrink-0 flex justify-end gap-2 rounded-b-xl">
          <button type="button" className="px-4 py-2 border border-border rounded-md hover:bg-muted text-sm font-medium bg-background transition-colors" onClick={onClose}>Cancel</button>
          <button type="button" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium disabled:opacity-50 transition-colors" onClick={handleSave} disabled={!name.trim() || rules.length === 0}>Save Folder</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
