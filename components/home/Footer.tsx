import BrandLogo from '@/components/layout/BrandLogo';
import { BRAND_NAME } from '@/lib/branding';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer
            style={{
                borderTop: '1px solid rgba(255,255,255,0.05)',
                padding: '2.5rem 20px 2rem',
                maxWidth: '1200px',
                margin: '0 auto',
                textAlign: 'center',
            }}
        >
            {/* Brand */}
            <Link
                href="/"
                aria-label={`${BRAND_NAME} home`}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textDecoration: 'none',
                    color: 'white',
                }}
            >
                <BrandLogo iconSize={42} textSize="1.8rem" />
            </Link>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: '1.5', marginTop: '0.75rem' }}>
                AI-powered interview prep platform for aspiring data analysts.
            </p>

            {/* Divider + Bottom bar */}
            <div
                style={{
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    marginTop: '1.5rem',
                    paddingTop: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                }}
            >
                <p style={{ color: '#4b5563', fontSize: '0.8rem', margin: 0 }}>
                    © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
                </p>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {['Privacy Policy', 'Terms of Service'].map((text) => (
                        <Link
                            key={text}
                            href="#"
                            style={{
                                color: '#4b5563',
                                textDecoration: 'none',
                                fontSize: '0.8rem',
                            }}
                        >
                            {text}
                        </Link>
                    ))}
                </div>
            </div>
        </footer>
    );
}
