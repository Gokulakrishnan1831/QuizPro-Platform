'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import { useParams } from 'next/navigation';
import {
  MapPin, Mail, Briefcase, GraduationCap, Award,
  ExternalLink, Linkedin, Github, Target,
  BarChart2, Calendar, Sparkles, User, Link2,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */

interface PublicProfile {
  id: string;
  name: string;
  email: string;
  city: string | null;
  headline: string | null;
  profilePhotoUrl: string | null;
  profileType: string | null;
  experienceYears: number | null;
  workExperience: { company: string; role: string; startDate: string; endDate: string | null; description?: string }[];
  educationDetails: { degree?: string; university?: string; graduationYear?: string; projects?: string } | null;
  toolStack: string[];
  certifications: { name: string; issuer: string; issueDate?: string; credentialUrl?: string }[];
  linkedinUrl: string | null;
  githubUrl: string | null;

  createdAt: any;
}

interface PublicStats {
  totalAttempted: number;
  totalCorrect: number;
  accuracy: number;
  quizzesTaken: number;
  topSkill: string | null;
  skillBreakdown: { skill: string; accuracy: number; totalAttempted: number }[];
}

const SKILL_COLORS: Record<string, { color: string; icon: string }> = {
  SQL: { color: '#6366f1', icon: '🗄️' },
  EXCEL: { color: '#10b981', icon: '📊' },
  POWERBI: { color: '#06b6d4', icon: '📈' },
};

/* ─── Page ───────────────────────────────────────────────────── */

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/profile/${userId}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        setProfile(data.profile);
        setStats(data.stats);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', paddingTop: '100px' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#6b7280' }}>
          <Sparkles size={24} color="#6366f1" style={{ animation: 'pulse 1.5s infinite', marginRight: '8px' }} />
          Loading profile...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '100vh', paddingTop: '100px' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '100px', color: '#6b7280' }}>
          <User size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', color: 'white' }}>Profile Not Found</h2>
          <p>This user profile doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const joinedDate = profile.createdAt?._seconds
    ? new Date(profile.createdAt._seconds * 1000)
    : profile.createdAt?.seconds
      ? new Date(profile.createdAt.seconds * 1000)
      : null;

  return (
    <div style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>

        {/* ── Header Card ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{
            padding: '2rem', marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(6, 182, 212, 0.03))',
          }}
        >
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%', flexShrink: 0,
              background: profile.profilePhotoUrl
                ? `url(${profile.profilePhotoUrl}) center/cover`
                : 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '3px solid rgba(99,102,241,0.3)', fontSize: '2rem', color: 'white', fontWeight: '800',
            }}>
              {!profile.profilePhotoUrl && profile.name.charAt(0).toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem' }}>
                {profile.name}
              </h1>
              {profile.headline && (
                <p style={{ color: '#a5b4fc', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  {profile.headline}
                </p>
              )}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#6b7280' }}>
                {profile.city && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} /> {profile.city}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mail size={13} /> {profile.email}
                </span>
                {joinedDate && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} /> Joined {joinedDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Social links */}
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem' }}>
                {profile.linkedinUrl && (
                  <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{
                    padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem', textDecoration: 'none',
                    background: 'rgba(10, 102, 194, 0.1)', color: '#0a66c2', border: '1px solid rgba(10,102,194,0.2)',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <Linkedin size={13} /> LinkedIn
                  </a>
                )}
                {profile.githubUrl && (
                  <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" style={{
                    padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem', textDecoration: 'none',
                    background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <Github size={13} /> GitHub
                  </a>
                )}

              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Quiz Stats ──────────────────────────────────── */}
        {stats && stats.totalAttempted > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card"
            style={{ padding: '1.5rem', marginBottom: '1.25rem' }}
          >
            <h3 style={{
              fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem',
              marginBottom: '1rem',
            }}>
              <BarChart2 size={18} color="#6366f1" /> Quiz Performance
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#6366f1' }}>{stats.quizzesTaken}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Quizzes</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#10b981' }}>{stats.accuracy}%</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Accuracy</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f59e0b' }}>{stats.totalCorrect}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Correct</div>
              </div>
            </div>
            {/* Skill breakdown bars */}
            {stats.skillBreakdown && stats.skillBreakdown.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stats.skillBreakdown.map(s => {
                  const sc = SKILL_COLORS[s.skill];
                  return (
                    <div key={s.skill}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                        <span style={{ color: '#e2e8f0' }}>{sc?.icon ?? '📦'} {s.skill}</span>
                        <span style={{ color: '#6b7280' }}>{s.accuracy}%</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.accuracy}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: '3px', background: sc?.color ?? '#6366f1' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Work Experience ─────────────────────────────── */}
        {profile.workExperience.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card"
            style={{ padding: '1.75rem', marginBottom: '1.25rem' }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Briefcase size={18} color="#f59e0b" /> Work Experience
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {profile.workExperience.map((exp, i) => (
                <div key={i} style={{
                  padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid #f59e0b',
                }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{exp.role}</div>
                  <div style={{ color: '#a5b4fc', fontSize: '0.85rem' }}>{exp.company}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '4px' }}>
                    {exp.startDate} — {exp.endDate || 'Present'}
                  </div>
                  {exp.description && (
                    <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '6px', lineHeight: '1.5' }}>{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Education ────────────────────────────────────── */}
        {profile.educationDetails?.degree && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card"
            style={{ padding: '1.75rem', marginBottom: '1.25rem' }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <GraduationCap size={18} color="#10b981" /> Education
            </h3>
            <div style={{
              padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid #10b981',
            }}>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{profile.educationDetails.degree}</div>
              {profile.educationDetails.university && (
                <div style={{ color: '#a5b4fc', fontSize: '0.85rem' }}>{profile.educationDetails.university}</div>
              )}
              {profile.educationDetails.graduationYear && (
                <div style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '4px' }}>
                  Class of {profile.educationDetails.graduationYear}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Skills ───────────────────────────────────────── */}
        {profile.toolStack.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card"
            style={{ padding: '1.75rem', marginBottom: '1.25rem' }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Target size={18} color="#06b6d4" /> Skills
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {profile.toolStack.map(skill => {
                const sc = SKILL_COLORS[skill];
                return (
                  <span key={skill} style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600',
                    background: `${sc?.color ?? '#6366f1'}15`, color: sc?.color ?? '#6366f1',
                    border: `1px solid ${sc?.color ?? '#6366f1'}30`,
                  }}>
                    {sc?.icon} {skill}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Certifications ───────────────────────────────── */}
        {profile.certifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card"
            style={{ padding: '1.75rem', marginBottom: '1.25rem' }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Award size={18} color="#f59e0b" /> Certifications
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {profile.certifications.map((cert, i) => (
                <div key={i} style={{
                  padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid #f59e0b',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>{cert.name}</div>
                    <div style={{ color: '#a5b4fc', fontSize: '0.82rem' }}>{cert.issuer}{cert.issueDate ? ` · ${cert.issueDate}` : ''}</div>
                  </div>
                  {cert.credentialUrl && (
                    <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
