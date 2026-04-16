'use client';

import { auth, googleProvider } from '@/lib/firebase/client';
import { signInWithPopup } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Target,
  BookOpen,
  Calendar,
  Building2,
  Check,
  Crown,
  Sparkles,
  Zap,
  FileText,
  Upload
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

/* ─── Types ────────────────────────────────────────────────────── */

type ProfileType = 'FRESHER' | 'EXPERIENCED';
type QuizGoal = 'PRACTICE' | 'INTERVIEW_PREP';
type PlanTier = 'FREE' | 'BASIC' | 'PRO' | 'ELITE';

const PLAN_OPTIONS = [
  {
    id: 'FREE' as PlanTier,
    name: 'Free',
    price: 0,
    quizzes: 1,
    color: 'var(--text-muted)',
    icon: '🎯',
    description: 'Try before you commit',
    features: ['1 AI-generated assessment', 'MCQ questions only', 'Basic score report', 'Skill accuracy breakdown'],
  },
  {
    id: 'BASIC' as PlanTier,
    name: 'Basic',
    price: 129,
    quizzes: 3,
    color: '#06b6d4',
    icon: '📚',
    description: 'Start your prep journey',
    features: ['3 AI-generated assessments', 'Practice & Interview Prep modes', 'Detailed Skill Gap Reports with focus on weak topics', 'AI performance summary', 'Segmented leaderboard access'],
  },
  {
    id: 'PRO' as PlanTier,
    name: 'Pro',
    price: 299,
    quizzes: 10,
    isPopular: true,
    color: '#6366f1',
    icon: '🚀',
    description: 'Most popular — full experience',
    features: ['10 AI-generated quizzes', 'Hands-on SQL & Excel questions', 'Company-specific interview prep (JD-tailored)', 'Improvement roadmap & focus topics', 'Per-skill leaderboard ranking', 'Priority support'],
  },
  {
    id: 'ELITE' as PlanTier,
    name: 'Elite',
    price: 499,
    quizzes: 20,
    color: '#f59e0b',
    icon: '👑',
    description: 'For serious job seekers',
    features: ['20 AI-generated quizzes', 'Everything in Pro', 'Company interview pattern analysis', 'Unlimited quiz retries', 'Resume analysis', 'Personalized mentorship access'],
  },
];

const PROFILE_TYPES = [
  {
    value: 'EXPERIENCED' as ProfileType,
    label: 'Experienced Professional',
    desc: 'I have work experience in data analytics (SQL, Excel, Power BI)',
    icon: Briefcase,
    color: '#6366f1',
  },
  {
    value: 'FRESHER' as ProfileType,
    label: 'Fresher / Student',
    desc: 'I\'m a graduate starting my career in data analytics',
    icon: GraduationCap,
    color: '#10b981',
  },
];

const SKILLS_LIST = [
  { id: 'SQL', name: 'SQL', icon: '🗄️', color: '#6366f1' },
  { id: 'EXCEL', name: 'Excel', icon: '📊', color: '#10b981' },
  { id: 'POWERBI', name: 'Power BI', icon: '📈', color: '#06b6d4' },
];

export default function SignupPage() {
  const router = useRouter();


  const [step, setStep] = useState(1);
  const totalSteps = 6;

  const [formData, setFormData] = useState({
    // Step 1 — Account
    name: '',
    email: '',
    password: '',
    // Step 2 — Profile type
    profileType: '' as ProfileType | '',
    // Step 3 — Profile details (conditional)
    experienceYears: 0,

    educationDetails: {
      degree: '',
      university: '',
      graduationYear: '',
      projects: '',
    },
    // Step 4 — Goal & Skills
    quizGoal: '' as QuizGoal | '',
    toolStack: ['SQL', 'EXCEL', 'POWERBI'] as string[],
    upcomingCompany: '',
    upcomingJD: '',
    interviewDate: '',
    // Step 5 — Plan
    selectedPlan: 'FREE' as PlanTier,
    // Step 6 — Confirm
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Payment step state
  const [upiData, setUpiData] = useState<{ qrImage: string | null; upiId: string | null; upiName: string | null }>({ qrImage: null, upiId: null, upiName: null });
  const [txnId, setTxnId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const nextStep = () => { setError(''); setStep((s) => Math.min(s + 1, totalSteps)); };
  const prevStep = () => { setError(''); setStep((s) => Math.max(s - 1, 1)); };

  const toggleSkill = (skillId: string) => {
    setFormData((prev) => {
      const stack = prev.toolStack.includes(skillId)
        ? prev.toolStack.filter((s) => s !== skillId)
        : [...prev.toolStack, skillId];
      return { ...prev, toolStack: stack.length > 0 ? stack : prev.toolStack };
    });
  };

  // ── Derive persona from profile type for backward compat ──
  const derivePersona = (): string => {
    if (formData.profileType === 'FRESHER') return 'FRESHER';
    if (formData.quizGoal === 'INTERVIEW_PREP') return 'JOB_HOPPER';
    return 'SWITCHER';
  };

  // ── Handle Signup ─────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      
      const idToken = await cred.user.getIdToken();
      // Create server session cookie immediately so server APIs work
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!sessionRes.ok) throw new Error('Failed to create session');

      setFormData(prev => ({
        ...prev,
        name: cred.user.displayName || 'User',
        email: cred.user.email || ''
      }));

      // Check if they already have a full profile
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        // If the profile object is reasonably complete, redirect to dashboard
        if (data.profile && data.profile.quizzesRemaining !== undefined) {
           router.push('/dashboard');
           router.refresh();
           return;
        }
      }
      
      // If we are here, new user or incomplete profile. Go to Step 2.
      setStep(2);

    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Google Auth Failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError('');

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Authentication lost. Please reload the page and try again.');

      // Sync profile to Firestore
      const syncRes = await fetch('/api/auth/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: firebaseUser.uid,
          email: formData.email,
          name: formData.name,
          persona: derivePersona(),
          profileType: formData.profileType || null,
          experienceYears: formData.profileType === 'EXPERIENCED' ? formData.experienceYears : 0,
          educationDetails: formData.profileType === 'FRESHER' ? formData.educationDetails : null,
          toolStack: formData.toolStack,
          quizGoal: formData.quizGoal || null,
          upcomingCompany: formData.quizGoal === 'INTERVIEW_PREP' ? formData.upcomingCompany : null,
          upcomingJD: formData.quizGoal === 'INTERVIEW_PREP' ? formData.upcomingJD : null,
          interviewDate: formData.quizGoal === 'INTERVIEW_PREP' && formData.interviewDate
            ? formData.interviewDate
            : null,
          subscriptionTier: formData.selectedPlan,
          quizzesRemaining: PLAN_OPTIONS.find(p => p.id === formData.selectedPlan)?.quizzes ?? 1,
        }),
      });

      if (!syncRes.ok) {
        const text = await syncRes.text();
        let errorMsg = 'Failed to save profile.';
        try {
          const body = JSON.parse(text);
          errorMsg = body.error || errorMsg;
        } catch {
          errorMsg = 'Server encountered a database error. Please try again.';
        }
        throw new Error(errorMsg);
      }

      if (formData.selectedPlan && formData.selectedPlan !== 'FREE') {
        fetch('/api/subscriptions/upi-qr')
          .then((r) => r.json())
          .then(setUpiData)
          .catch(() => { });
        setStep(7);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      let msg = err.message || 'Signup failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshot(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePaymentSubmit = async () => {
    if (!txnId.trim() || txnId.trim().length < 6) {
      setError('Please enter a valid UPI transaction ID (min 6 characters)');
      return;
    }
    setSubmittingPayment(true);
    setError('');
    try {
      const res = await fetch('/api/subscriptions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: formData.selectedPlan,
          upiTransactionId: txnId.trim(),
          screenshotBase64: screenshot,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard?payment_requested=true');
        router.refresh();
      } else {
        setError(data.error || 'Failed to submit. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // ── Shared step-indicator component ────────────────────────────
  const stepLabels = ['Account', 'Profile', 'Details', 'Goal', 'Plan', 'Confirm'];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card"
        style={{ width: '100%', maxWidth: '580px', padding: '3rem' }}
      >
        {/* Progress steps (hidden on payment step) */}
        {step < 7 && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '0.75rem' }}>
            {stepLabels.map((label, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    height: '4px',
                    borderRadius: '2px',
                    background: i + 1 <= step ? 'var(--primary)' : 'var(--divider)',
                    transition: 'background 0.3s ease',
                    marginBottom: '6px',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.6rem',
                    color: i + 1 <= step ? 'var(--text-accent)' : 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: i + 1 === step ? '700' : '500',
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ──────── Step 1: Account Details ──────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                Create Account
              </h2>
              <p style={{ color: 'var(--text-accent)', marginBottom: '2rem' }}>
                Let&apos;s get started with your basic info
              </p>

              {error && (
                <div
                  style={{
                    color: '#ef4444',
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'white',
                    color: '#333',
                    fontWeight: '600',
                    fontSize: '1.05rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    border: '1px solid #e5e7eb',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'transform 0.1s'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {loading ? 'Continuing…' : 'Continue with Google'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ──────── Step 2: Profile Type ───────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                Who Are You?
              </h2>
              <p style={{ color: 'var(--text-accent)', marginBottom: '2rem' }}>
                This helps us personalize your entire quiz experience
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {PROFILE_TYPES.map((p) => {
                  const Icon = p.icon;
                  const selected = formData.profileType === p.value;
                  return (
                    <motion.button
                      key={p.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, profileType: p.value })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1.25rem',
                        borderRadius: '14px',
                        border: selected ? `2px solid ${p.color}` : '1px solid var(--border-color)',
                        background: selected ? `${p.color}15` : 'var(--card-bg)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'var(--text-primary)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: `${p.color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={24} color={p.color} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>{p.label}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
                          {p.desc}
                        </div>
                      </div>
                      {selected && (
                        <CheckCircle2
                          size={22}
                          color={p.color}
                          style={{ marginLeft: 'auto', flexShrink: 0 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={prevStep}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!formData.profileType}
                  className="btn-primary"
                  style={{ flex: 2, justifyContent: 'center', opacity: !formData.profileType ? 0.5 : 1 }}
                >
                  Continue <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ──────── Step 3: Profile Details (conditional) ───────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {formData.profileType === 'EXPERIENCED' ? (
                <>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Your Experience
                  </h2>
                  <p style={{ color: 'var(--text-accent)', marginBottom: '2rem' }}>
                    Tell us about your analytics background
                  </p>

                  {/* Experience Years */}
                  <label style={{ color: 'var(--text-accent)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                    Years of Experience in Data Analytics
                  </label>
                  <select
                    className="input-field"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                    style={{ appearance: 'none', marginBottom: '1.5rem', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                  >
                    <option value={1} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>0 – 1 years</option>
                    <option value={2} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>1 – 3 years</option>
                    <option value={4} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>3 – 5 years</option>
                    <option value={6} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>5 – 8 years</option>
                    <option value={9} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>8+ years</option>
                  </select>

                </>
              ) : (
                /* ─── FRESHER DETAILS ─── */
                <>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Education Details
                  </h2>
                  <p style={{ color: 'var(--text-accent)', marginBottom: '2rem' }}>
                    Help us understand your academic background
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                        Degree / Program *
                      </label>
                      <input
                        placeholder="e.g. B.Tech Computer Science, BBA, MCA"
                        className="input-field"
                        value={formData.educationDetails.degree}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            educationDetails: { ...formData.educationDetails, degree: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                        University / College *
                      </label>
                      <input
                        placeholder="e.g. Anna University, IIT Delhi"
                        className="input-field"
                        value={formData.educationDetails.university}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            educationDetails: { ...formData.educationDetails, university: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                        Graduation Year *
                      </label>
                      <select
                        className="input-field"
                        value={formData.educationDetails.graduationYear}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            educationDetails: { ...formData.educationDetails, graduationYear: e.target.value },
                          })
                        }
                        style={{ appearance: 'none', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                      >
                        <option value="" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>Select year</option>
                        {[2028, 2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
                          <option key={y} value={y} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                        Relevant Projects / Certifications (optional)
                      </label>
                      <textarea
                        placeholder="Describe any analytics projects, courses, or certifications you have completed"
                        className="input-field"
                        rows={3}
                        style={{ resize: 'vertical' }}
                        value={formData.educationDetails.projects}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            educationDetails: { ...formData.educationDetails, projects: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>

                </>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={prevStep}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={
                    formData.profileType === 'FRESHER'
                      ? !formData.educationDetails.degree || !formData.educationDetails.university || !formData.educationDetails.graduationYear
                      : false
                  }
                  className="btn-primary"
                  style={{
                    flex: 2, justifyContent: 'center',
                    opacity: (formData.profileType === 'FRESHER' &&
                      (!formData.educationDetails.degree || !formData.educationDetails.university || !formData.educationDetails.graduationYear))
                      ? 0.5 : 1,
                  }}
                >
                  Continue <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ──────── Step 4: Goal (Practice vs Interview) ─────────── */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                What&apos;s Your Goal?
              </h2>
              <p style={{ color: 'var(--text-accent)', marginBottom: '2rem' }}>
                This shapes the questions AI generates for you
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {/* Practice */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFormData({ ...formData, quizGoal: 'PRACTICE' })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1.25rem', borderRadius: '14px',
                    border: formData.quizGoal === 'PRACTICE' ? '2px solid #10b981' : '1px solid var(--border-color)',
                    background: formData.quizGoal === 'PRACTICE' ? 'rgba(16,185,129,0.08)' : 'var(--card-bg)',
                    cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)',
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Target size={24} color="#10b981" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>Practice & Learn</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
                      General skill-building based on your experience level
                    </div>
                  </div>
                  {formData.quizGoal === 'PRACTICE' && <CheckCircle2 size={22} color="#10b981" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </motion.button>

                {/* Interview Prep */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFormData({ ...formData, quizGoal: 'INTERVIEW_PREP' })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1.25rem', borderRadius: '14px',
                    border: formData.quizGoal === 'INTERVIEW_PREP' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                    background: formData.quizGoal === 'INTERVIEW_PREP' ? 'rgba(245,158,11,0.08)' : 'var(--card-bg)',
                    cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)',
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={24} color="#f59e0b" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>Interview Preparation</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
                      Upload a company name & JD — AI generates role-specific questions
                    </div>
                  </div>
                  {formData.quizGoal === 'INTERVIEW_PREP' && <CheckCircle2 size={22} color="#f59e0b" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </motion.button>
              </div>

              {/* Interview fields (conditional) */}
              <AnimatePresence>
                {formData.quizGoal === 'INTERVIEW_PREP' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        padding: '1.25rem',
                        borderRadius: '14px',
                        background: 'rgba(245,158,11,0.04)',
                        border: '1px solid rgba(245,158,11,0.12)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        marginBottom: '1.5rem',
                      }}
                    >
                      <div>
                        <label style={{ color: '#fbbf24', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                          <Building2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          Company Name *
                        </label>
                        <input
                          className="input-field"
                          placeholder="e.g. Google, Flipkart, TCS"
                          value={formData.upcomingCompany}
                          onChange={(e) => setFormData({ ...formData, upcomingCompany: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={{ color: '#fbbf24', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                          <FileText size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          Job Description *
                        </label>
                        <textarea
                          className="input-field"
                          rows={4}
                          placeholder="Paste the JD here — AI will analyze it to generate interview-specific questions"
                          style={{ resize: 'vertical' }}
                          value={formData.upcomingJD}
                          onChange={(e) => setFormData({ ...formData, upcomingJD: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={{ color: '#fbbf24', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                          <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          Interview Date (optional)
                        </label>
                        <input
                          type="date"
                          className="input-field"
                          value={formData.interviewDate}
                          onChange={(e) => setFormData({ ...formData, interviewDate: e.target.value })}
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={prevStep}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={
                    !formData.quizGoal ||
                    (formData.quizGoal === 'INTERVIEW_PREP' && (!formData.upcomingCompany || !formData.upcomingJD))
                  }
                  className="btn-primary"
                  style={{
                    flex: 2, justifyContent: 'center',
                    opacity: (!formData.quizGoal || (formData.quizGoal === 'INTERVIEW_PREP' && (!formData.upcomingCompany || !formData.upcomingJD))) ? 0.5 : 1,
                  }}
                >
                  Continue <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ──────── Step 5: Choose Plan ──────────────────────────── */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                Choose Your Plan
              </h2>
              <p style={{ color: 'var(--text-accent)', marginBottom: '1.5rem' }}>
                Start free or unlock more quizzes. You can upgrade anytime.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {PLAN_OPTIONS.map((plan) => {
                  const isSelected = formData.selectedPlan === plan.id;
                  return (
                    <motion.button
                      key={plan.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setFormData({ ...formData, selectedPlan: plan.id })}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '14px',
                        border: isSelected
                          ? `2px solid ${plan.color}`
                          : '1px solid var(--border-color)',
                        background: isSelected
                          ? `${plan.color}10`
                          : 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {(plan as any).isPopular && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '12px',
                            background: `linear-gradient(135deg, ${plan.color}, #a855f7)`,
                            color: 'white', fontSize: '0.65rem',
                            fontWeight: '700',
                            padding: '2px 10px',
                            borderRadius: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          ⭐ Most Popular
                        </span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{plan.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '1rem' }}>{plan.name}</strong>
                            <span
                              style={{
                                color: plan.color,
                                fontWeight: '800',
                                fontSize: '0.95rem',
                              }}
                            >
                              {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                            </span>
                          </div>
                          <p
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '0.78rem',
                              margin: '2px 0 0',
                            }}
                          >
                            {plan.description} — {plan.quizzes} quiz{plan.quizzes > 1 ? 'zes' : ''}
                          </p>
                        </div>
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            border: isSelected
                              ? `2px solid ${plan.color}`
                              : '2px solid var(--border-color)',
                            background: isSelected ? plan.color : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.2s',
                          }}
                        >
                          {isSelected && <Check size={14} color="white" />}
                        </div>
                      </div>

                      {/* Feature pills */}
                      {isSelected && (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            marginTop: '0.75rem',
                            paddingTop: '0.75rem',
                            borderTop: '1px solid var(--border-color)',
                          }}
                        >
                          {plan.features.map((f, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '0.7rem',
                                padding: '3px 10px',
                                borderRadius: '20px',
                                background: `${plan.color}15`,
                                color: plan.color,
                                fontWeight: '500',
                              }}
                            >
                              ✓ {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {formData.selectedPlan !== 'FREE' && (
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    marginTop: '0.75rem',
                    textAlign: 'center',
                  }}
                >
                  💡 Payment will be collected after registration via the Pricing page.
                </p>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={prevStep}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-primary"
                  style={{ flex: 2, justifyContent: 'center' }}
                >
                  Continue <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ──────── Step 6: Review & Confirm ──────────────────────── */}
          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <CheckCircle2 size={56} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  Ready to Go!
                </h2>
                <p style={{ color: 'var(--text-accent)' }}>
                  Review your profile and complete registration
                </p>
              </div>

              {/* Summary */}
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background: 'var(--subtle-bg)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '1.5rem',
                  fontSize: '0.88rem',
                  lineHeight: '2',
                }}
              >
                <div style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Name:</strong> {formData.name}
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Profile:</strong>{' '}
                  {formData.profileType === 'EXPERIENCED' ? 'Experienced Professional' : 'Fresher / Student'}
                </div>
                {formData.profileType === 'EXPERIENCED' && (
                  <div style={{ color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Experience:</strong> {formData.experienceYears} years
                  </div>
                )}
                {formData.profileType === 'FRESHER' && formData.educationDetails.degree && (
                  <div style={{ color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Education:</strong>{' '}
                    {formData.educationDetails.degree}, {formData.educationDetails.university} ({formData.educationDetails.graduationYear})
                  </div>
                )}

                <div style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Goal:</strong>{' '}
                  {formData.quizGoal === 'INTERVIEW_PREP'
                    ? `Interview Prep — ${formData.upcomingCompany}`
                    : 'Practice & Learn'}
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Plan:</strong>{' '}
                  {(() => {
                    const plan = PLAN_OPTIONS.find(p => p.id === formData.selectedPlan);
                    return plan ? `${plan.icon} ${plan.name}${plan.price > 0 ? ` (₹${plan.price})` : ''}` : 'Free';
                  })()}
                </div>
              </div>

              {error && (
                <div
                  style={{
                    color: '#ef4444', marginBottom: '1rem', padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px',
                    fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={prevStep}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleSignup}
                  disabled={loading}
                  className="btn-primary"
                  style={{ flex: 2, justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Creating Account…' : 'Complete Registration'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ──────── Step 7: Payment ──────────────────────── */}
          {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <Crown size={48} color={PLAN_OPTIONS.find(p => p.id === formData.selectedPlan)?.color || '#f59e0b'} style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  Upgrade to {PLAN_OPTIONS.find(p => p.id === formData.selectedPlan)?.name}
                </h2>
                <p style={{ color: 'var(--text-accent)', marginBottom: '2rem' }}>
                  Complete your payment via UPI to activate your plan.
                </p>
              </div>

              {error && (
                <div
                  style={{
                    color: '#ef4444', marginBottom: '1rem', padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px',
                    fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  {error}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  alignItems: 'center',
                }}
              >
                {/* QR Code */}
                {upiData.qrImage ? (
                  <div
                    style={{
                      background: 'white',
                      padding: '16px',
                      borderRadius: '16px',
                      display: 'inline-block',
                      marginBottom: '1rem',
                    }}
                  >
                    <img
                      src={upiData.qrImage}
                      alt="UPI QR Code"
                      style={{ width: '220px', height: '220px', display: 'block' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '220px',
                      height: '220px',
                      background: 'var(--subtle-bg)',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-accent)',
                      marginBottom: '1rem',
                    }}
                  >
                    Preparing QR...
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'var(--subtle-bg)',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    width: '100%',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      Scan QR or Pay UPI ID
                    </div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {upiData.upiId || 'preplytics@upi'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (upiData.upiId) {
                        navigator.clipboard.writeText(upiData.upiId);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copied ? '#10b981' : '#a5b4fc',
                      cursor: 'pointer',
                      padding: '6px',
                    }}
                  >
                    {copied ? <Check size={18} /> : <FileText size={18} />}
                  </button>
                </div>

                <div style={{ width: '100%', height: '1px', background: 'var(--divider)', margin: '1rem 0' }} />

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-accent)', display: 'block', marginBottom: '8px' }}>
                      Step 1: 12-Digit Transaction ID *
                    </label>
                    <input
                      className="input-field"
                      placeholder="e.g. 401234567890"
                      value={txnId}
                      onChange={(e) => setTxnId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-accent)', display: 'block', marginBottom: '8px' }}>
                      Step 2: Upload Payment Screenshot (Optional but recommended)
                    </label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: '1px dashed var(--border-color)',
                        borderRadius: '12px',
                        padding: screenshot ? '0px' : '20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        color: screenshot ? 'white' : '#6b7280',
                        background: 'var(--card-bg)',
                        transition: 'all 0.2s',
                        overflow: 'hidden',
                        position: 'relative',
                        height: screenshot ? '120px' : 'auto',
                      }}
                    >
                      {screenshot ? (
                        <img
                          src={screenshot}
                          alt="Screenshot"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                          <Upload size={18} />
                          <span style={{ fontSize: '0.9rem' }}>Click to select image</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileRef}
                        style={{ display: 'none' }}
                        onChange={handleScreenshot}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={handlePaymentSubmit}
                  disabled={submittingPayment}
                  className="btn-primary"
                  style={{ flex: 2, justifyContent: 'center', opacity: submittingPayment ? 0.7 : 1 }}
                >
                  {submittingPayment ? 'Submitting…' : 'Submit Payment'} <ChevronRight size={20} />
                </button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: '#6b7280' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: '600' }}>
            Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
