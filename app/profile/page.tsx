'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import {
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, Award,
  Pencil, Check, X, Plus, Trash2, ExternalLink,
  Linkedin, Github, Target, BarChart2, ChevronDown,
  Camera, Link2, Sparkles,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */

interface WorkExperience {
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  description?: string;
}

interface Certification {
  name: string;
  issuer: string;
  issueDate?: string;
  credentialUrl?: string;
}

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  headline: string | null;
  profilePhotoUrl: string | null;
  profileType: string | null;
  experienceYears: number | null;

  educationDetails: { degree?: string; university?: string; graduationYear?: string; projects?: string } | null;
  toolStack: string[] | null;
  workExperience: WorkExperience[];
  certifications: Certification[];
  linkedinUrl: string | null;
  githubUrl: string | null;
  subscriptionTier: string;
  quizzesRemaining: number;
  profileCompletionPct: number;
  createdAt: any;
}

interface Stats {
  totalAttempted: number;
  totalCorrect: number;
  accuracy: number;
  quizzesTaken: number;
  topSkill: string | null;
}

const SKILLS_LIST = [
  { id: 'SQL', name: 'SQL', icon: '🗄️', color: '#6366f1' },
  { id: 'EXCEL', name: 'Excel', icon: '📊', color: '#10b981' },
  { id: 'POWERBI', name: 'Power BI', icon: '📈', color: '#06b6d4' },
];

/* ─── Section Wrapper ────────────────────────────────────────── */

function Section({ title, icon, children, onEdit, editing, onSave, onCancel }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onEdit?: () => void;
  editing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div
      className="glass-card"
      style={{ padding: '1.75rem', marginBottom: '1.25rem' }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.25rem',
      }}>
        <h3 style={{
          fontSize: '1.05rem', fontWeight: '700', display: 'flex',
          alignItems: 'center', gap: '0.5rem',
        }}>
          {icon} {title}
        </h3>
        {editing ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onCancel} style={{
              padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}><X size={14} /> Cancel</button>
            <button onClick={onSave} style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none',
              background: '#6366f1', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600',
            }}><Check size={14} /> Save</button>
          </div>
        ) : onEdit ? (
          <button onClick={onEdit} style={{
            padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)',
            background: 'rgba(99,102,241,0.06)', color: 'var(--text-accent)', cursor: 'pointer',
            fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px',
          }}><Pencil size={13} /> Edit</button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/* ─── Input Field ────────────────────────────────────────────── */

function Field({ label, value, onChange, placeholder, type = 'text', disabled, rows }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean; rows?: number;
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block', marginBottom: '6px', fontWeight: '500' }}>
        {label}
      </label>
      {rows ? (
        <textarea
          className="input-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          style={{ resize: 'vertical' }}
        />
      ) : (
        <input
          className="input-field"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
    </div>
  );
}

/* ─── Display Field ──────────────────────────────────────────── */

function DisplayField({ label, value, icon }: { label: string; value: string | null; icon?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: value ? '#e2e8f0' : '#4b5563', fontSize: '0.9rem' }}>
        {icon}
        {value || 'Not provided'}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Editing states
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ProfileData>>({});

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const startEdit = (section: string) => {
    setEditingSection(section);
    setDraft({ ...profile } as any);
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setDraft({});
  };

  const saveSection = async (fields: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        await fetchProfile();
        setEditingSection(null);
      }
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'photo');
      const res = await fetch('/api/profile/upload', { method: 'POST', body: fd });
      if (res.ok) {
        await fetchProfile();
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', paddingTop: '100px' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
          <Sparkles size={24} color="#6366f1" style={{ animation: 'pulse 1.5s infinite', marginRight: '8px' }} />
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', paddingTop: '100px' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
          Unable to load profile. Please <Link href="/login" style={{ color: '#6366f1' }}>log in</Link>.
        </div>
      </div>
    );
  }

  const completionPct = profile.profileCompletionPct;
  const completionColor = completionPct >= 80 ? '#10b981' : completionPct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>

        {/* ── Profile Header Card ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{
            padding: '2rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(6, 182, 212, 0.03))',
          }}
        >
          <div className="max-sm:!flex-col max-sm:!items-center max-sm:!text-center" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                onClick={() => photoRef.current?.click()}
                style={{
                  width: '90px', height: '90px', borderRadius: '50%',
                  background: profile.profilePhotoUrl
                    ? `url(${profile.profilePhotoUrl}) center/cover`
                    : 'linear-gradient(135deg, #6366f1, #06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', border: '3px solid rgba(99,102,241,0.3)',
                  fontSize: '2rem', color: 'var(--text-primary)', fontWeight: '800',
                  transition: 'transform 0.2s',
                }}
                title="Click to change photo"
              >
                {uploadingPhoto ? (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-primary)' }}>Uploading...</div>
                ) : !profile.profilePhotoUrl ? (
                  (profile.name ?? 'U').charAt(0).toUpperCase()
                ) : null}
              </div>
              <div
                onClick={() => photoRef.current?.click()}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#6366f1', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', border: '2px solid #0f0f23',
                }}
              >
                <Camera size={13} color="white" />
              </div>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPhoto(f);
                }}
              />
            </div>

            {/* Name + Headline */}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem' }}>
                {profile.name || 'Your Name'}
              </h1>
              <p style={{ color: 'var(--text-accent)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                {profile.headline || 'Add a professional headline'}
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {profile.city && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} /> {profile.city}
                  </span>
                )}
                {profile.email && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={13} /> {profile.email}
                  </span>
                )}
                {profile.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={13} /> {profile.phone}
                  </span>
                )}
              </div>

              {/* Profile completion bar */}
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Profile Completion</span>
                  <span style={{ color: completionColor, fontWeight: '700' }}>{completionPct}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: '3px', background: completionColor }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link
                  href={`/profile/${profile.id}`}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem',
                    background: 'rgba(99,102,241,0.08)', color: 'var(--text-accent)',
                    border: '1px solid rgba(99,102,241,0.15)', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <ExternalLink size={13} /> View Public Profile
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Personal Info ────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Section
            title="Personal Information"
            icon={<User size={18} color="#6366f1" />}
            editing={editingSection === 'personal'}
            onEdit={() => startEdit('personal')}
            onSave={() => saveSection({
              name: draft.name, phone: draft.phone, city: draft.city, headline: draft.headline,
            })}
            onCancel={cancelEdit}
          >
            {editingSection === 'personal' ? (
              <div className="max-md:!grid-cols-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <Field label="Full Name" value={draft.name ?? ''} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="Your name" />
                <Field label="Phone" value={draft.phone ?? ''} onChange={(v) => setDraft({ ...draft, phone: v })} placeholder="+91 98765 43210" />
                <Field label="City" value={draft.city ?? ''} onChange={(v) => setDraft({ ...draft, city: v })} placeholder="Mumbai, India" />
                <Field label="Headline" value={draft.headline ?? ''} onChange={(v) => setDraft({ ...draft, headline: v })} placeholder="Data Analyst | 2 years at TCS" />
              </div>
            ) : (
              <div className="max-md:!grid-cols-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 2rem' }}>
                <DisplayField label="Name" value={profile.name} icon={<User size={14} color="#6366f1" />} />
                <DisplayField label="Phone" value={profile.phone} icon={<Phone size={14} color="#10b981" />} />
                <DisplayField label="City" value={profile.city} icon={<MapPin size={14} color="#f59e0b" />} />
                <DisplayField label="Headline" value={profile.headline} icon={<Briefcase size={14} color="#06b6d4" />} />
              </div>
            )}
          </Section>
        </motion.div>

        {/* ── Work Experience ─────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Section
            title="Work Experience"
            icon={<Briefcase size={18} color="#f59e0b" />}
            editing={editingSection === 'experience'}
            onEdit={() => startEdit('experience')}
            onSave={() => saveSection({ workExperience: draft.workExperience })}
            onCancel={cancelEdit}
          >
            {editingSection === 'experience' ? (
              <div>
                {(draft.workExperience ?? []).map((exp, i) => (
                  <div key={i} style={{
                    padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-accent)', fontSize: '0.8rem', fontWeight: '600' }}>Experience #{i + 1}</span>
                      <button onClick={() => {
                        const updated = [...(draft.workExperience ?? [])];
                        updated.splice(i, 1);
                        setDraft({ ...draft, workExperience: updated });
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="max-md:!grid-cols-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                      <Field label="Company" value={exp.company} onChange={(v) => {
                        const updated = [...(draft.workExperience ?? [])];
                        updated[i] = { ...updated[i], company: v };
                        setDraft({ ...draft, workExperience: updated });
                      }} placeholder="TCS, Infosys..." />
                      <Field label="Role" value={exp.role} onChange={(v) => {
                        const updated = [...(draft.workExperience ?? [])];
                        updated[i] = { ...updated[i], role: v };
                        setDraft({ ...draft, workExperience: updated });
                      }} placeholder="Data Analyst" />
                      <Field label="Start Date" value={exp.startDate} onChange={(v) => {
                        const updated = [...(draft.workExperience ?? [])];
                        updated[i] = { ...updated[i], startDate: v };
                        setDraft({ ...draft, workExperience: updated });
                      }} placeholder="2022-01" type="month" />
                      <Field label="End Date (blank = present)" value={exp.endDate ?? ''} onChange={(v) => {
                        const updated = [...(draft.workExperience ?? [])];
                        updated[i] = { ...updated[i], endDate: v || null };
                        setDraft({ ...draft, workExperience: updated });
                      }} placeholder="2024-06" type="month" />
                    </div>
                    <Field label="Description (optional)" value={exp.description ?? ''} onChange={(v) => {
                      const updated = [...(draft.workExperience ?? [])];
                      updated[i] = { ...updated[i], description: v };
                      setDraft({ ...draft, workExperience: updated });
                    }} placeholder="Describe your work..." rows={2} />
                  </div>
                ))}
                <button onClick={() => {
                  setDraft({
                    ...draft,
                    workExperience: [...(draft.workExperience ?? []), { company: '', role: '', startDate: '', endDate: null }],
                  });
                }} style={{
                  padding: '10px', borderRadius: '8px', border: '1px dashed rgba(99,102,241,0.3)',
                  background: 'rgba(99,102,241,0.04)', color: 'var(--text-accent)', cursor: 'pointer',
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  fontSize: '0.85rem',
                }}>
                  <Plus size={16} /> Add Experience
                </button>
              </div>
            ) : profile.workExperience.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {profile.workExperience.map((exp, i) => (
                  <div key={i} style={{
                    padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid #f59e0b',
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{exp.role}</div>
                    <div style={{ color: 'var(--text-accent)', fontSize: '0.85rem' }}>{exp.company}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>
                      {exp.startDate} — {exp.endDate || 'Present'}
                    </div>
                    {exp.description && (
                      <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '6px', lineHeight: '1.5' }}>{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#4b5563', fontSize: '0.88rem' }}>No work experience added yet.</p>
            )}
          </Section>
        </motion.div>

        {/* ── Education ────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Section
            title="Education"
            icon={<GraduationCap size={18} color="#10b981" />}
            editing={editingSection === 'education'}
            onEdit={() => startEdit('education')}
            onSave={() => saveSection({ educationDetails: draft.educationDetails })}
            onCancel={cancelEdit}
          >
            {editingSection === 'education' ? (
              <div className="max-md:!grid-cols-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <Field label="Degree / Program" value={(draft.educationDetails as any)?.degree ?? ''} onChange={(v) =>
                  setDraft({ ...draft, educationDetails: { ...draft.educationDetails as any, degree: v } })
                } placeholder="B.Tech Computer Science" />
                <Field label="University / College" value={(draft.educationDetails as any)?.university ?? ''} onChange={(v) =>
                  setDraft({ ...draft, educationDetails: { ...draft.educationDetails as any, university: v } })
                } placeholder="Anna University" />
                <Field label="Graduation Year" value={(draft.educationDetails as any)?.graduationYear ?? ''} onChange={(v) =>
                  setDraft({ ...draft, educationDetails: { ...draft.educationDetails as any, graduationYear: v } })
                } placeholder="2024" />
                <Field label="Projects / Notes (optional)" value={(draft.educationDetails as any)?.projects ?? ''} onChange={(v) =>
                  setDraft({ ...draft, educationDetails: { ...draft.educationDetails as any, projects: v } })
                } placeholder="Relevant projects..." rows={2} />
              </div>
            ) : (
              <div className="max-md:!grid-cols-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 2rem' }}>
                <DisplayField label="Degree" value={(profile.educationDetails as any)?.degree} icon={<GraduationCap size={14} color="#10b981" />} />
                <DisplayField label="University" value={(profile.educationDetails as any)?.university} />
                <DisplayField label="Graduation Year" value={(profile.educationDetails as any)?.graduationYear} />
                {(profile.educationDetails as any)?.projects && (
                  <DisplayField label="Projects" value={(profile.educationDetails as any)?.projects} />
                )}
              </div>
            )}
          </Section>
        </motion.div>

        {/* ── Skills ───────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Section
            title="Skills & Tools"
            icon={<Target size={18} color="#06b6d4" />}
            editing={editingSection === 'skills'}
            onEdit={() => startEdit('skills')}
            onSave={() => saveSection({ toolStack: draft.toolStack })}
            onCancel={cancelEdit}
          >
            {editingSection === 'skills' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {SKILLS_LIST.map((skill) => {
                  const sel = (draft.toolStack ?? []).includes(skill.id);
                  return (
                    <motion.button
                      key={skill.id} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        const stack = sel
                          ? (draft.toolStack ?? []).filter(s => s !== skill.id)
                          : [...(draft.toolStack ?? []), skill.id];
                        setDraft({ ...draft, toolStack: stack.length > 0 ? stack : draft.toolStack });
                      }}
                      style={{
                        padding: '12px', borderRadius: '10px',
                        border: sel ? `2px solid ${skill.color}` : '1px solid rgba(255,255,255,0.08)',
                        background: sel ? `${skill.color}15` : 'rgba(255,255,255,0.02)',
                        color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}
                    >
                      {skill.icon} {skill.name}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {(profile.toolStack ?? []).length > 0 ? (
                  (profile.toolStack ?? []).map((skill) => {
                    const s = SKILLS_LIST.find(s => s.id === skill);
                    return (
                      <span key={skill} style={{
                        padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600',
                        background: `${s?.color ?? '#6366f1'}15`, color: s?.color ?? '#6366f1',
                        border: `1px solid ${s?.color ?? '#6366f1'}30`,
                      }}>
                        {s?.icon} {s?.name ?? skill}
                      </span>
                    );
                  })
                ) : (
                  <p style={{ color: '#4b5563', fontSize: '0.88rem' }}>No skills selected.</p>
                )}
              </div>
            )}
          </Section>
        </motion.div>

        {/* ── Certifications ───────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Section
            title="Certifications"
            icon={<Award size={18} color="#f59e0b" />}
            editing={editingSection === 'certifications'}
            onEdit={() => startEdit('certifications')}
            onSave={() => saveSection({ certifications: draft.certifications })}
            onCancel={cancelEdit}
          >
            {editingSection === 'certifications' ? (
              <div>
                {(draft.certifications ?? []).map((cert, i) => (
                  <div key={i} style={{
                    padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: '600' }}>Certification #{i + 1}</span>
                      <button onClick={() => {
                        const updated = [...(draft.certifications ?? [])];
                        updated.splice(i, 1);
                        setDraft({ ...draft, certifications: updated });
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="max-md:!grid-cols-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                      <Field label="Name" value={cert.name} onChange={(v) => {
                        const updated = [...(draft.certifications ?? [])];
                        updated[i] = { ...updated[i], name: v };
                        setDraft({ ...draft, certifications: updated });
                      }} placeholder="Google Data Analytics" />
                      <Field label="Issuer" value={cert.issuer} onChange={(v) => {
                        const updated = [...(draft.certifications ?? [])];
                        updated[i] = { ...updated[i], issuer: v };
                        setDraft({ ...draft, certifications: updated });
                      }} placeholder="Coursera, Google" />
                      <Field label="Issue Date" value={cert.issueDate ?? ''} onChange={(v) => {
                        const updated = [...(draft.certifications ?? [])];
                        updated[i] = { ...updated[i], issueDate: v };
                        setDraft({ ...draft, certifications: updated });
                      }} type="month" />
                      <Field label="Credential URL" value={cert.credentialUrl ?? ''} onChange={(v) => {
                        const updated = [...(draft.certifications ?? [])];
                        updated[i] = { ...updated[i], credentialUrl: v };
                        setDraft({ ...draft, certifications: updated });
                      }} placeholder="https://..." />
                    </div>
                  </div>
                ))}
                <button onClick={() => {
                  setDraft({ ...draft, certifications: [...(draft.certifications ?? []), { name: '', issuer: '' }] });
                }} style={{
                  padding: '10px', borderRadius: '8px', border: '1px dashed rgba(245,158,11,0.3)',
                  background: 'rgba(245,158,11,0.04)', color: '#fbbf24', cursor: 'pointer',
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  fontSize: '0.85rem',
                }}>
                  <Plus size={16} /> Add Certification
                </button>
              </div>
            ) : profile.certifications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {profile.certifications.map((cert, i) => (
                  <div key={i} style={{
                    padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid #f59e0b',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>{cert.name}</div>
                      <div style={{ color: 'var(--text-accent)', fontSize: '0.82rem' }}>{cert.issuer}{cert.issueDate ? ` · ${cert.issueDate}` : ''}</div>
                    </div>
                    {cert.credentialUrl && (
                      <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#4b5563', fontSize: '0.88rem' }}>No certifications added yet.</p>
            )}
          </Section>
        </motion.div>


        {/* ── Social Links ─────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Section
            title="Social Links"
            icon={<Link2 size={18} color="#06b6d4" />}
            editing={editingSection === 'social'}
            onEdit={() => startEdit('social')}
            onSave={() => saveSection({ linkedinUrl: draft.linkedinUrl, githubUrl: draft.githubUrl })}
            onCancel={cancelEdit}
          >
            {editingSection === 'social' ? (
              <div>
                <Field label="LinkedIn URL" value={draft.linkedinUrl ?? ''} onChange={(v) => setDraft({ ...draft, linkedinUrl: v })} placeholder="https://linkedin.com/in/yourname" />
                <Field label="GitHub URL (optional)" value={draft.githubUrl ?? ''} onChange={(v) => setDraft({ ...draft, githubUrl: v })} placeholder="https://github.com/yourname" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Linkedin size={16} color="#0a66c2" />
                  {profile.linkedinUrl ? (
                    <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-accent)', fontSize: '0.88rem', textDecoration: 'none' }}>
                      {profile.linkedinUrl}
                    </a>
                  ) : (
                    <span style={{ color: '#4b5563', fontSize: '0.88rem' }}>Not provided</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Github size={16} color="#e2e8f0" />
                  {profile.githubUrl ? (
                    <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-accent)', fontSize: '0.88rem', textDecoration: 'none' }}>
                      {profile.githubUrl}
                    </a>
                  ) : (
                    <span style={{ color: '#4b5563', fontSize: '0.88rem' }}>Not provided</span>
                  )}
                </div>
              </div>
            )}
          </Section>
        </motion.div>

      </main>
    </div>
  );
}
