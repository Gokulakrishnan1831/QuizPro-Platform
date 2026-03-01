'use client';

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as duckdb from '@duckdb/duckdb-wasm';
import { Play, Loader2, Database } from 'lucide-react';

export default function SqlPlayground({ initialSql = "SELECT * FROM employees LIMIT 5;" }: { initialSql?: string }) {
  const [db, setDb] = useState<any>(null);
  const [conn, setConn] = useState<any>(null);
  const [query, setQuery] = useState(initialSql);
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  // Initialize DuckDB WASM
  useEffect(() => {
    const initDB = async () => {
      try {
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
        
        const worker = await duckdb.createWorker(bundle.mainWorker!);
        const logger = new duckdb.ConsoleLogger();
        const newDb = new duckdb.AsyncDuckDB(logger, worker);
        
        await newDb.instantiate(bundle.mainModule, bundle.pthreadWorker);
        const newConn = await newDb.connect();
        
        // Create Sample Data (In-Memory)
        await newConn.query(`
          CREATE TABLE employees (id INTEGER, name VARCHAR, department VARCHAR, salary INTEGER);
          INSERT INTO employees VALUES 
          (1, 'Alice', 'Engineering', 120000),
          (2, 'Bob', 'Marketing', 80000),
          (3, 'Charlie', 'Engineering', 130000),
          (4, 'Diana', 'Sales', 95000),
          (5, 'Evan', 'Sales', 105000);
        `);

        setDb(newDb);
        setConn(newConn);
        setLoading(false);
      } catch (err: any) {
        console.error("DB Init Error:", err);
        setError("Failed to load SQL Engine: " + err.message);
        setLoading(false);
      }
    };

    initDB();

    return () => {
      if (conn) conn.close();
      if (db) db.terminate();
    };
  }, []);

  const runQuery = async () => {
    if (!conn) return;
    setRunning(true);
    setError('');
    setResults([]);

    try {
      const arrowResult = await conn.query(query);
      const resultJson = arrowResult.toArray().map((row: any) => row.toJSON());
      
      if (resultJson.length > 0) {
        setColumns(Object.keys(resultJson[0]));
        setResults(resultJson);
      } else {
        setResults([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-primary"><Loader2 className="animate-spin inline mr-2"/> Loading SQL Engine...</div>;

  return (
    <div className="flex flex-col h-[600px] border border-white/10 rounded-lg overflow-hidden bg-[#1e1e1e]">
      
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/10">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Database size={16} /> <span>employees (5 rows)</span>
        </div>
        <button 
          onClick={runQuery}
          disabled={running}
          className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          {running ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />} 
          Run Query
        </button>
      </div>

      {/* Split View */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Editor */}
        <div className="w-full md:w-1/2 h-full border-r border-white/10">
          <Editor
            height="100%"
            defaultLanguage="sql"
            theme="vs-dark"
            value={query}
            onChange={(val) => setQuery(val || '')}
            options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 16 } }}
          />
        </div>

        {/* Results */}
        <div className="w-full md:w-1/2 h-full bg-[#1e1e1e] overflow-auto p-4">
          {error ? (
            <div className="text-red-400 font-mono text-sm p-2 border border-red-900/50 bg-red-900/10 rounded">
              Error: {error}
            </div>
          ) : results.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col} className="border-b border-white/20 p-2 text-xs font-bold text-gray-400">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i} className="hover:bg-white/5 font-mono text-sm">
                    {columns.map(col => (
                      <td key={col} className="border-b border-white/10 p-2 text-gray-300">
                        {row[col]?.toString()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-gray-500 text-center mt-20 text-sm">
              Run a query to see results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
