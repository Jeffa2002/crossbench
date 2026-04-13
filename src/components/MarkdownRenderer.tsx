'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#C8D4E8', margin: '0 0 12px', lineHeight: 1.3 }}>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#E8F0FF', margin: '18px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(46,139,87,0.3)', paddingBottom: '4px' }}>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#E8F0FF', margin: '14px 0 6px' }}>
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p style={{ color: '#C8D4E8', lineHeight: 1.75, fontSize: '14px', margin: '0 0 10px' }}>
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong style={{ color: '#E8F0FF', fontWeight: 700 }}>
            {children}
          </strong>
        ),
        ul: ({ children }) => (
          <ul style={{ color: '#C8D4E8', lineHeight: 1.75, fontSize: '14px', margin: '4px 0 10px', paddingLeft: '20px' }}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol style={{ color: '#C8D4E8', lineHeight: 1.75, fontSize: '14px', margin: '4px 0 10px', paddingLeft: '20px' }}>
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li style={{ marginBottom: '4px' }}>
            {children}
          </li>
        ),
        hr: () => (
          <hr style={{ border: 'none', borderTop: '1px solid rgba(46,139,87,0.2)', margin: '16px 0' }} />
        ),
        blockquote: ({ children }) => (
          <blockquote style={{ borderLeft: '3px solid rgba(46,139,87,0.5)', paddingLeft: '12px', margin: '8px 0', color: '#A0B0C8', fontStyle: 'italic' }}>
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code style={{ backgroundColor: 'rgba(46,139,87,0.15)', padding: '1px 5px', borderRadius: '3px', fontSize: '13px', color: '#90EE90' }}>
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
