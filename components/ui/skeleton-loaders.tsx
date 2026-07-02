import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function SidebarSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      "w-72 border-r border-border bg-sidebar flex flex-col h-full shrink-0 animate-pulse print:hidden",
      className
    )}>
      {/* Header Skeleton */}
      <div className="p-5 border-b border-border flex items-center justify-between bg-sidebar">
        <div className="flex items-center gap-3">
          {/* Logo shape */}
          <div className="w-8 h-8 rounded-lg bg-muted/40 shrink-0" />
          {/* App title text shape */}
          <div className="h-5 w-20 bg-muted/40 rounded-md" />
          {/* Version badge */}
          <div className="h-3.5 w-10 bg-muted/20 rounded-full" />
        </div>
      </div>

      {/* Search Input Placeholder */}
      <div className="p-4 space-y-3 shrink-0">
        <div className="h-10 w-full bg-muted/35 rounded-xl border border-border/20" />
        
        {/* Quick Tabs */}
        <div className="flex gap-2">
          <div className="h-8 flex-1 bg-muted/20 rounded-lg" />
          <div className="h-8 flex-1 bg-muted/20 rounded-lg" />
          <div className="h-8 flex-1 bg-muted/20 rounded-lg" />
        </div>
      </div>

      {/* Note List / Tree Items */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {/* Category Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="h-4 w-16 bg-muted/30 rounded" />
          <div className="h-4 w-4 bg-muted/30 rounded-full" />
        </div>

        {/* List Items */}
        <div className="space-y-3">
          {[85, 60, 75, 45, 90, 70, 50, 80].map((width, idx) => (
            <div key={idx} className="flex items-center gap-3 py-1.5 px-2 rounded-lg">
              {/* Note Icon Shape */}
              <div className="w-5 h-5 rounded bg-muted/25 shrink-0" />
              {/* Note Title shape */}
              <div className="flex-1 space-y-2">
                <div 
                  className="h-3.5 bg-muted/30 rounded" 
                  style={{ width: `${width}%` }} 
                />
                {/* Optional tiny secondary line */}
                {idx % 2 === 0 && (
                  <div 
                    className="h-2.5 bg-muted/15 rounded w-[40%]" 
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar / PWA installation placeholder */}
      <div className="p-4 border-t border-border bg-sidebar/50 space-y-2 shrink-0">
        <div className="h-8 w-full bg-muted/20 rounded-lg" />
        <div className="flex justify-between items-center px-1">
          <div className="h-3 w-24 bg-muted/15 rounded" />
          <div className="h-3.5 w-12 bg-muted/25 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function EditorSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      "flex-1 flex flex-col h-full bg-background overflow-hidden animate-pulse",
      className
    )}>
      {/* Editor Header Toolbar */}
      <div className="h-14 px-4 border-b border-border flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-2">
          {/* Toggle button */}
          <div className="w-9 h-9 rounded-lg bg-muted/30" />
          <div className="w-px h-5 bg-border/50" />
          {/* Title breadcrumb */}
          <div className="h-4 w-28 bg-muted/20 rounded" />
        </div>
        
        {/* Right buttons */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted/20" />
          <div className="w-8 h-8 rounded-full bg-muted/20" />
          <div className="w-20 h-8 rounded-full bg-muted/30" />
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 sm:py-10 max-w-4xl w-full mx-auto space-y-8">
        {/* Date and tags meta bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-5 w-24 bg-muted/20 rounded-full" />
          <div className="h-5 w-16 bg-muted/15 rounded-full" />
          <div className="h-5 w-20 bg-muted/15 rounded-full" />
        </div>

        {/* Document Title (Thick bar) */}
        <div className="space-y-2">
          <div className="h-9 w-[60%] bg-muted/35 rounded-xl" />
        </div>

        {/* Divider line */}
        <div className="h-px bg-border/40 w-full" />

        {/* Rich body paragraph rows */}
        <div className="space-y-6">
          {/* Paragraph 1 */}
          <div className="space-y-3">
            <div className="h-4 w-[95%] bg-muted/25 rounded" />
            <div className="h-4 w-[90%] bg-muted/25 rounded" />
            <div className="h-4 w-[85%] bg-muted/25 rounded" />
            <div className="h-4 w-[40%] bg-muted/25 rounded" />
          </div>

          {/* Spacer block / Heading skeleton */}
          <div className="pt-2">
            <div className="h-6 w-[30%] bg-muted/30 rounded-lg" />
          </div>

          {/* Paragraph 2 */}
          <div className="space-y-3">
            <div className="h-4 w-[92%] bg-muted/25 rounded" />
            <div className="h-4 w-[88%] bg-muted/25 rounded" />
            <div className="h-4 w-[75%] bg-muted/25 rounded" />
          </div>

          {/* Image block simulation */}
          <div className="h-48 w-full bg-muted/15 rounded-2xl border border-border/10 flex items-center justify-center">
            {/* Center icon outline */}
            <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center" />
          </div>

          {/* Paragraph 3 */}
          <div className="space-y-3">
            <div className="h-4 w-[96%] bg-muted/25 rounded" />
            <div className="h-4 w-[65%] bg-muted/25 rounded" />
          </div>
        </div>
      </div>

      {/* Editor Bottom Bar */}
      <div className="h-10 px-4 border-t border-border bg-muted/5 flex items-center justify-between text-muted-foreground/40 text-xs shrink-0">
        <div className="h-3 w-28 bg-muted/20 rounded" />
        <div className="h-3 w-16 bg-muted/20 rounded" />
      </div>
    </div>
  );
}

export function EditorAreaSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("w-full h-full min-h-[500px] animate-pulse space-y-6 pt-4", className)}>
      <div className="space-y-3">
        <div className="h-4 w-[95%] bg-muted/25 rounded" />
        <div className="h-4 w-[90%] bg-muted/25 rounded" />
        <div className="h-4 w-[85%] bg-muted/25 rounded" />
        <div className="h-4 w-[40%] bg-muted/25 rounded" />
      </div>

      <div className="pt-2">
        <div className="h-6 w-[30%] bg-muted/30 rounded-lg" />
      </div>

      <div className="space-y-3">
        <div className="h-4 w-[92%] bg-muted/25 rounded" />
        <div className="h-4 w-[88%] bg-muted/25 rounded" />
        <div className="h-4 w-[75%] bg-muted/25 rounded" />
      </div>

      <div className="h-48 w-full bg-muted/15 rounded-2xl border border-border/10 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-muted/20" />
      </div>

      <div className="space-y-3">
        <div className="h-4 w-[96%] bg-muted/25 rounded" />
        <div className="h-4 w-[65%] bg-muted/25 rounded" />
      </div>
    </div>
  );
}

export function SketchDialogSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm animate-pulse">
      <div className="bg-background/95 border border-border/50 rounded-2xl shadow-2xl w-[95vw] lg:max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-muted/40 rounded" />
            <div className="h-4 w-32 bg-muted/40 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-muted/30 rounded-full" />
            <div className="h-8 w-20 bg-muted/20 rounded-full" />
          </div>
        </div>
        {/* Canvas Body */}
        <div className="flex-1 bg-muted/5 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-muted/20 rounded-full" />
            <div className="h-3.5 w-36 bg-muted/20 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
