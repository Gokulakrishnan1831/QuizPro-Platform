'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, User, Mail, Lock, Briefcase, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    status: 'fresher',
    experience: '0-1 years'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSignup = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('Attempting signup with:', formData);
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          status: formData.status
        }),
      });

      const data = await res.json();
      console.log('Signup response:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      setAuth(data.user, data.token);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Signup handler error:', err);
      setError(err.message);
      setStep(1); // Go back to first step to show error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card"
        style={{ width: '100%', maxWidth: '500px', padding: '3rem' }}
      >
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '2.5rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ 
              flex: 1, 
              height: '4px', 
              borderRadius: '2px',
              background: i <= step ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s ease'
            }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>Create Account</h2>
              <p style={{ color: '#a5b4fc', marginBottom: '2rem' }}>Let's get started with your basic info</p>

              {error && (
                <div style={{ color: '#ef4444', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} size={20} />
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} size={20} />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} size={20} />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
                <button onClick={nextStep} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                  Next Step <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>Professional Profile</h2>
              <p style={{ color: '#a5b4fc', marginBottom: '2rem' }}>Help us personalize your experience</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <label style={{ color: '#a5b4fc', fontSize: '0.9rem' }}>Current Status</label>
                <select 
                  className="input-field"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  style={{ appearance: 'none' }}
                >
                  <option value="fresher">Fresher</option>
                  <option value="student">Student</option>
                  <option value="working_professional">Working Professional</option>
                  <option value="career_break">Career Break</option>
                </select>

                <label style={{ color: '#a5b4fc', fontSize: '0.9rem' }}>Years of Experience</label>
                <select 
                  className="input-field"
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                >
                  <option value="0-1 years">0-1 years</option>
                  <option value="1-3 years">1-3 years</option>
                  <option value="3-5 years">3-5 years</option>
                  <option value="5+ years">5+ of years</option>
                </select>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button onClick={prevStep} style={{ 
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <ChevronLeft size={20} /> Back
                  </button>
                  <button onClick={nextStep} className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                    Continue <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ marginBottom: '2rem' }}>
                <CheckCircle2 size={64} color="var(--success)" style={{ margin: '0 auto' }} />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>Ready to Go!</h2>
              <p style={{ color: '#a5b4fc', marginBottom: '2rem' }}>Your profile is set up. Let's start your first practice session.</p>

              <button 
                onClick={handleSignup}
                disabled={loading}
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: '#6b7280' }}>
          Already have an account? <Link href="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: '600' }}>Login</Link>
        </div>
      </motion.div>
    </div>
  );
}
