'use client';

import { useState } from 'react';
import { Upload, FileJson, CheckCircle2, AlertCircle, Download, Sparkles, Wand2, Edit } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BulkUploadPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [jsonInput, setJsonInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [parsedPreview, setParsedPreview] = useState<any[] | null>(null);

  // 1. Handle standard JSON Upload
  const handleUpload = async (dataToUpload: any) => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToUpload),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setJsonInput('');
        setTextInput('');
        setParsedPreview(null);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Network error during upload.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle AI Parsing
  const handleAiParse = async () => {
    if (!textInput.trim()) return;
    setLoading(true);
    setError('');
    setParsedPreview(null);

    try {
      const res = await fetch('/api/ai/parse-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput }),
      });
      const data = await res.json();
      
      if (res.ok && data.questions) {
        setParsedPreview(data.questions);
      } else {
        setError(data.error || 'AI failed to parse questions.');
      }
    } catch (err) {
      setError('Error communicating with AI service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Bulk Question Upload</h1>
        <p style={{ color: '#a5b4fc' }}>Import questions manually or use AI to parse raw text.</p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('manual')}
          className={`btn-secondary ${activeTab === 'manual' ? 'bg-primary/20 border-primary' : ''}`}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: activeTab === 'manual' ? '1px solid var(--primary)' : '1px solid transparent', background: activeTab === 'manual' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)' }}
        >
          <FileJson size={18} style={{ marginRight: '8px', display: 'inline' }} /> JSON Import
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`btn-secondary ${activeTab === 'ai' ? 'bg-primary/20 border-primary' : ''}`}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: activeTab === 'ai' ? '1px solid var(--primary)' : '1px solid transparent', background: activeTab === 'ai' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)' }}
        >
          <Sparkles size={18} style={{ marginRight: '8px', display: 'inline' }} /> Magic AI Import
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* LEFT COLUMN: INPUT */}
        <section>
          <div className="glass-card" style={{ padding: '2rem' }}>
            {activeTab === 'manual' ? (
              <>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Paste JSON Array</h2>
                <textarea 
                  className="input-field"
                  style={{ minHeight: '400px', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '1.5rem' }}
                  placeholder='[{"question": "..."}]'
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                />
                <button 
                  onClick={() => handleUpload(JSON.parse(jsonInput))}
                  disabled={loading || !jsonInput}
                  className="btn-primary" 
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {loading ? 'Uploading...' : 'Start Import'} <Upload size={20} />
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                  Paste Raw Text (PDF/Blog/Notes)
                </h2>
                <textarea 
                  className="input-field"
                  style={{ minHeight: '400px', fontFamily: 'sans-serif', fontSize: '0.95rem', marginBottom: '1.5rem' }}
                  placeholder="Paste any messy text here. The AI will find the SQL questions..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
                <button 
                  onClick={handleAiParse}
                  disabled={loading || !textInput}
                  className="btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(to right, #8b5cf6, #ec4899)' }}
                >
                  {loading ? 'AI is Thinking...' : '✨ Magic Extract'} <Wand2 size={20} />
                </button>
              </>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: PREVIEW & RESULTS */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* AI PREVIEW MODE */}
          {activeTab === 'ai' && parsedPreview && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-card" 
              style={{ padding: '2rem', border: '1px solid #8b5cf6' }}
            >
              <h3 style={{ fontWeight: '700', marginBottom: '1rem', color: '#a5b4fc' }}>
                AI Found {parsedPreview.length} Questions
              </h3>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
                {parsedPreview.map((q, i) => (
                  <div key={i} style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{i + 1}. {q.question}</div>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                      Correct: <span style={{ color: '#34d399' }}>{q.correctAnswer}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setParsedPreview(null)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Discard
                </button>
                <button 
                  onClick={() => handleUpload(parsedPreview)}
                  className="btn-primary"
                  style={{ flex: 2, justifyContent: 'center' }}
                >
                  Looks Good, Save All <CheckCircle2 size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* SUCCESS / ERROR MESSAGES */}
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
                {result.errorCount > 0 && (
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--error)' }}>{result.errorCount}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Failed</div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {error && (
            <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--error)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--error)' }}>
                <AlertCircle size={24} />
                <h3 style={{ fontWeight: '700' }}>Action Failed</h3>
              </div>
              <p style={{ marginTop: '0.5rem', color: '#a5b4fc', fontSize: '0.9rem' }}>{error}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
