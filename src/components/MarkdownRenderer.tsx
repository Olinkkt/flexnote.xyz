import React, { useMemo } from 'react';
import katex from 'katex';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const htmlContent = useMemo(() => {
    if (!content) return '';

    // Step 1: Extract and replace display math ($$ ... $$)
    const mathBlocks: string[] = [];
    let processed = content.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        const rendered = katex.renderToString(math.trim(), {
          displayMode: true,
          throwOnError: false,
        });
        const index = mathBlocks.length;
        mathBlocks.push(
          `<div class="duo-math-card my-3 py-3 px-4 bg-white border-2 border-duoGray-border border-b-4 rounded-2xl flex justify-center items-center overflow-x-auto shadow-xs select-all text-duoGray-charcoal w-full">${rendered}</div>`
        );
        return `%%%MATHBLOCK_${index}%%%`;
      } catch (err) {
        return `$$${math}$$`;
      }
    });

    // Step 2: Extract and replace inline math ($ ... $)
    const inlineMath: string[] = [];
    processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
      try {
        const rendered = katex.renderToString(math.trim(), {
          displayMode: false,
          throwOnError: false,
        });
        const index = inlineMath.length;
        inlineMath.push(
          `<span class="inline-math px-1 py-0.5 font-bold text-[#000437] select-all">${rendered}</span>`
        );
        return `%%%MATHINLINE_${index}%%%`;
      } catch (err) {
        return `$${math}$`;
      }
    });

    // Step 3: Configure marked for GFM and clean styling
    marked.setOptions({
      gfm: true,
      breaks: true,
    });

    // Parse markdown to HTML
    let rawHtml = marked.parse(processed) as string;

    // Step 4: Restore math blocks and inline math
    mathBlocks.forEach((block, idx) => {
      rawHtml = rawHtml.replace(new RegExp(`%%%MATHBLOCK_${idx}%%%`, 'g'), block);
    });

    inlineMath.forEach((inline, idx) => {
      rawHtml = rawHtml.replace(new RegExp(`%%%MATHINLINE_${idx}%%%`, 'g'), inline);
    });

    return rawHtml;
  }, [content]);

  return (
    <div
      className="markdown-body font-sans text-[14px] leading-relaxed text-duoGray-charcoal select-text"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
