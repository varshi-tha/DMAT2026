# dMAT Practice

Unofficial, free, browser-based dMAT practice platform.

## V3 changes

- Practice completion now uses an in-site results page instead of a JavaScript score alert.
- Practice results list every generated question with the user's answer, correct answer, and explanation.
- Mock results list all generated mock questions for review.
- Figure, Latin Square, Mathematical Equation, and Subject Module review views are included.
- Latin Square review shows the complete solved square.
- Figure review shows the original sequence and all answer options, highlighting the correct option.
- Subject Module review shows the prompt, options, source/input text, correct answer and explanation.
- Subject Module notices explicitly state that generated questions are training material, not real dMAT exam questions, and that real exam topics may vary.
- localStorage is optimized: only small completion summaries are persisted, capped at 20 sessions. Question sets and explanations are never stored in localStorage.
- localStorage writes happen only when a session finishes and are scheduled during idle time where supported.

## Run locally

Use any static server, for example:

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

## Deploy

Push the folder to GitHub and import the repository into Vercel. No build command is required for this static version.

## Important

This is an unofficial educational tool. Do not republish official copyrighted dMAT questions, figures, screenshots, logos or protected preparation-material content without permission. The generated practice questions are original training material.
