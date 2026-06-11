'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  if (!session?.user) {
    return null;
  }

  const { name, email, image } = session.user;
  const initial = (name ?? email ?? '?').charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-ring transition-all focus:outline-none focus-visible:ring-ring"
        title={name ?? email ?? 'Account'}
      >
        {image ? (
          <Image src={image} alt={name ?? 'User'} width={32} height={32} className="rounded-full" />
        ) : (
          <span className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium">
            {initial}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-popover text-popover-foreground shadow-lg py-1 z-50">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium truncate">{name ?? 'Signed in'}</p>
            {email && (
              <p className="text-meta text-muted-foreground truncate">{email}</p>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/signin' })}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
