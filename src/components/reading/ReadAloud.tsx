'use client';

import { useEffect, useRef, useState } from 'react';
import { useMounted } from '@/hooks/use-mounted';
import { TTS_RATES, setTtsRate, useTtsRate } from '@/hooks/use-reading-prefs';

type State = 'idle' | 'playing' | 'paused';

export default function ReadAloud() {
  const mounted = useMounted();
  const [state, setState] = useState<State>('idle');
  const rate = useTtsRate();
  const chunks = useRef<string[]>([]);
  const idx = useRef(0);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const supported =
    mounted && typeof window !== 'undefined' && 'speechSynthesis' in window;
  if (!supported) return null;

  // Rate is threaded explicitly so the utterance chain never closes over a
  // stale render's value.
  const speakFrom = (r: number) => {
    if (idx.current >= chunks.current.length) {
      setState('idle');
      return;
    }
    const u = new SpeechSynthesisUtterance(chunks.current[idx.current]);
    u.rate = r;
    u.onend = () => {
      idx.current += 1;
      speakFrom(r);
    };
    window.speechSynthesis.speak(u);
  };

  const play = () => {
    const article = document.getElementById('article');
    if (!article) return;
    chunks.current = Array.from(article.children)
      .map((c) => (c.textContent || '').trim())
      .filter(Boolean);
    idx.current = 0;
    window.speechSynthesis.cancel();
    setState('playing');
    speakFrom(rate);
  };

  // Cycle 0.8× → 1× → 1.25× → 1.5×; mid-playback, restart the current
  // paragraph at the new speed.
  const cycleRate = () => {
    const next = TTS_RATES[(TTS_RATES.indexOf(rate as (typeof TTS_RATES)[number]) + 1) % TTS_RATES.length];
    setTtsRate(next);
    if (state !== 'idle') {
      window.speechSynthesis.cancel();
      setState('playing');
      speakFrom(next);
    }
  };

  const toggle = () => {
    if (state === 'idle') return play();
    if (state === 'playing') {
      window.speechSynthesis.pause();
      setState('paused');
    } else {
      window.speechSynthesis.resume();
      setState('playing');
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    idx.current = 0;
    setState('idle');
  };

  return (
    <div className="reading-tts">
      <button
        className="reading-icon-btn"
        onClick={toggle}
        aria-label={state === 'playing' ? 'Pause read-aloud' : 'Read aloud'}
        title={state === 'playing' ? 'Pause' : 'Read aloud'}
      >
        {state === 'playing' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      {state !== 'idle' && (
        <>
          <button className="reading-icon-btn" onClick={stop} aria-label="Stop read-aloud" title="Stop">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1.5" />
            </svg>
          </button>
          <button
            className="reading-icon-btn reading-tts-rate"
            onClick={cycleRate}
            aria-label={`Read-aloud speed ${rate}x, click to change`}
            title="Speed"
          >
            {rate}×
          </button>
        </>
      )}
    </div>
  );
}
