import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LinkEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string, text: string) => void;
  initialText?: string;
}

export function LinkEditDialog({ isOpen, onClose, onConfirm, initialText = '' }: LinkEditDialogProps) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl('');
       
      setText(initialText);
    }
  }, [isOpen, initialText]);

  const handleConfirm = () => {
    if (!url) return;
    
    // Auto-add https:// if missing and not a relative/anchor link
    let finalUrl = url;
    if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('/') && !finalUrl.startsWith('#') && !finalUrl.startsWith('mailto:')) {
      finalUrl = `https://${finalUrl}`;
    }
    
    onConfirm(finalUrl, text || finalUrl);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert Link</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="link-text">Text to display</Label>
            <Input 
              id="link-text" 
              placeholder="e.g. Click here" 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="link-url">URL</Label>
            <Input 
              id="link-url" 
              placeholder="e.g. https://example.com" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!url}>Insert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
