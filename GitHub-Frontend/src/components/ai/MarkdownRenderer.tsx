'use client';

import React from 'react';
import Link from 'next/link';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses inline markdown tags (bold, italic, inline code, safe links).
 */
function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  // Tokenizer pattern for bold, inline code, links, and italic
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.substring(lastIdx, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={match.index} className="font-bold text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-slate-800/90 text-amber-300 font-mono text-[11px] border border-slate-700/50"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const label = linkMatch[1];
        const href = linkMatch[2];
        const isExternal = href.startsWith('http://') || href.startsWith('https://');
        
        nodes.push(
          isExternal ? (
            <a
              key={match.index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors font-medium"
            >
              {label}
            </a>
          ) : (
            <Link
              key={match.index}
              href={href}
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors font-medium"
            >
              {label}
            </Link>
          )
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={match.index} className="italic text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      nodes.push(token);
    }

    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < text.length) {
    nodes.push(text.substring(lastIdx));
  }

  return nodes;
}

/**
 * Formats a block of table rows into a styled React table.
 */
function renderTable(tableRows: string[], keyPrefix: number): React.ReactNode {
  if (tableRows.length < 2) return null;

  const parseRow = (rowStr: string) =>
    rowStr
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  const headerCells = parseRow(tableRows[0]);
  // Row 1 is divider (|---|---|), skip it
  const bodyRows = tableRows.slice(2).map(parseRow);

  return (
    <div key={keyPrefix} className="my-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 shadow-inner">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
            {headerCells.map((cell, idx) => (
              <th key={idx} className="py-2 px-3 border-r last:border-r-0 border-slate-800/60">
                {parseInlineMarkdown(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="py-2 px-3 border-r last:border-r-0 border-slate-800/40 text-slate-200 font-mono text-[11px]">
                  {parseInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let idx = 0;

  while (idx < lines.length) {
    const line = lines[idx];
    const trimmed = line.trim();

    // 1. Code block handling (```lang ... ```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      idx++;
      while (idx < lines.length && !lines[idx].trim().startsWith('```')) {
        codeLines.push(lines[idx]);
        idx++;
      }
      idx++; // skip closing ```
      elements.push(
        <div key={idx} className="my-3 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-md">
          {lang && (
            <div className="bg-slate-900/90 px-3 py-1 border-b border-slate-800 text-[10px] font-mono font-bold text-slate-400 uppercase">
              {lang}
            </div>
          )}
          <pre className="p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed whitespace-pre">
            {codeLines.join('\n')}
          </pre>
        </div>
      );
      continue;
    }

    // 2. Table handling (| col1 | col2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows: string[] = [];
      while (idx < lines.length && lines[idx].trim().startsWith('|')) {
        tableRows.push(lines[idx]);
        idx++;
      }
      elements.push(renderTable(tableRows, idx));
      continue;
    }

    // 3. Headings
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={idx} className="text-sm sm:text-base font-bold text-amber-400 mt-4 mb-2 pb-1 border-b border-slate-800/80 flex items-center gap-1.5">
          {parseInlineMarkdown(trimmed.slice(3))}
        </h2>
      );
      idx++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={idx} className="text-xs sm:text-sm font-bold text-slate-100 mt-3 mb-1.5 flex items-center gap-1.5">
          {parseInlineMarkdown(trimmed.slice(4))}
        </h3>
      );
      idx++;
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={idx} className="text-xs font-semibold text-slate-300 mt-2 mb-1">
          {parseInlineMarkdown(trimmed.slice(5))}
        </h4>
      );
      idx++;
      continue;
    }

    // 4. Bullet lists (- item or * item)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: string[] = [];
      while (
        idx < lines.length &&
        (lines[idx].trim().startsWith('- ') || lines[idx].trim().startsWith('* '))
      ) {
        listItems.push(lines[idx].trim().slice(2));
        idx++;
      }
      elements.push(
        <ul key={idx} className="my-2 space-y-1 text-xs text-slate-300 pl-4 list-disc marker:text-amber-400">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="leading-relaxed">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 5. Numbered lists (1. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (idx < lines.length && /^\d+\.\s+/.test(lines[idx].trim())) {
        listItems.push(lines[idx].trim().replace(/^\d+\.\s+/, ''));
        idx++;
      }
      elements.push(
        <ol key={idx} className="my-2 space-y-1 text-xs text-slate-300 pl-4 list-decimal marker:text-indigo-400">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="leading-relaxed">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 6. Blockquotes (> note)
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={idx} className="my-2 p-2.5 rounded-r-lg border-l-2 border-amber-500 bg-amber-500/10 text-amber-200 text-xs italic">
          {parseInlineMarkdown(trimmed.slice(2))}
        </blockquote>
      );
      idx++;
      continue;
    }

    // 7. Empty line spacer
    if (trimmed === '') {
      idx++;
      continue;
    }

    // 8. Standard paragraph
    elements.push(
      <p key={idx} className="text-xs text-slate-200 leading-relaxed my-1.5">
        {parseInlineMarkdown(line)}
      </p>
    );
    idx++;
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
