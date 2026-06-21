export const environment = {
  production: true,
  serverUrl: 'https://dungeon-hub.net',
  apiUrl: 'https://api.dungeon-hub.net',
  cdnUrl: 'https://cdn.dungeon-hub.net/',
  staticUrl: 'https://static.dungeon-hub.net/',
  keycloak: {
    issuer: 'https://auth.dungeon-hub.net/realms/dungeon-hub',
    clientId: 'dungeon-hub-dashboard',
    redirectUri: 'https://beta.dashboard.dungeon-hub.net/auth/callback',
    postLogoutRedirectUri: 'https://beta.dashboard.dungeon-hub.net',
    scope: 'openid profile email guilds'
  }
};
