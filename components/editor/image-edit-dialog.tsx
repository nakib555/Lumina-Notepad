/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Crop as CropIcon, Maximize2 } from "lucide-react";
import { toast } from "sonner";

interface ImageEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  image: HTMLImageElement | null;
  onConfirm: (newSrc: string, width: string, height: string) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ImageEditDialog({ isOpen, onClose, image, onConfirm }: ImageEditDialogProps) {
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSrc, setImgSrc] = useState('');
  const [isExternal, setIsExternal] = useState(false);

  useEffect(() => {
    if (isOpen && image) {
      const src = image.src;
      setImgSrc(src);
      
      // Check if it's an external URL that might have CORS issues
      setIsExternal(src.startsWith('http') && !src.includes(window.location.hostname));
      
      setWidth(image.style.width || image.getAttribute('width') || `${image.naturalWidth}px`);
      setHeight(image.style.height || image.getAttribute('height') || 'auto');
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [isOpen, image]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }

  const handleResizeConfirm = () => {
    onConfirm(imgSrc, width, height);
    onClose();
  };

  const handleCropConfirm = async () => {
    if (completedCrop && imgRef.current) {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

        canvas.width = completedCrop.width * scaleX;
        canvas.height = completedCrop.height * scaleY;

        ctx.drawImage(
          imgRef.current,
          completedCrop.x * scaleX,
          completedCrop.y * scaleY,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY,
          0,
          0,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY
        );

        const base64Image = canvas.toDataURL('image/jpeg', 0.9);
        onConfirm(base64Image, `${canvas.width}px`, 'auto');
        onClose();
      } catch (err) {
        console.error("Failed to crop image. It might be a CORS issue with external URLs.", err);
        toast.error("Could not crop this image. External images may block cropping due to security restrictions.");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="resize" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resize" className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4" /> Resize
            </TabsTrigger>
            <TabsTrigger value="crop" className="flex items-center gap-2">
              <CropIcon className="w-4 h-4" /> Crop
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="resize" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="img-width">Width</Label>
                  <Input 
                    id="img-width" 
                    placeholder="e.g. 100%, 300px" 
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="img-height">Height</Label>
                  <Input 
                    id="img-height" 
                    placeholder="e.g. auto, 200px" 
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: Use "auto" for height to maintain aspect ratio.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleResizeConfirm}>Apply Resize</Button>
              </DialogFooter>
            </div>
          </TabsContent>
          
          <TabsContent value="crop" className="space-y-4 mt-4">
            {isExternal && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md text-amber-800 dark:text-amber-200 text-sm mb-4">
                <strong>Note:</strong> This is an external image. Cropping might fail due to browser security restrictions (CORS).
              </div>
            )}
            <div className="flex flex-col items-center justify-center border border-border rounded-lg p-2 bg-muted/30 overflow-hidden max-h-[400px]">
              {imgSrc ? (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imgSrc}
                    crossOrigin="anonymous"
                    style={{ maxHeight: '350px', width: 'auto' }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              ) : (
                <p className="text-sm text-muted-foreground">No image source</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleCropConfirm} disabled={!completedCrop?.width || !completedCrop?.height}>
                Apply Crop
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
