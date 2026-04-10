import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, X } from "lucide-react";
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{existingFolder ? 'Edit Smart Folder' : 'Create Smart Folder'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Rules</label>
              <Button variant="outline" size="sm" onClick={handleAddRule} className="h-8">
                <Plus className="w-4 h-4 mr-1" /> Add Rule
              </Button>
            </div>
            
            {rules.map((rule, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-muted/50 p-2 rounded-lg border border-border">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={rule.type}
                    onChange={(e) => handleRuleChange(index, 'type', e.target.value)}
                    className="bg-background border border-border rounded-md px-2 py-1.5 text-sm flex-1 sm:flex-none sm:w-[100px]"
                  >
                    <option value="tag">Tag</option>
                    <option value="keyword">Keyword</option>
                    <option value="date">Date</option>
                  </select>
                  
                  <select
                    value={rule.operator}
                    onChange={(e) => handleRuleChange(index, 'operator', e.target.value)}
                    className="bg-background border border-border rounded-md px-2 py-1.5 text-sm flex-1 sm:flex-none sm:w-[110px]"
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
                
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
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
                  
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveRule(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0">
                    <X className="w-4 h-4" />
                  </Button>
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || rules.length === 0}>Save Folder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
