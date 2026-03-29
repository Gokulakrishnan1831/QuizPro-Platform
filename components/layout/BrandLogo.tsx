import { BRAND_ASSETS, BRAND_NAME } from '@/lib/branding';

type BrandLogoProps = {
  iconSize?: number;
  textSize?: string;
};

export default function BrandLogo({
  iconSize = 36,
  textSize = '1.5rem',
}: BrandLogoProps) {
  return (
    <>
      <span
        role="img"
        aria-label={`${BRAND_NAME} logo`}
        style={{
          display: 'inline-block',
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          borderRadius: '10px',
          backgroundColor: '#0f0f23',
          backgroundImage: `url(${BRAND_ASSETS.icon})`,
          backgroundPosition: '52% 20%',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '185%',
          boxShadow: '0 10px 24px rgba(8, 15, 50, 0.35)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: textSize,
          fontWeight: 800,
          color: 'white',
          letterSpacing: '-0.03em',
        }}
      >
        {BRAND_NAME}
      </span>
    </>
  );
}
