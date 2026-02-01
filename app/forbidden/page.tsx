export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">Access Denied</h1>
        <p className="text-stone-500 mb-6">
          You need a valid access link to use this app.
        </p>
        <p className="text-sm text-stone-400">
          Please contact the administrator for access.
        </p>
      </div>
    </main>
  );
}
