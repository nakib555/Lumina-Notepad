import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkToc from 'remark-toc';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { CodeBlock } from "./code-block";
import { processCustomMarkdown } from "./utils";

interface EditorAreaProps {
  isPreviewMode: boolean;
  content: string;
  theme: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLTextAreaElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLTextAreaElement>) => void;
}

export const EditorArea = ({
  isPreviewMode,
  content,
  theme,
  textareaRef,
  handleContentChange,
  handleDrop,
  handleDragOver
}: EditorAreaProps) => {
  if (isPreviewMode) {
    return (
      <div className="prose prose-slate dark:prose-invert max-w-none pb-32 font-sans text-[14pt] prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:not-italic prose-blockquote:text-muted-foreground prose-code:text-primary prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:p-0 prose-pre:bg-transparent prose-img:rounded-xl">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkBreaks, [remarkToc, { heading: 'toc|contents|table of contents', tight: true }]]} 
          rehypePlugins={[rehypeRaw, rehypeSlug]}
          components={{
            pre: ({ children }) => <>{children}</>,
            code: (props) => <CodeBlock {...props} theme={theme} />
          }}
        >
          {processCustomMarkdown(content || "_No content yet..._")}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleContentChange}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        placeholder="Start typing with markdown support... (# Heading, *italic*, **bold**, etc.)\nType '/' for commands or drag & drop images."
        className="w-full min-h-[500px] pb-32 text-[14pt] text-foreground placeholder:text-muted-foreground/50 border-none outline-none bg-transparent resize-none focus-visible:ring-0 p-0 leading-relaxed font-sans overflow-hidden"
      />
    </div>
  );
};
