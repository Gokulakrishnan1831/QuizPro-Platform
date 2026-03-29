'use client';

import { auth } from '@/lib/firebase/client';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
  Upload,
  Target,
  BookOpen,
  Calendar,
  Building2,
  FileText,
  Check,
  Crown,
  Sparkles,
  Zap,
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
    color: '#6b7280',
    icon: '🎯',
    description: 'Try before you commit',
    features: ['1 AI-generated quiz', 'MCQ questions only', 'Basic score report'],
  },
  {
    id: 'BASIC' as PlanTier,
    name: 'Basic',
    price: 99,
    quizzes: 3,
    color: '#06b6d4',
    icon: '📚',
    description: 'Start your prep journey',
    features: ['3 AI quizzes', 'Practice & Interview Prep', 'AI performance summary'],
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
    features: ['10 AI quizzes', 'Hands-on SQL & Excel', 'JD-tailored prep', 'AI roadmap'],
  },
  {
    id: 'ELITE' as PlanTier,
    name: 'Elite',
    price: 499,
    quizzes: 20,
    color: '#f59e0b',
    icon: '👑',
    description: 'For serious job seekers',
    features: ['20 AI quizzes', 'Everything in Pro', 'Resume analysis', 'Mentorship access'],
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
  const fileRef = useRef<HTMLInputElement>(null);

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
    resumeFile: null as File | null,
    resumeFileName: '',
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
  const handleSignup = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Create Firebase auth user
      const credential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const firebaseUser = credential.user;

      // Update display name
      await updateProfile(firebaseUser, { displayName: formData.name });

      // 2. Get ID token and create server session
      const idToken = await firebaseUser.getIdToken();
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!sessionRes.ok) throw new Error('Failed to create session');

      // 3. Upload resume if present (placeholder)
      let resumeUrl: string | null = null;
      if (formData.resumeFile) {
        resumeUrl = `/uploads/resumes/${firebaseUser.uid}_${formData.resumeFileName}`;
      }

      // 4. Sync profile to Firestore
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
          resumeUrl,
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
      if (msg.includes('email-already-in-use')) {
        msg = 'An account with this email already exists. Please log in.';
      } else if (msg.includes('weak-password')) {
        msg = 'Password must be at least 6 characters.';
      } else if (msg.includes('invalid-email')) {
        msg = 'Please enter a valid email address.';
      }
      setError(msg);
      const lower = msg.toLowerCase();
      if (lower.includes('email') || lower.includes('password')) {
        setStep(1);
      }
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
                    background: i + 1 <= step ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                    transition: 'background 0.3s ease',
                    marginBottom: '6px',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.6rem',
                    color: i + 1 <= step ? '#a5b4fc' : '#4b5563',
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
              <p style={{ color: '#a5b4fc', marginBottom: '2rem' }}>
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
                <div style={{ position: 'relative' }}>
                  <User
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <Mail
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}
                    size={20}
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}
                    size={20}
                  />
                  <input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={6}
                  />
                </div>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!formData.name || !formData.email || formData.password.length < 6}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    marginTop: '1rem',
                    opacity: !formData.name || !formData.email || formData.password.length < 6 ? 0.5 : 1,
                  }}
                >
                  Next Step <ChevronRight size={20} />
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
              <p style={{ color: '#a5b4fc', marginBottom: '2rem' }}>
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
                        border: selected ? `2px solid ${p.color}` : '1px solid rgba(255,255,255,0.08)',
                        background: selected ? `${p.color}15` : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'white',
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
                        <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
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
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: 'white',
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
                  <p style={{ color: '#a5b4fc', marginBottom: '2rem' }}>
                    Tell us about your analytics background
                  </p>

                  {/* Experience Years */}
                  <label style={{ color: '#a5b4fc', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                    Years of Experience in Data Analytics
                  </label>
                  <select
                    className="input-field"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                    style={{ appearance: 'none', marginBottom: '1.5rem', backgroundColor: '#1a1a2e', color: '#e2e8f0' }}
                  >
                    <option value={1} style={{ backgroundColor: '#1a1a2e', color: '#e2e8f0' }}>0 – 1 years</option>
                    <option value={2} style={{ backgroundColor: '#1a1a2e', color: '#e2e8f0' }}>1 – 3 years</option>
                    <option value={4} style={{ backgroundColor: '#1a1a2e', color: '#e2e8f0' }}>3 – 5 years</option>
                    <option value={6} style={{ backgroundColor: '#1a1a2e', color: '#e2e8f0' }}>5 – 8 years</option>
                    <option value={9} style={{ backgroundColor: '#1a1a2e', color: '#e2e8f0' }}>8+ years</option>
                  </select>

                  {/* Resume Upload */}
                  <label style={{ color: '#a5b4fc', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                    <Upload size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                    Upload Resume (optional)
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: '2px dashed rgba(99,102,241,0.25)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      marginBottom: '1.5rem',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    {formData.resumeFileName ? (
                      <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <FileText size={18} />
                        {formData.resumeFileName}
                      </div>
                    ) : (
                      <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                        <Upload size={22} color="#6366f1" style={{ display: 'block', margin: '0 auto 6px' }} />
                        Click to upload your resume (PDF)
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, resumeFile: file, resumeFileName: file.name });
                      }
                    }}
                  />

                  {/* Tool Stack Confirmation */}
                  <label style={{ color: '#a5b4fc', fontSize: '0.9rem', display: 'block', marginBottom: '0.75rem' }}>
                    <BookOpen size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                    Which tools do you want to practice?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {SKILLS_LIST.map((skill) => {
                      const sel = formData.toolStack.includes(skill.id);
                      return (
                        <motion.button
                          key={skill.id}
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleSkill(skill.id)}
                          style={{
                            padding: '12px',
                            borderRadius: '10px',
                            border: sel ? `2px solid ${skill.color}` : '1px solid rgba(255,255,255,0.08)',
                            background: sel ? `${skill.color}15` : 'rgba(255,255,255,0.02)',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          {skill.icon} {skill.name}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* ─── FRESHER DETAILS ─── */
                <>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Education Details
                  </h2>
                  <p style={{ color: '#a5b4fc', marginBottom: '2rem' }}>
                    Help us understand your academic background
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
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
                      <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
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
                      <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
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
                        style={{ appearance: 'none', backgroundColor: '#1a1a2e', color: '#e2e8f0' }}
                      >
                        <option value="" style={{ backgroundColor: '#1a1a2e', color: '#e2e8f0' }}>Select year</option>
                        {[2028, 2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
                          <option key={y} value={y} style={{ backgroundColor: '#1a1a2e', color: '#e2e8f0' }}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
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

                  {/* Tool Stack for Fresher too */}
                  <label style={{ color: '#a5b4fc', fontSize: '0.9rem', display: 'block', marginBottom: '0.75rem' }}>
                    <BookOpen size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                    Which tools do you want to practice?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {SKILLS_LIST.map((skill) => {
                      const sel = formData.toolStack.includes(skill.id);
                      return (
                        <motion.button
                          key={skill.id}
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleSkill(skill.id)}
                          style={{
                            padding: '12px',
                            borderRadius: '10px',
                            border: sel ? `2px solid ${skill.color}` : '1px solid rgba(255,255,255,0.08)',
                            background: sel ? `${skill.color}15` : 'rgba(255,255,255,0.02)',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          {skill.icon} {skill.name}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={prevStep}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: 'white', cursor: 'pointer',
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
              <p style={{ color: '#a5b4fc', marginBottom: '2rem' }}>
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
                    border: formData.quizGoal === 'PRACTICE' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                    background: formData.quizGoal === 'PRACTICE' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer', textAlign: 'left', color: 'white',
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Target size={24} color="#10b981" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>Practice & Learn</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
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
                    border: formData.quizGoal === 'INTERVIEW_PREP' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                    background: formData.quizGoal === 'INTERVIEW_PREP' ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer', textAlign: 'left', color: 'white',
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={24} color="#f59e0b" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>Interview Preparation</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
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
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: 'white', cursor: 'pointer',
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
              <p style={{ color: '#a5b4fc', marginBottom: '1.5rem' }}>
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
                          : '1px solid rgba(255,255,255,0.08)',
                        background: isSelected
                          ? `${plan.color}10`
                          : 'rgba(255,255,255,0.02)',
                        color: 'white',
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
                            color: 'white',
                            fontSize: '0.65rem',
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
                              color: '#94a3b8',
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
                              : '2px solid rgba(255,255,255,0.15)',
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
                            borderTop: '1px solid rgba(255,255,255,0.06)',
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
                    color: '#94a3b8',
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
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: 'white', cursor: 'pointer',
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
                <p style={{ color: '#a5b4fc' }}>
                  Review your profile and complete registration
                </p>
              </div>

              {/* Summary */}
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: '1.5rem',
                  fontSize: '0.88rem',
                  lineHeight: '2',
                }}
              >
                <div style={{ color: '#94a3b8' }}>
                  <strong style={{ color: 'white' }}>Name:</strong> {formData.name}
                </div>
                <div style={{ color: '#94a3b8' }}>
                  <strong style={{ color: 'white' }}>Profile:</strong>{' '}
                  {formData.profileType === 'EXPERIENCED' ? 'Experienced Professional' : 'Fresher / Student'}
                </div>
                {formData.profileType === 'EXPERIENCED' && (
                  <div style={{ color: '#94a3b8' }}>
                    <strong style={{ color: 'white' }}>Experience:</strong> {formData.experienceYears} years
                  </div>
                )}
                {formData.profileType === 'FRESHER' && formData.educationDetails.degree && (
                  <div style={{ color: '#94a3b8' }}>
                    <strong style={{ color: 'white' }}>Education:</strong>{' '}
                    {formData.educationDetails.degree}, {formData.educationDetails.university} ({formData.educationDetails.graduationYear})
                  </div>
                )}
                <div style={{ color: '#94a3b8' }}>
                  <strong style={{ color: 'white' }}>Skills:</strong> {formData.toolStack.join(', ')}
                </div>
                <div style={{ color: '#94a3b8' }}>
                  <strong style={{ color: 'white' }}>Goal:</strong>{' '}
                  {formData.quizGoal === 'INTERVIEW_PREP'
                    ? `Interview Prep — ${formData.upcomingCompany}`
                    : 'Practice & Learn'}
                </div>
                <div style={{ color: '#94a3b8' }}>
                  <strong style={{ color: 'white' }}>Plan:</strong>{' '}
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
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: 'white', cursor: 'pointer',
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
                <p style={{ color: '#a5b4fc', marginBottom: '2rem' }}>
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
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#a5b4fc',
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
                    background: 'rgba(255,255,255,0.04)',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    width: '100%',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '2px' }}>
                      Scan QR or Pay UPI ID
                    </div>
                    <div style={{ fontWeight: '600', color: 'white' }}>
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

                <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1rem 0' }} />

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#a5b4fc', display: 'block', marginBottom: '8px' }}>
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
                    <label style={{ fontSize: '0.8rem', color: '#a5b4fc', display: 'block', marginBottom: '8px' }}>
                      Step 2: Upload Payment Screenshot (Optional but recommended)
                    </label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: '1px dashed rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        padding: screenshot ? '0px' : '20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        color: screenshot ? 'white' : '#6b7280',
                        background: 'rgba(255,255,255,0.02)',
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
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: 'white', cursor: 'pointer',
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
