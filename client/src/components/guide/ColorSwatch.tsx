export function ColorSwatch({
  name,
  value,
  varName,
  desc,
}: {
  name: string;
  value: string;
  varName?: string;
  desc?: string;
}) {
  return (
    <div className="rounded-lg shadow-card bg-neutral-panel p-4 flex gap-4 items-center" data-testid={`swatch-${name.toLowerCase().replace(/\s+/g, '-')}`}>
      <div
        className="w-12 h-12 rounded-lg shadow-card flex-shrink-0"
        style={{ background: value }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white">{name}</div>
        <div className="text-white/80 text-sm">
          {value}
          {varName && <span className="text-white/60"> – {varName}</span>}
        </div>
        {desc && <div className="text-white/60 text-xs mt-1">{desc}</div>}
      </div>
    </div>
  );
}
