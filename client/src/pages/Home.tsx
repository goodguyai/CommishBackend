import { HomeCTAs } from '@/components/HomeCTAs';

export function HomePage() {
  return (
    <div className="min-h-screen bg-[#050607] flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-[#F5F7FA] mb-4" data-testid="text-title">
            THE COMMISH
          </h1>
          <p className="text-xl text-[#9CA3AF]" data-testid="text-subtitle">
            Your AI-powered fantasy football commissioner
          </p>
        </div>

        <HomeCTAs />

        <div className="mt-12 text-center">
          <p className="text-sm text-[#6B7280]">
            Choose your path to get started
          </p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
