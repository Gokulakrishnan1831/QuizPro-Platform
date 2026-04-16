import BrandLogo from '@/components/layout/BrandLogo';
import { BRAND_NAME } from '@/lib/branding';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer
            style={{
                borderTop: '1px solid var(--divider)',
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
                    color: 'var(--text-primary)',
                }}
            >
                <BrandLogo height={48} hideSloganOnMobile={false} />
            </Link>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginTop: '0.75rem' }}>
                AI-powered interview prep platform for aspiring data analysts.
            </p>

            {/* Divider + Bottom bar */}
            <div
                style={{
                    borderTop: '1px solid var(--divider)',
                    marginTop: '1.5rem',
                    paddingTop: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                }}
            >
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
                    © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
                </p>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {['Privacy Policy', 'Terms of Service'].map((text) => (
                        <Link
                            key={text}
                            href="#"
                            style={{
                                color: 'var(--text-muted)',
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
