# Civic Guide AI

**Every voice counts.** Civic Guide AI is a multilingual civic issue reporting prototype. Residents can describe a local problem, attach evidence, confirm its location, and follow a complaint through an authority workflow.

## What It Does

- Guides citizens through a report using voice or text in English, Hindi, Telugu, Tamil, Marathi, or Bengali.
- Accepts photo and other evidence, with AI-assisted image analysis and report drafting.
- Captures GPS coordinates and lets the citizen confirm the location on a map.
- Creates a tracking ID and provides public status lookup using the tracking ID and phone number.
- Gives signed-in citizens a dashboard for their complaints.
- Provides municipal authority views for complaint review, status updates, queue analytics, and map-based browsing.

Report drafting and image analysis use the VLY AI integration. Speech input/output and location access depend on browser support and user permissions.

## Routes

| Route                          | Purpose                                             | Access              |
| ------------------------------ | --------------------------------------------------- | ------------------- |
| `/`                            | Landing page                                        | Public              |
| `/auth`                        | Citizen phone sign-in                               | Public              |
| `/report`                      | Guided complaint intake                             | Signed-in citizen   |
| `/dashboard`                   | View and filter your complaints                     | Signed-in citizen   |
| `/track`                       | Look up a complaint by tracking ID and phone number | Public              |
| `/authority-login`             | Choose a municipal department                       | Public              |
| `/authority-login/:department` | Authority phone sign-in and activation              | Activation required |
| `/authority`                   | Complaint queue, analytics, map, and review tools   | Authority account   |

## Tech Stack

- React 19, TypeScript, Vite 7, and React Router 7
- Tailwind CSS 4 and shared Radix-based UI components
- Convex for backend functions, database, and authentication
- Framer Motion, Lucide, Recharts, and browser speech/geolocation APIs
- OpenStreetMap tiles and reverse geocoding through Convex HTTP actions

## Getting Started

### Requirements

- Node.js compatible with Vite 7
- npm
- A Convex account and development deployment

Install dependencies from the repository root:

```sh
npm ci
```

Start Convex in one terminal:

```sh
npx convex dev
```

Sign in to Convex and select or create a development deployment when prompted. Keep this process running while developing. The project config in `convex.json` points Convex at `src/convex/`; the CLI syncs those functions and generates the TypeScript bindings used by the app.

Start Vite in a second terminal:

```sh
npm run dev
```

Vite runs at `http://localhost:5173` by default. The client needs `VITE_CONVEX_URL` set to the selected deployment's Convex cloud URL, usually in the ignored `.env.local` file. If imports such as `@/convex/_generated/api` cannot be resolved, run `npx convex codegen` from the repository root, then restart Vite. Generated bindings are committed so clean CI builds can typecheck without running codegen; do not edit them by hand.

## Convex Configuration

The frontend and backend use separate environment configuration:

| Variable                    | Where it is used            | Purpose                                                            |
| --------------------------- | --------------------------- | ------------------------------------------------------------------ |
| `VITE_CONVEX_URL`           | Vite client (`.env.local`)  | Convex cloud URL used by the React client                          |
| `CONVEX_SITE_URL`           | Convex deployment           | Convex Auth issuer/site URL                                        |
| `VLY_INTEGRATION_KEY`       | Convex deployment           | Required by AI chat, report generation, and image analysis         |
| `AUTHORITY_ACTIVATION_CODE` | Convex deployment           | Authority activation code; set a private value for each deployment |
| `VLY_CONVEX_AUTH_ISSUER`    | Convex deployment, optional | Overrides the default federated-auth issuer                        |
| `VLY_APP_NAME`              | Convex deployment, optional | Display name used by the configured email OTP provider             |

Set backend variables in the selected Convex deployment's environment settings or with the Convex CLI. Do not expose backend secrets through `VITE_` variables or commit them to source control. Convex CLI deployment selection is stored in local ignored configuration.

The phone OTP flow is currently a prototype: the backend returns the one-time code and the UI displays it. No SMS gateway is connected. Do not use this OTP flow or the default authority activation configuration for production authentication. Connect a trusted delivery provider and configure production credentials before launch.

AI features will fail until `VLY_INTEGRATION_KEY` is configured. Core UI and build work can still be done without testing those external actions.

## Project Layout

```text
src/
  components/       App-specific components and shared UI primitives
  convex/           Convex schema, queries, mutations, actions, and auth
  hooks/            Authentication, maps, geolocation, and speech hooks
  lib/              Localization, complaint metadata, and integration helpers
  pages/            Landing, auth, reporting, tracking, citizen, and authority views
  main.tsx          Providers and route configuration
```

Convex's generated files live in `src/convex/_generated/`. They are produced by the Convex CLI and committed so clean checkouts can build. Regenerate them after changing Convex functions or schema, and do not edit them by hand. The application schema is in `src/convex/schema.ts`.

## Commands

| Command              | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `npm run dev`        | Start the Vite development server                                         |
| `npx convex dev`     | Sync and watch the selected Convex development deployment                 |
| `npx convex codegen` | Generate Convex TypeScript bindings                                       |
| `npm run build`      | Run TypeScript project builds and create the production bundle in `dist/` |
| `npm run preview`    | Serve the production bundle locally                                       |
| `npm run lint`       | Run ESLint                                                                |
| `npm run format`     | Format files with Prettier                                                |

There is no test script configured in `package.json` at this time.

## Production Notes

1. Configure a separate Convex production deployment and set its backend environment variables.
2. Set `VITE_CONVEX_URL` to the production Convex URL in the frontend build environment.
3. Replace the prototype phone OTP implementation with a real verification and delivery provider; review authority provisioning before exposing the app publicly.
4. Build the static frontend with `npm run build`, then deploy the contents of `dist/` to your web host. Deploy the Convex backend to the matching production deployment separately.

The app requests location, microphone, or camera access only for the related workflow. These browser capabilities generally require `localhost` or an HTTPS origin.
