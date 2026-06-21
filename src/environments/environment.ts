export const environment = {
  production: false,
  serverUrl: 'http://localhost:4200',
  apiUrl: 'http://localhost:8080',
  cdnUrl: 'http://localhost:8080/cdn/',
  staticUrl: 'http://localhost:8080/cdn/static/',
  keycloak: {
    issuer: 'https://auth.dungeon-hub.net/realms/dungeon-hub-test',
    clientId: 'dungeon-hub-dashboard',
    redirectUri: 'http://localhost:4200/auth/callback',
    postLogoutRedirectUri: 'http://localhost:4200',
    scope: 'openid profile email guilds'
  }
};
