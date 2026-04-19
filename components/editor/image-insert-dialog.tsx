import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, Upload, Image as ImageIcon, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ImageInsertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertUrl: (url: string, alt: string) => void;
  onInsertFile: (file: File) => void;
}

export function ImageInsertDialog({ isOpen, onClose, onInsertUrl, onInsertFile }: ImageInsertDialogProps) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!url.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsValid(null);
      setIsValidating(false);
      return;
    }

    let isMounted = true;
    setIsValidating(true);
    setIsValid(null);

    const checkImage = new Image();
    checkImage.onload = () => {
      if (isMounted) {
        setIsValid(true);
        setIsValidating(false);
      }
    };
    checkImage.onerror = () => {
      if (isMounted) {
        setIsValid(false);
        setIsValidating(false);
      }
    };
    
    // Add a slight delay to avoid spamming network requests while typing
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        checkImage.src = url.trim();
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [url]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onInsertUrl(url.trim(), alt.trim() || "image");
      setUrl("");
      setAlt("");
      setIsValid(null);
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onInsertFile(file);
      onClose();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Rest of the effect reset when closed
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl("");
      setAlt("");
      setIsValid(null);
      setIsValidating(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Insert Image
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="url" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="w-4 h-4" /> URL
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" /> Device
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="url" className="space-y-4 mt-4">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <div className="relative">
                  <Input 
                    id="image-url" 
                    placeholder="https://example.com/image.png" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    autoFocus
                    className="pr-10 border-r-0"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    {isValidating && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
                    {!isValidating && isValid === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {!isValidating && isValid === false && <XCircle className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-alt">Alt Text (optional)</Label>
                <Input 
                  id="image-alt" 
                  placeholder="Description of the image" 
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={!url.trim() || isValid === false}>Insert</Button>
              </DialogFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Upload from your device</p>
                <p className="text-xs text-muted-foreground mb-4">PNG, JPG, GIF, WebP</p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
