import React, { useRef, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkToc from 'remark-toc';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { CodeBlock } from "./code-block";
import { processCustomMarkdown } from "./utils";

interface EditorAreaProps {
  isPreviewMode: boolean;
  content: string;
  theme: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLTextAreaElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLTextAreaElement>) => void;
  onPreviewEdit?: (newContent: string) => void;
}

const MemoizedMarkdown = memo(({ content, theme }: { content: string, theme: string }) => {
  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm, remarkBreaks, [remarkToc, { heading: 'toc|contents|table of contents', tight: true }]]} 
      rehypePlugins={[rehypeRaw, rehypeSlug]}
      components={{
        pre: ({ children }) => <>{children}</>,
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match && !String(children).includes('\n');
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { node, ...rest } = props as Record<string, unknown>;
          return (
            <CodeBlock inline={isInline} className={className} theme={theme} {...rest}>
              {children}
            </CodeBlock>
          );
        }
      }}
    >
      {processCustomMarkdown(content || "_No content yet..._")}
    </ReactMarkdown>
  );
}, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content && prevProps.theme === nextProps.theme;
});

export const EditorArea = ({
  isPreviewMode,
  content,
  theme,
  textareaRef,
  handleContentChange,
  handleDrop,
  handleDragOver,
  onPreviewEdit
}: EditorAreaProps) => {
  const previewRef = useRef<HTMLDivElement>(null);

  const handlePreviewBlur = () => {
    if (previewRef.current && onPreviewEdit) {
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
      });
      
      turndownService.use(gfm as import('turndown').Plugin);
      
      // Add rule for custom code blocks
      turndownService.addRule('customCodeBlock', {
        filter: function (node) {
          return node.nodeType === 1 && node.nodeName === 'DIV' && (node as HTMLElement).classList.contains('not-prose') && (node as HTMLElement).querySelector('.capitalize') !== null;
        },
        replacement: function (_content, node) {
          const languageSpan = (node as HTMLElement).querySelector('.capitalize');
          const language = languageSpan ? languageSpan.textContent?.trim() : '';
          const codeContainer = (node as HTMLElement).querySelector('.overflow-x-auto');
          const code = codeContainer ? codeContainer.textContent : '';
          const lang = language === 'text' ? '' : language;
          return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
        }
      });

      // Preserve HTML tags that don't have standard markdown equivalents
      turndownService.addRule('preserveHtmlTags', {
        filter: ['u', 'sub', 'sup'],
        replacement: function (content, node) {
          const tag = node.nodeName.toLowerCase();
          return `<${tag}>${content}</${tag}>`;
        }
      });

      // Add rule to keep custom formatting like [text]{size}
      turndownService.addRule('fontSizeSpan', {
        filter: function (node) {
          return (
            node.nodeType === 1 &&
            node.nodeName === 'SPAN' &&
            (node as HTMLElement).getAttribute('style') !== null &&
            (node as HTMLElement).getAttribute('style')?.includes('font-size') === true
          );
        },
        replacement: function (content, node) {
          const style = (node as HTMLElement).getAttribute('style') || '';
          const match = style.match(/font-size:\s*([^;]+)/);
          if (match && match[1]) {
            return `[${content}]{${match[1].trim()}}`;
          }
          return content;
        }
      });

      const markdown = turndownService.turndown(previewRef.current.innerHTML);
      onPreviewEdit(markdown);
    }
  };

  if (isPreviewMode) {
    return (
      <div 
        ref={previewRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        onBlur={handlePreviewBlur}
        className="prose prose-slate dark:prose-invert max-w-none pb-32 text-lg whitespace-pre-wrap prose-p:leading-[1.8] prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline prose-strong:font-semibold prose-strong:text-foreground prose-li:marker:text-muted-foreground prose-hr:border-border prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:bg-muted/20 prose-blockquote:px-6 prose-blockquote:py-3 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:rounded-r-lg prose-code:text-foreground prose-code:bg-muted/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-[0.9em] prose-code:font-medium prose-code:before:content-none prose-code:after:content-none prose-pre:p-0 prose-pre:bg-transparent prose-img:rounded-xl outline-none focus:ring-0"
      >
        <MemoizedMarkdown content={content} theme={theme} />
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
        className="w-full min-h-[500px] pb-32 text-lg text-foreground placeholder:text-muted-foreground/30 border-none outline-none bg-transparent resize-none focus-visible:ring-0 p-0 leading-[1.8] overflow-hidden"
      />
    </div>
  );
};
