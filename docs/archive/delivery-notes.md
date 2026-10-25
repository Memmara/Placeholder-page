# Memmara delivery status

## Included

- `memmara/`: React and TypeScript source; 600 new written Physics questions, 500 Physics multiple-choice questions, and 500 Biology questions; curriculum adapter; build output.
- `memmara-source.zip`: portable source and built site without dependencies, Git history or credentials.
- `memmara/public/design.html`: seven mobile wireframes and live mobile/desktop preview frames. Serve the built site and open `/design.html` for the interactive frames.
- `memmara-design.md`: journey, rationale, component hierarchy, design tokens, navigation/session diagrams, data integration and prioritised production plan.
- Live preview: launch the app with `pnpm dev` and open `http://localhost:5173/`.

## Observed checks

- TypeScript type checking completed successfully.
- Vite production build completed successfully using the Sites build helper.
- Browser: initial onboarding and the desktop home rendered.
- Browser: an answer survived pause, page refresh and resume.
- Browser: `kinetic` on the wound-up spring question produced the authored incorrect-answer explanation.
- Browser: `0.0027 kJ` on the kinetic-energy question was accepted as equivalent to `2.7 J`; feedback explicitly excluded method marks.

The browser walkthrough used a separate preview storage key. A complete automated regression suite, all question/marking combinations, mobile-device audit, assistive-technology audit and production load/security evaluation have not been performed. The app includes completion, review-needed, non-recall, topic/progress and returning-user states; the implementation does not imply that every path has received independent QA.

## Hosting

A private Site was registered, but publication did not complete. An initial source sync failed on network access. After network permission was granted, the automatic sandbox approval policy rejected the credential handoff to the source workflow. No successful deployment URL is claimed. Retain `.openai/hosting.json` and reuse its project ID for a future authorised publishing attempt; do not create a duplicate Site.

## App version

This is a responsive web application. It is not an installable PWA or an iOS/Android store release. A future PWA needs a web app manifest, icons, service-worker/cache policy, offline update handling and device installation checks. Native app distribution is separate work.

## Marking

The current practice flow reveals the mark scheme after the initial rule result. Students can revise their answer, mark each criterion correct, and save a criterion challenge on-device. Original answers, rule results and self-check revisions are stored separately. Self-awarded results are not independently verified or used as delayed recall evidence. No answer or challenge is sent to a person for checking. Numerical rule marking assesses final values and supported units, not method marks.
