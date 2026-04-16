'use client';

import Navbar from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { ArrowRight, Database, FileSpreadsheet, BarChart3, Code2 } from 'lucide-react';
import Link from 'next/link';

const SKILLS = [
  {
    id: 'SQL',
    name: 'SQL',
    description: 'Queries, joins, window functions, CTEs, subqueries and aggregations',
    icon: Database,
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.03))',
    topics: ['SELECT & Filtering', 'JOINs', 'Aggregations', 'Window Functions', 'CTEs'],
  },
  {
    id: 'EXCEL',
    name: 'Excel',
    description: 'Formulas, pivot tables, data analysis, VLOOKUP/XLOOKUP, macros',
    icon: FileSpreadsheet,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.03))',
    topics: ['Formulas', 'Pivot Tables', 'VLOOKUP', 'Data Validation', 'Charts'],
  },
  {
    id: 'POWERBI',
    name: 'Power BI',
    description: 'DAX measures, data modeling, visualizations, Power Query',
    icon: BarChart3,
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.03))',
    topics: ['DAX', 'Data Modeling', 'Visualizations', 'Power Query', 'Relationships'],
  },
];

export default function PracticePage() {
  return (
    <div style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '50px' }}>
      <Navbar />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.75rem' }}
          >
            Choose Your <span className="text-gradient">Practice Area</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ color: 'var(--text-accent)', fontSize: '1.1rem' }}
          >
            Select a skill to start a targeted quiz session or mix them all
          </motion.p>
        </header>

        {/* Skill Cards */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '1.5rem',
            marginBottom: '3rem',
          }}
        >
          {SKILLS.map((skill, i) => {
            const Icon = skill.icon;
            return (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="glass-card max-[480px]:!flex-[1_1_100%] max-[480px]:!max-w-none"
                style={{
                  width: '100%',
                  maxWidth: '480px',
                  flex: '1 1 400px',
                  padding: '2rem',
                  cursor: 'pointer',
                  background: skill.gradient,
                  border: `1px solid ${skill.color}30`,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: `${skill.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={28} color={skill.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                      {skill.name}
                    </h3>
                    <p
                      style={{
                        color: 'var(--text-accent)',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        marginBottom: '1rem',
                      }}
                    >
                      {skill.description}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        marginBottom: '1.25rem',
                      }}
                    >
                      {skill.topics.map((topic) => (
                        <span
                          key={topic}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.05)',
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                          }}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/quiz?skill=${skill.id}`}
                      className="btn-primary"
                      style={{
                        display: 'inline-flex',
                        padding: '8px 20px',
                        fontSize: '0.9rem',
                        textDecoration: 'none',
                      }}
                    >
                      Start Quiz <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mixed quiz CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card"
          style={{
            padding: '2rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(6,182,212,0.08))',
            border: '1px solid rgba(99,102,241,0.15)',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            🚀 Mixed Challenge
          </h3>
          <p style={{ color: 'var(--text-accent)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Test across all skills in a single quiz — perfect for interview prep
          </p>
          <Link
            href="/quiz"
            className="btn-primary"
            style={{ display: 'inline-flex', textDecoration: 'none' }}
          >
            Start Mixed Quiz <ArrowRight size={18} />
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
