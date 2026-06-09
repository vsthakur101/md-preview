'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Wraps the app in `next-themes`, driving a `.dark` class on <html>.
 * `defaultTheme="system"` preserves the previous OS-following behavior as the
 * default while letting users override it; `disableTransitionOnChange` avoids a
 * flash of transitioning colors when toggling.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
