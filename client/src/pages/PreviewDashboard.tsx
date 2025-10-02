function CommissionerCard({
  icon,
  title,
  desc,
  count = 0,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  count?: number;
}) {
  return (
    <div
      className="bg-neutral-panel shadow-card rounded-lg p-5 flex items-center gap-4 hover:shadow-elevated transition-all duration-fast ease-brand cursor-pointer group"
      data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div
        className="w-12 h-12 rounded-lg grid place-items-center flex-shrink-0 text-2xl transition-transform group-hover:scale-110 duration-fast"
        style={{
          background: 'color-mix(in srgb, var(--brand-teal) 20%, transparent)',
          color: 'var(--brand-teal)',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-white text-lg">{title}</div>
        <div className="text-white/70 text-sm">{desc}</div>
      </div>
      {count > 0 && (
        <span
          className="px-3 py-1 rounded-pill text-sm font-semibold"
          style={{
            background: 'var(--cta-gradient)',
            color: '#000',
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

export default function PreviewDashboard() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Lato:wght@300;400;700&display=swap');
      `}</style>

      <div className="mx-auto max-w-3xl p-6 min-h-screen">
        <header className="mb-8">
          <h1
            className="text-3xl md:text-4xl font-black uppercase mb-3"
            style={{
              fontFamily: 'Archivo Black, system-ui, sans-serif',
              background: 'var(--cta-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            data-testid="heading-commissioner-console"
          >
            Commissioner Console
          </h1>
          <p
            className="text-white/80 text-lg"
            style={{ fontFamily: 'Lato, system-ui, sans-serif' }}
          >
            What needs your decision right now?
          </p>
        </header>

        <div className="space-y-4 mb-8">
          <CommissionerCard
            icon={<span>⚡</span>}
            title="League Actions (Inbox)"
            desc="Trades, waivers, rule issues waiting for review"
            count={3}
          />
          <CommissionerCard
            icon={<span>📊</span>}
            title="Transaction Review"
            desc="Approve/deny moves with an audit trail"
          />
          <CommissionerCard
            icon={<span>🏆</span>}
            title="Fairness Review"
            desc="Evidence packs + constitution precedent"
          />
          <CommissionerCard
            icon={<span>📰</span>}
            title="League Reports"
            desc="Auto-generated weekly commissioner recap"
          />
          <CommissionerCard
            icon={<span>💬</span>}
            title="ChatOps"
            desc="Moderate disputes via Discord; track escalations"
          />
        </div>

        <div className="rounded-lg shadow-card bg-neutral-panel p-6">
          <h2 className="text-xl font-bold text-white mb-3">Quick Actions</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              className="px-6 py-3 rounded-pill font-bold text-black transition-transform hover:scale-105 active:scale-95 shadow-button"
              style={{ background: 'var(--cta-gradient)' }}
              data-testid="button-approve-all"
            >
              Approve Pending
            </button>
            <button
              className="px-6 py-3 rounded-pill font-bold border-2 transition-colors hover:bg-white/5"
              style={{
                borderColor: 'var(--brand-teal)',
                color: 'var(--brand-teal)',
              }}
              data-testid="button-generate-report"
            >
              Generate Report
            </button>
            <button
              className="px-6 py-3 rounded-pill font-bold border-2 border-white/20 text-white/80 hover:bg-white/5 transition-colors"
              data-testid="button-view-audit"
            >
              View Audit Log
            </button>
          </div>
        </div>

        <footer className="text-white/60 text-sm mt-12 text-center">
          <p>Commissioner-first design philosophy</p>
          <p className="text-white/40 mt-1">Lead with actions, not advice</p>
        </footer>
      </div>
    </>
  );
}
