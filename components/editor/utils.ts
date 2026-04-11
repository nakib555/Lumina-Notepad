export interface HistoryItem {
  title: string;
  content: string;
}

export const processCustomMarkdown = (content: string) => {
  if (!content) return "";
  // Split by code blocks to avoid replacing inside them
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) return part; // It's a code block
    // Replace [text]{size} with <span style="font-size: size;">text</span>
    // Using non-greedy match for the text part to allow multiple on same line
    return part.replace(/\[(.*?)\]\{([^}]+)\}/g, '<span style="font-size: $2;">$1</span>');
  }).join('');
};
