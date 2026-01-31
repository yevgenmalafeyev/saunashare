import { SessionList } from '@/components/dashboard/SessionList';
import { CreateSessionButton } from '@/components/dashboard/CreateSessionButton';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-stone-50/80 backdrop-blur-lg border-b border-stone-200">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-stone-800">Banha</h1>
          <p className="text-stone-500 text-sm">Sauna cost sharing</p>
        </div>
      </header>

      <div className="px-4 py-4">
        <SessionList />
      </div>

      <CreateSessionButton />
    </main>
  );
}
