import { BRAND_NAME, BRAND_SLOGAN } from '@/lib/branding';

export default function DashboardSplash() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--bg-start), var(--bg-mid), var(--bg-end))',
        animation: 'splash-fade-in 0.3s ease-out',
      }}
    >
      {/* Subtle radial glow behind the logo */}
      <div
        style={{
          position: 'absolute',
          width: '340px',
          height: '340px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo with pulse */}
      <div
        style={{
          animation: 'logo-pulse 2s ease-in-out infinite',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <img
          src="/logo-1.png"
          alt={`${BRAND_NAME} Logo`}
          style={{
            height: '100px',
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
          draggable={false}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span 
            style={{ 
              fontSize: '2.5rem', 
              fontWeight: 800, 
              letterSpacing: '0.02em',
              lineHeight: 1.1,
              color: 'var(--text-primary)',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            Pr<span style={{ 
              background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>e</span>plytics
          </span>
          <span 
            style={{ 
              fontSize: '0.95rem', 
              color: 'var(--text-muted)',
              fontWeight: 500,
              marginTop: '4px'
            }}
          >
            {BRAND_SLOGAN}
          </span>
        </div>
      </div>

      {/* Tagline */}
      <p
        style={{
          marginTop: '2.5rem',
          color: 'var(--text-accent)',
          fontSize: '0.95rem',
          fontWeight: 500,
          letterSpacing: '0.03em',
          opacity: 0.8,
        }}
      >
        Preparing your dashboard…
      </p>

      {/* Animated loading bar */}
      <div
        style={{
          marginTop: '2rem',
          width: '180px',
          height: '3px',
          borderRadius: '2px',
          background: 'var(--subtle-bg)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            height: '100%',
            width: '40%',
            borderRadius: '2px',
            background: 'linear-gradient(to right, #6366f1, #06b6d4)',
            animation: 'splash-bar-slide 1.2s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes splash-bar-slide {
          0%   { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
