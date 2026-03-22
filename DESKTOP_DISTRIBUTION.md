# Convergence E-Vote Desktop Distribution

This project now supports desktop packaging for school admins using Electron.

## Local desktop run

```bash
pnpm install
pnpm desktop:dev
```

This starts Next.js and opens the desktop admin shell at `/admin`.

## Build Windows installers

```bash
pnpm desktop:build
```

Build artifacts are generated in `release/`.

## Microsoft Store notes

- The desktop build config targets `appx` and `msi`.
- For production store submission, set signing and publisher metadata in `package.json` build config.
- Ensure the web backend (API + DB) is deployed and reachable by schools.

## Product workflow for schools

1. School installs desktop admin app.
2. School creates workspace in `/admin/signup` with school email.
3. School admin signs in at `/admin`.
4. School sets up students, positions, and candidates.
5. School clicks **Deploy Election Portal** in dashboard timer panel.
6. Students vote through portal URL: `/portal/{school-slug}`.
