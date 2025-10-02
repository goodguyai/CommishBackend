import { useState } from 'react';

export function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg shadow-card bg-neutral-panel p-4">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-white">{title}</strong>
        <button
          onClick={handleCopy}
          className="px-3 py-1 rounded-pill border border-white/10 hover:bg-white/5 transition duration-fast ease-brand text-sm"
          data-testid={`button-copy-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto text-sm leading-relaxed text-neutral-white/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
