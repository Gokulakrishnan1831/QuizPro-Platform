'use client';

import { useState } from 'react';
import { Upload, FileJson, CheckCircle2, AlertCircle, Download } from 'lucide-react';

export default function BulkUploadPage() {
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const questions = JSON.parse(jsonInput);
      const res = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questions),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setJsonInput('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Invalid JSON format. Please check your input.');
    } finally {
      setLoading(false);
    }
  };

  const sampleJson = [
    {
      "domain": "Data Analytics",
      "skill": "SQL",
      "difficulty": "easy",
      "question": "Which SQL clause filters rows?",
      "options": ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
      "correctAnswer": "WHERE",
      "explanation": "WHERE filters rows before grouping.",
      "tags": ["filtering", "basics"]
    }
  ];

  return (
    <div>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Bulk Question Upload</h1>
        <p style={{ color: '#a5b4fc' }}>Import multiple questions at once using JSON format</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <section>
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileJson size={20} color="var(--primary)" /> JSON Input
            </h2>
            <textarea 
              className="input-field"
              style={{ minHeight: '400px', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '1.5rem' }}
              placeholder="Paste your JSON array here..."
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            <button 
              onClick={handleUpload}
              disabled={loading || !jsonInput}
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? 'Uploading...' : 'Start Import'} <Upload size={20} />
            </button>
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>Instructions</h2>
            <ul style={{ color: '#a5b4fc', fontSize: '0.95rem', lineHeight: '1.8', paddingLeft: '1.2rem' }}>
              <li>Ensure the input is a valid JSON array of objects.</li>
              <li>Each object must include: domain, skill, question, options (array), correctAnswer, and explanation.</li>
              <li>Domains and skills will be automatically created if they don't exist.</li>
              <li>Difficulty should be 'easy', 'medium', or 'hard'.</li>
            </ul>
            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Sample Format</span>
                <button 
                  onClick={() => setJsonInput(JSON.stringify(sampleJson, null, 2))}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={14} /> Copy to Editor
                </button>
              </div>
              <pre style={{ fontSize: '0.75rem', color: '#6b7280', overflowX: 'auto' }}>
                {JSON.stringify(sampleJson, null, 2)}
              </pre>
            </div>
          </div>

          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card" 
              style={{ padding: '2rem', border: '1px solid var(--success)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', marginBottom: '1rem' }}>
                <CheckCircle2 size={24} />
                <h3 style={{ fontWeight: '700' }}>Import Successful</h3>
              </div>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{result.successCount}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Imported</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: result.errorCount > 0 ? 'var(--error)' : 'inherit' }}>{result.errorCount}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Failed</div>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--error)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--error)' }}>
                <AlertCircle size={24} />
                <h3 style={{ fontWeight: '700' }}>Import Failed</h3>
              </div>
              <p style={{ marginTop: '0.5rem', color: '#a5b4fc', fontSize: '0.9rem' }}>{error}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
