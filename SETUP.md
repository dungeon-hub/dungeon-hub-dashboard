# Dungeon Hub Dashboard Setup Guide

Setup guide for the [Dungeon Hub](https://github.com/dungeon-hub/dungeon-hub-application) dashboard.

## 🎯 What You're Setting Up

A web interface for managing the Dungeon Hub Discord bot, built with:

- **Angular 21** - Modern web framework with standalone components
- **Tailwind CSS** - Dark-themed, responsive UI
- **TypeScript API Client** - Type-safe backend communication
- **OAuth2/Keycloak** - Discord-integrated authentication
- **Reactive Forms** - Form validation and state management

## 🚀 Quick Start

### 1. Configure Environment

**Option A: Use .env files (Recommended)**

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit with your values
nano .env.local
```

Edit `.env.local`:
```env
SERVER_URL=http://localhost:4200
KEYCLOAK_ISSUER=https://auth.dungeon-hub.net/realms/dungeon-hub-test
CLIENT_ID=dungeon-hub-dashboard
API_URL=http://localhost:8080
```

**Option B: Edit environment.ts directly**

Edit `src/environments/environment.ts` (not recommended, use .env instead)

See `ENV_CONFIGURATION.md` for full details on .env setup.

### 2. Start Development Server

```bash
cd dungeon-hub-dashboard
npm start
```

Navigate to `http://localhost:4200`

### 3. Login

- Click any server card or navigate to a protected route
- You'll be redirected to Keycloak
- After login, you'll return to the dashboard

## 📝 Next Steps

### Required Configuration

1. **Keycloak Setup**
   - Configure redirect URIs in Keycloak Client
   - Add `guilds` scope to return Discord servers
   - Ensure token includes `discord-guilds` claim

2. **API Server**
   - Ensure CORS allows `http://localhost:4200`
   - Verify OAuth2 resource server configuration
   - Test API endpoints with Bearer token

3. **Environment Variables**
   - Update both `environment.ts` and `environment.prod.ts`
   - Add any additional configuration needed

### Optional Enhancements

- [ ] Add toast notifications for save success/failure
- [ ] Add confirmation dialogs for destructive actions
- [ ] Implement form validation messages
- [ ] Add search/filter for ticket panels
- [ ] Add user profile dropdown
- [ ] Implement dark/light theme toggle
- [ ] Add analytics tracking

## 🎨 Customization

### Tailwind Theme

Edit `tailwind.config.js` to customize colors, fonts, etc.:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#your-color',
      }
    }
  }
}
```

### Global Styles

Add custom styles in `src/styles.css`:

```css
.your-custom-class {
  @apply bg-gray-800 p-4 rounded;
}
```

## 🔧 Development Commands

```bash
# Start dev server
npm start

# Build for production
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format
```

## 📦 Production Build

```bash
# Build
ng build --configuration production

# Output location
dist/dungeon-hub-dashboard/browser/
```

Deploy the `browser/` folder to your hosting provider.

## 🐛 Common Issues

### 1. API Client Not Found
```bash
cd ../dungeon-hub-api/typescript-client
npm link

cd ../../dungeon-hub-dashboard
npm link @dungeon-hub/api-client
```

### 2. Tailwind Not Working
- Restart dev server after changing `tailwind.config.js`
- Verify `styles.css` has Tailwind directives

### 3. Auth Not Working
- Check Keycloak configuration
- Verify redirect URIs match
- Check the browser console for errors

### 4. API Calls Failing
- Verify that the API server is running
- Check CORS configuration
- Verify Bearer token is being sent (Network tab)

## 📚 Documentation

- **Main README**: `README.md` - Project overview and development guide
- **API Client**: `../dungeon-hub-api/typescript-client/README.md`
- **Integration Examples**: `../dungeon-hub-api/typescript-client/INTEGRATION_GUIDE.md`
- **Angular CLI**: [Angular Documentation](https://angular.dev/tools/cli)

## 🤝 Need Help?

Check the troubleshooting section above or refer to the README.md for additional guidance.

---

**Built with Angular 21 + Tailwind CSS** 🎨  
**Powered by @dungeon-hub/api-client** 🚀
