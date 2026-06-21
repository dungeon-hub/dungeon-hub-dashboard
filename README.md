# Dungeon Hub Dashboard

Web dashboard for managing configuration and data for the [Dungeon Hub Discord bot](https://github.com/dungeon-hub/dungeon-hub-application).

## Overview

A modern Angular-based interface for managing bot settings, ticket systems, carry requests, and server configurations. Features OAuth2 authentication with Discord integration for seamless access control.

Built with Angular 21, Tailwind CSS, and TypeScript.

## Tech Stack

- **Angular 21** with standalone components and modern control flow syntax
- **Tailwind CSS** for responsive, dark-themed UI
- **TypeScript API Client** (`@dungeon-hub/api-client`) for type-safe API calls
- **OAuth2/Keycloak** for authentication and Discord guild integration
- **Vitest** for unit testing

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Access to Keycloak authentication server
- Running Dungeon Hub API backend

### Installation

```bash
# Install dependencies
npm install

# Configure environment (copy and edit)
cp .env.local.example .env.local

# Start development server
npm start
```

Navigate to `http://localhost:4200/` and log in with Keycloak.

### Environment Configuration

Edit `.env.local` with your configuration:

```env
SERVER_URL=http://localhost:4200
KEYCLOAK_ISSUER=https://auth.dungeon-hub.net/realms/dungeon-hub-test
CLIENT_ID=dungeon-hub-dashboard
API_URL=http://localhost:8080
```

See `SETUP.md` for detailed configuration instructions.

## Development

```bash
# Start dev server (auto-reload enabled)
npm start

# Build for production
npm run build

# Run unit tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Features

- OAuth2/Keycloak authentication with Discord guild integration
- Manage ticket panels, forms, and workflows
- Track and process CNT (community currency) requests
- Configure carry systems, transcripts, and roles
- Dark theme with responsive design
- Type-safe API client with automatic token handling

## Building for Production

```bash
# Build optimized production bundle
npm run build

# Output directory
dist/dungeon-hub-dashboard/browser/
```

Deploy the `browser/` directory to your hosting provider. Ensure proper configuration for:
- Environment variables (production API URL, Keycloak issuer)
- CORS on API server
- Redirect URIs in Keycloak client
- URL rewriting for Angular routing (e.g., `_redirects` file for Netlify)

## Deployment

The `public/_redirects` file is included for Netlify deployment and ensures all routes redirect to `index.html` for Angular routing.

For other hosting providers:
- **Nginx**: Configure `try_files $uri $uri/ /index.html;`
- **Apache**: Use `.htaccess` with `RewriteRule`
- **Firebase**: Configure `rewrites` in `firebase.json`

## API Client

The dashboard uses `@dungeon-hub/api-client`, a TypeScript client generated from the backend OpenAPI spec. To update:

```bash
# In the API project, regenerate the client
cd ../dungeon-hub-api/typescript-client
npm run generate

# Link locally for development
npm link

# In dashboard project
cd ../../dungeon-hub-dashboard
npm link @dungeon-hub/api-client
```

## Troubleshooting

### API Client Not Found
```bash
cd ../dungeon-hub-api/typescript-client && npm link
cd ../../dungeon-hub-dashboard && npm link @dungeon-hub/api-client
```

### Auth Redirect Loop
- Verify Keycloak redirect URIs include your dev server URL
- Check `environment.ts` has correct `serverUrl` and `issuer`
- Clear browser localStorage and try again

### API Calls Return 401
- Verify API server OAuth2 configuration accepts Keycloak tokens
- Check network tab: Bearer token should be in Authorization header
- Ensure token includes required scopes/claims

### Tailwind Styles Not Applying
- Restart dev server after `tailwind.config.js` changes
- Verify `styles.css` imports Tailwind directives
- Check for conflicting global styles

## Documentation

- **Setup Guide**: `SETUP.md` - Detailed setup and configuration
- **API Client**: `../dungeon-hub-api/typescript-client/README.md`
- **Angular CLI**: [Angular CLI Documentation](https://angular.dev/tools/cli)

## Contributing

When adding new features:
1. Use standalone components with modern control flow (`@if`, `@for`)
2. Follow reactive forms patterns
3. Add proper TypeScript types from API client
4. Include loading and error states
5. Test responsiveness and dark theme compatibility

## License

See repository license file for details.
