import SqlPlayground from '@/components/SqlPlayground';

export default function SqlPracticePage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SQL Sandbox</h1>
        <p className="text-gray-400">
          Write and run SQL queries instantly in your browser. Powered by DuckDB-WASM.
        </p>
      </header>
      
      <SqlPlayground />
    </div>
  );
}
