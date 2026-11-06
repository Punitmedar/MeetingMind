# MeetIQ – AI Meeting Intelligence

## Goal

Build a polished, frontend-only meeting intelligence product. The experience uses clearly labeled demonstration data and never implies that real AI processing is connected.

## Product structure

- Public landing page at `/` with brand-led introduction, workflow, feature highlights, and footer.
- Shared authenticated-style product shell for Dashboard, Meetings, Upload Meeting, Processing, Meeting Workspace, Action Items, Analytics, and Settings.
- Dark navigation sidebar with a light, information-dense workspace and a compact mobile navigation pattern.

## Interface system

- Define a restrained premium SaaS palette, typography, spacing, borders, shadows, motion, and status colors as semantic tokens.
- Use reusable navigation, page header, metric, meeting, state, chart, table, tabs, dialog, toast, skeleton, and upload components.
- Use realistic demonstration records in one typed data module so FastAPI responses can replace them later.

## Pages and interactions

1. **Landing:** Strong MeetIQ identity, “Turn every meeting into clear outcomes.”, upload CTA, three-step workflow, feature overview, and professional footer.
2. **Dashboard:** Four KPI summaries, recent meetings, lightweight analytics, pending actions, and upload entry point.
3. **Upload:** Drag/drop and file picker with common-format validation, selected-file metadata, removable selection, and a clear “backend not connected” handoff instead of fake processing.
4. **Processing:** Reusable six-stage pipeline designed for future API progress events; demonstration view is explicitly identified as a preview.
5. **Workspace:** Meeting metadata plus Overview, Summary, Transcript, Minutes, and Action Items tabs; transcript search, timestamps, placeholder speaker labels, and audio-player shell.
6. **Meetings:** Search, date/status filters, responsive table/cards, and links into the workspace.
7. **Action Items:** Filterable professional task table with owner, deadline, priority, and status.
8. **Analytics:** Meeting volume, duration, action completion, and time-series visuals using demonstration data.
9. **Settings:** Profile, appearance, application preferences, AI processing configuration placeholders, and product information.

## States and safeguards

- Include polished empty, loading, validation, error, confirmation, and toast patterns.
- Keep status labels explicit: sample content is for interface demonstration; real transcription and summarization require the future FastAPI service.
- Do not add authentication, persistence, upload storage, or AI execution in this frontend phase.

## Verification

- Check every route at desktop and mobile sizes, navigation, filters, tabs, upload validation, dialogs, and visible metadata.
- Confirm every content route has distinct sharing metadata and the interface has no broken links or runtime errors.
