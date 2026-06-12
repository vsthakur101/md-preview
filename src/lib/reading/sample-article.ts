/**
 * Onboarding sample: a real article that exercises every reader feature —
 * sections (TOC + per-section time), :::key takeaways, :::aside deep-dives,
 * pull-quotes, code, and enough length for the progress engine to matter.
 */

export const SAMPLE_TITLE = 'How to actually finish what you start reading';

export const SAMPLE_CONTENT = `# How to actually finish what you start reading

You have forty-one tabs open. Three of them are articles you genuinely want to read — the long, considered kind that takes half an hour and changes how you think about something. You will close all three unread. Not because the writing failed you, but because nothing about the way we read on screens is designed for the reader who *almost* stays.

This is an article about that problem, and it is also a demonstration: everything this reader does — the progress bar above you, the shrinking time estimate, the table of contents tracking where you are — exists to win the next ninety seconds of your attention, over and over, until the end.

## Why long reads lose you

Attention doesn't fail all at once. It fails at checkpoints: the end of a section, a dense paragraph, the moment you wonder *how much longer is this?* and the page gives you no answer.

> Readers don't abandon articles. They abandon uncertainty.

Print solved this centuries ago. A book tells you exactly where you are — the thickness of pages under your right thumb is a progress bar you can feel. A screen of infinite scroll tells you nothing, so every paragraph is a small act of faith.

:::key
Momentum, not motivation, finishes articles. Every visible signal of progress — time left shrinking, sections getting checked off — converts reading from an open-ended obligation into a sequence of small wins.
:::

### The 90-second contract

Watch yourself read anything long. You don't decide to read for thirty minutes; you decide, roughly every ninety seconds, whether to continue. Good reading experiences understand this and keep re-winning that decision:

- **Show the exit getting closer.** A shrinking "12 min left" beats a static "28 min read" every time.
- **Chunk ruthlessly.** Sections should feel like laps, not one long open-water swim.
- **Reward arrival.** A checkmark next to a finished section is a tiny, real dopamine hit.

## Make the text carry you

Typography is pacing. The measure — the width of a line — is the single highest-impact choice in any reading surface. Past about 70 characters, your eye loses the return sweep to the next line and reading silently becomes work.

:::aside{label="The typography rabbit hole"}
The 45–75 character measure comes from centuries of book design practice, formalized in works like Bringhurst's *The Elements of Typographic Style*. Screen studies keep confirming it: wider lines read marginally faster but feel worse, and feel is what decides whether you return tomorrow. This reader caps the column at ~66 characters and refuses to budge.
:::

Serifs at a generous size, real line-height, warm paper instead of clinical white — none of it is decoration. It's friction removal. If you've read this far without noticing the font, the font did its job.

\`\`\`ts
// Even code blocks get the reading treatment: syntax highlighting
// that follows the theme, and a size that doesn't shout.
const readingTime = (words: number) => Math.max(1, Math.round(words / 230));
\`\`\`

## Invest, don't just consume

Passive reading evaporates. The fix is cheap: leave marks. Select any sentence in this article and highlight it — it will be waiting for you in the recap at the end, and in your highlights library afterwards.

Highlighting isn't about the highlight. It's about converting *reading* into *having read*: artifacts you can return to, copy, and build on. The readers who finish things are the ones who treat articles as material, not entertainment.

### Try it now

Highlight the next sentence. **The act of marking a sentence makes you measurably more likely to finish the article it lives in.** Done? There's a small ritual satisfaction to it — that's the point.

## Come back tomorrow

The last trick is the oldest one: streaks. Finish this article and you've started one. The library will keep your place in everything you read, surface the article you abandoned mid-way, and quietly count the days you keep showing up.

None of this makes you a better reader. It just removes every excuse not to be one — and it turns out that's most of the job.

> Finish this article. It's two paragraphs away, and the checkmark is real.

You made it. The progress bar above is full, the time-left says "Finished", and somewhere in your stats a streak just ticked. That feeling — mild, real, repeatable — is what brings readers back to long-form. Now import something you've been meaning to read, and let the same machinery work on it.
`;
