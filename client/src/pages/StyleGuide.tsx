import { ColorSwatch } from '@/components/guide/ColorSwatch';
import { CodeBlock } from '@/components/guide/CodeBlock';

const TOKENS_SNIPPET = `:root {
  /* Brand */
  --brand-teal: #009898;
  --brand-slate: #042E2E;
  --brand-cta-pink: #FF4D6D;
  --brand-cta-coral: #FF7A59;
  --brand-gold: #FFB100;

  /* Neutral */
  --neutral-white: #F8F8F8;
  --neutral-ink: #0B0B0D;
  --neutral-panel: #121619;

  /* Typography */
  --font-display: 'Archivo Black', system-ui, sans-serif;
  --font-body: 'Lato', system-ui, sans-serif;

  /* Radii, Spacing, Shadows, Motion... */
  /* See src/styles/tokens.css for full list */
}`;

const TAILWIND_USAGE = `/* Use brand tokens via Tailwind */
<div className="bg-brand-teal text-neutral-white">
  <h1 className="text-brand-gold">Welcome</h1>
  <button className="bg-cta-pink rounded-pill shadow-button">
    Click Me
  </button>
</div>`;

export default function StyleGuide() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Lato:wght@300;400;700&display=swap');
      `}</style>
      
      <div className="mx-auto max-w-6xl p-6 min-h-screen">
        <header className="mb-8">
          <h1
            className="text-4xl md:text-5xl font-black uppercase mb-3"
            style={{
              fontFamily: "Archivo Black, system-ui, sans-serif",
              background: "var(--cta-gradient)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
            data-testid="heading-style-guide"
          >
            THE COMMISH
          </h1>
          <h2 className="text-2xl font-bold text-white mb-2">Design System & Style Guide</h2>
          <p className="text-white/80 max-w-2xl">
            Foundational design tokens and patterns for GoodGuy AI. Non-breaking addition to existing Tailwind + shadcn/ui stack.
          </p>
        </header>

        <section className="space-y-4 mb-10">
          <h2 className="text-2xl font-bold text-white">Brand Identity</h2>
          <div className="rounded-lg shadow-card bg-neutral-panel p-6">
            <div className="space-y-2">
              <div>
                <strong className="text-white">Product:</strong>{' '}
                <span className="text-white/80">THE COMMISH — AI co-commissioner for fantasy leagues</span>
              </div>
              <div>
                <strong className="text-white">Tagline:</strong>{' '}
                <span className="text-white/80">Play Nice.</span>
              </div>
              <div>
                <strong className="text-white">Voice:</strong>{' '}
                <span className="text-white/80">Modern, confident, playful snark; GitHub-clean</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 mb-10">
          <h2 className="text-2xl font-bold text-white">Color Palette</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ColorSwatch
              name="Teal Core"
              value="#009898"
              varName="--brand-teal"
              desc="Primary brand color"
            />
            <ColorSwatch
              name="Deep Slate"
              value="#042E2E"
              varName="--brand-slate"
              desc="Dark accent"
            />
            <ColorSwatch
              name="CTA Pink"
              value="#FF4D6D"
              varName="--brand-cta-pink"
              desc="Gradient start"
            />
            <ColorSwatch
              name="CTA Coral"
              value="#FF7A59"
              varName="--brand-cta-coral"
              desc="Gradient end"
            />
            <ColorSwatch
              name="Gold"
              value="#FFB100"
              varName="--brand-gold"
              desc="Accent highlights"
            />
            <ColorSwatch
              name="Panel"
              value="#121619"
              varName="--neutral-panel"
              desc="Card backgrounds"
            />
          </div>
        </section>

        <section className="space-y-4 mb-10">
          <h2 className="text-2xl font-bold text-white">Typography</h2>
          <p className="text-white/70 text-sm mb-3">
            Demo fonts (Archivo Black + Lato) loaded only on this page. Main app continues using Inter.
          </p>
          
          <div className="rounded-lg shadow-card bg-neutral-panel p-6 space-y-4">
            <div>
              <div className="text-xs text-white/60 mb-1">Display (Archivo Black)</div>
              <div
                style={{ fontFamily: "Archivo Black, system-ui, sans-serif" }}
                className="text-4xl uppercase text-white"
              >
                THE COMMISH
              </div>
            </div>
            
            <div>
              <div className="text-xs text-white/60 mb-1">Heading 2</div>
              <div
                style={{ fontFamily: "Archivo Black, system-ui, sans-serif" }}
                className="text-2xl uppercase text-white"
              >
                Section Heading
              </div>
            </div>
            
            <div>
              <div className="text-xs text-white/60 mb-1">Lead Text (Lato)</div>
              <p
                style={{ fontFamily: "Lato, system-ui, sans-serif", fontSize: "var(--fs-lead)" }}
                className="text-white/90"
              >
                Lead text size for intros and hero copy. Lato provides excellent readability at all sizes.
              </p>
            </div>
            
            <div>
              <div className="text-xs text-white/60 mb-1">Body Text (Lato)</div>
              <p
                style={{ fontFamily: "Lato, system-ui, sans-serif" }}
                className="text-white/80"
              >
                Standard body copy with clean, modern letterforms. Perfect for long-form content and UI labels.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 mb-10">
          <h2 className="text-2xl font-bold text-white">Gradient CTA</h2>
          <div className="rounded-lg shadow-card bg-neutral-panel p-6">
            <div
              className="inline-block px-8 py-4 rounded-pill text-xl font-bold text-black cursor-pointer transition-transform hover:scale-105"
              style={{ background: "var(--cta-gradient)" }}
              data-testid="button-cta-demo"
            >
              Primary CTA Button
            </div>
          </div>
        </section>

        <section className="space-y-4 mb-10">
          <h2 className="text-2xl font-bold text-white">Design Tokens (CSS Variables)</h2>
          <CodeBlock title="src/styles/tokens.css" code={TOKENS_SNIPPET} />
        </section>

        <section className="space-y-4 mb-10">
          <h2 className="text-2xl font-bold text-white">Tailwind Usage</h2>
          <p className="text-white/70 text-sm mb-3">
            Tokens are mapped into Tailwind config. Use brand utilities alongside existing shadcn classes.
          </p>
          <CodeBlock title="Tailwind with Brand Tokens" code={TAILWIND_USAGE} />
        </section>

        <section className="space-y-4 mb-10">
          <h2 className="text-2xl font-bold text-white">Integration Notes</h2>
          <div className="rounded-lg shadow-card bg-neutral-panel p-6 space-y-3 text-white/80">
            <div>
              <strong className="text-white">✅ Non-Breaking:</strong> All existing pages continue to work with shadcn/ui
            </div>
            <div>
              <strong className="text-white">✅ Additive Only:</strong> Brand tokens available via Tailwind classes
            </div>
            <div>
              <strong className="text-white">✅ Portable:</strong> Copy tokens.json + tokens.css to any project
            </div>
            <div>
              <strong className="text-white">📦 Location:</strong> client/src/styles/tokens.{'{json,css}'}
            </div>
          </div>
        </section>

        <footer className="text-white/60 text-sm mt-12 pb-8 border-t border-white/10 pt-6">
          © {new Date().getFullYear()} GoodGuy AI — Play Nice.
        </footer>
      </div>
    </>
  );
}
