/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Crop as CropIcon, Maximize2, Settings, AlignLeft, AlignCenter, AlignRight, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  image: HTMLImageElement | null;
  onConfirm: (newSrc: string, width: string, height: string, alt: string, align: 'left'|'center'|'right') => void;
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
  const [alt, setAlt] = useState('');
  const [align, setAlign] = useState<'left'|'center'|'right'>('center');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSrc, setImgSrc] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!imgSrc.trim()) {
      setIsValid(null);
      setIsValidating(false);
      return;
    }

    let isMounted = true;
    setIsValidating(true);
    setIsValid(null);

    const checkImage = new Image();
    
    // Attempt multiple loading strategies for external images
    checkImage.crossOrigin = isExternal ? "anonymous" : "";
    
    checkImage.onload = () => {
      if (isMounted) {
        setIsValid(true);
        setIsValidating(false);
      }
    };
    checkImage.onerror = () => {
      if (isMounted) {
        // Fallback for CORS errors - if crossOrigin caused death, try without it
        if (checkImage.crossOrigin === "anonymous") {
           const fallbackImage = new Image();
           fallbackImage.onload = () => { if (isMounted) { setIsValid(true); setIsValidating(false); }};
           fallbackImage.onerror = () => { if (isMounted) { setIsValid(false); setIsValidating(false); }};
           fallbackImage.src = imgSrc.trim();
        } else {
           setIsValid(false);
           setIsValidating(false);
        }
      }
    };
    
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        checkImage.src = imgSrc.trim();
      }
    }, 500); // Increased slightly to prevent spamming while typing

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      checkImage.src = ""; // cancel image load
    };
  }, [imgSrc, isExternal]);

  useEffect(() => {
    if (isOpen && image) {
      const src = image.src;
      setImgSrc(src);
      
      // Check if it's an external URL that might have CORS issues
      setIsExternal(src.startsWith('http') && !src.includes(window.location.hostname));
      
      setWidth(image.style.width || image.getAttribute('width') || `${image.naturalWidth}px`);
      setHeight(image.style.height || image.getAttribute('height') || 'auto');
      setAlt(image.alt || '');
      
      const parentStyle = image.parentElement?.style.textAlign || image.parentElement?.style.justifyContent;
      if (parentStyle === 'left' || parentStyle === 'flex-start') setAlign('left');
      else if (parentStyle === 'right' || parentStyle === 'flex-end') setAlign('right');
      else setAlign('center');

      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [isOpen, image]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }

  const handleResizeConfirm = () => {
    onConfirm(imgSrc, width, height, alt, align);
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
        onConfirm(base64Image, `${canvas.width}px`, 'auto', alt, align);
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="resize" className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4" /> Resize
            </TabsTrigger>
            <TabsTrigger value="crop" className="flex items-center gap-2">
              <CropIcon className="w-4 h-4" /> Crop
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="img-src">Image Source (URL)</Label>
                <div className="relative">
                  <Input 
                    id="img-src" 
                    value={imgSrc}
                    onChange={(e) => setImgSrc(e.target.value)}
                    placeholder="https://..."
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
                <Label htmlFor="img-alt">Alt Text & Caption</Label>
                <Input 
                  id="img-alt" 
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="Describe image..."
                />
                <p className="text-xs text-muted-foreground">Used for accessibility and markdown image alt tag.</p>
              </div>
              
              <div className="space-y-2">
                <Label>Alignment</Label>
                <div className="flex bg-muted/50 p-1 rounded-lg">
                  <Button
                    type="button"
                    variant={align === 'left' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setAlign('left')}
                  >
                    <AlignLeft className="w-4 h-4 mr-2" /> Left
                  </Button>
                  <Button
                    type="button"
                    variant={align === 'center' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setAlign('center')}
                  >
                    <AlignCenter className="w-4 h-4 mr-2" /> Center
                  </Button>
                  <Button
                    type="button"
                    variant={align === 'right' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setAlign('right')}
                  >
                    <AlignRight className="w-4 h-4 mr-2" /> Right
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleResizeConfirm} disabled={!imgSrc.trim() || isValid === false}>Apply Settings</Button>
              </DialogFooter>
            </div>
          </TabsContent>

          <TabsContent value="resize" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center border border-border rounded-lg p-4 bg-muted/30 overflow-hidden min-h-[200px]">
                {imgSrc ? (
                  <div className="relative group inline-block">
                    <img
                      src={imgSrc}
                      alt="Resize preview"
                      style={{ 
                        width: width.endsWith('%') ? width : (width === 'auto' ? 'auto' : width),
                        height: height === 'auto' ? 'auto' : height,
                        maxWidth: '100%',
                        maxHeight: '300px',
                        objectFit: 'contain'
                      }}
                      className="transition-all duration-200"
                    />
                    {/* Visual resize handles simulation */}
                    <div className="absolute inset-0 border-2 border-primary/50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      <div className="absolute top-0 left-0 w-2 h-2 bg-primary -translate-x-1/2 -translate-y-1/2" />
                      <div className="absolute top-0 right-0 w-2 h-2 bg-primary translate-x-1/2 -translate-y-1/2" />
                      <div className="absolute bottom-0 left-0 w-2 h-2 bg-primary -translate-x-1/2 translate-y-1/2" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-primary translate-x-1/2 translate-y-1/2" />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No image source</p>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Visual Scale</Label>
                  <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                    {width.endsWith('%') ? width : 'Custom'}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  value={width.endsWith('%') ? width.replace('%', '') : 100} 
                  onChange={(e) => {
                    setWidth(`${e.target.value}%`);
                    setHeight('auto');
                  }}
                  className="w-full accent-primary"
                />
                <div className="flex gap-2 pt-1">
                  {[25, 50, 75, 100].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-7"
                      onClick={() => {
                        setWidth(`${preset}%`);
                        setHeight('auto');
                      }}
                    >
                      {preset}%
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="img-width">Width (Exact)</Label>
                  <Input 
                    id="img-width" 
                    placeholder="e.g. 100%, 300px" 
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="img-height">Height (Exact)</Label>
                  <Input 
                    id="img-height" 
                    placeholder="e.g. auto, 200px" 
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Tip: Use the slider for visual resizing or enter exact dimensions.
                </p>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs h-8"
                  onClick={() => {
                    if (image) {
                      setWidth(`${image.naturalWidth}px`);
                      setHeight('auto');
                    }
                  }}
                >
                  Reset to Original
                </Button>
              </div>
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
