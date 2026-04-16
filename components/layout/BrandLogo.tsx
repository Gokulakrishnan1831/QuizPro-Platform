import { BRAND_NAME, BRAND_SLOGAN } from '@/lib/branding';

type BrandLogoProps = {
  height?: number;
  hideSloganOnMobile?: boolean;
  showSlogan?: boolean;
};

export default function BrandLogo({ height = 50, hideSloganOnMobile = true, showSlogan = true }: BrandLogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <img
        src="/logo-1.png"
        alt={`${BRAND_NAME} Logo`}
        className="max-md:!h-8"
        style={{
          height: `${height}px`,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
        draggable={false}
      />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span 
          className="max-md:!text-[1.5rem]"
          style={{ 
            fontSize: `${height * 0.55}px`, 
            fontWeight: 800, 
            letterSpacing: '0.02em',
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          Pr<span style={{ 
            background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>e</span>plytics
        </span>
        {showSlogan && (
          <span 
            className={`${hideSloganOnMobile ? 'desktop-only' : ''} max-sm:!text-[0.6rem]`}
            style={{ 
              fontSize: `${height * 0.24}px`, 
              color: 'var(--text-muted)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              marginTop: '2px'
            }}
          >
            {BRAND_SLOGAN}
          </span>
        )}
      </div>
    </div>
  );
}
