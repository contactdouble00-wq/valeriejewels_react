import React, { useMemo } from 'react';

/**
 * Parses inline formatting like **bold** and *italic*
 */
function renderInlineFormatting(text) {
  if (!text) return null;
  // Match **bold** or *italic*
  const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={`b_${key++}`} className="font-semibold text-brand-tertiary">
          {match[2]}
        </strong>
      );
    } else if (match[4]) {
      parts.push(
        <em key={`i_${key++}`} className="italic">
          {match[4]}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Parses raw description text into semantic blocks:
 * - Paragraphs (normal text, preserving line breaks)
 * - Bullet lists (-, *, •, –, —, ✓, etc.)
 * - Numbered lists (1., 2., etc.)
 * - Emoji lists (✨, 💎, 🌸, etc.)
 */
function parseDescriptionBlocks(raw) {
  if (!raw) return [];
  // Convert <br> tags and Windows/Mac line endings into standard \n
  const normalized = String(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = normalized.split('\n');
  const blocks = [];
  let currentBlock = null;

  const bulletRegex = /^[\s]*[-*•–—✓✔➤➢►▸◆◇▪▫]\s*(.*)$/;
  const numberRegex = /^[\s]*(\d+)[.)]\s+(.*)$/;
  const emojiBulletRegex = /^[\s]*([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|\p{Extended_Pictographic})\s*(.*)$/u;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Blank line indicates paragraph / block separation
    if (!line) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    const bulletMatch = line.match(bulletRegex);
    const numberMatch = line.match(numberRegex);
    const emojiMatch = line.match(emojiBulletRegex);

    if (bulletMatch) {
      if (!currentBlock || currentBlock.type !== 'bullet_list') {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'bullet_list', items: [] };
      }
      currentBlock.items.push({ text: bulletMatch[1] });
    } else if (numberMatch) {
      if (!currentBlock || currentBlock.type !== 'number_list') {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'number_list', items: [] };
      }
      currentBlock.items.push({ text: numberMatch[2], num: numberMatch[1] });
    } else if (emojiMatch) {
      if (!currentBlock || currentBlock.type !== 'emoji_list') {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'emoji_list', items: [] };
      }
      currentBlock.items.push({ text: emojiMatch[2], emoji: emojiMatch[1] });
    } else {
      if (!currentBlock || currentBlock.type !== 'paragraph') {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'paragraph', lines: [line] };
      } else {
        currentBlock.lines.push(line);
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

export default function FormattedDescription({ content, className = '' }) {
  const blocks = useMemo(() => parseDescriptionBlocks(content), [content]);

  if (!blocks || blocks.length === 0) return null;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {blocks.map((block, bIdx) => {
        // Standard bullet point list
        if (block.type === 'bullet_list') {
          return (
            <ul key={bIdx} className="space-y-1.5 pl-0.5 my-1">
              {block.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 leading-relaxed text-brand-tertiary/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary/80 mt-1.5 shrink-0" />
                  <span className="flex-1">{renderInlineFormatting(item.text)}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Numbered list
        if (block.type === 'number_list') {
          return (
            <ol key={bIdx} className="space-y-1.5 pl-0.5 my-1">
              {block.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 leading-relaxed text-brand-tertiary/90">
                  <span className="text-[11px] font-mono font-bold text-brand-primary shrink-0 min-w-4 text-right mt-0.5">
                    {item.num}.
                  </span>
                  <span className="flex-1">{renderInlineFormatting(item.text)}</span>
                </li>
              ))}
            </ol>
          );
        }

        // Emoji bullet list (e.g. ✨, 💎, 🌸)
        if (block.type === 'emoji_list') {
          return (
            <ul key={bIdx} className="space-y-2 pl-0.5 my-1">
              {block.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 leading-relaxed text-brand-tertiary/90">
                  <span className="text-sm shrink-0 leading-none select-none mt-0.5">
                    {item.emoji}
                  </span>
                  <span className="flex-1">{renderInlineFormatting(item.text)}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Regular paragraph (preserving line breaks)
        return (
          <p key={bIdx} className="leading-relaxed text-brand-tertiary/90 font-light">
            {block.lines.map((l, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {renderInlineFormatting(l)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
