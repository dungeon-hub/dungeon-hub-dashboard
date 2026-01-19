package net.dungeonhub.route

import io.ktor.client.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sessions.*
import net.dungeonhub.applicationHttpClient
import net.dungeonhub.auth.UserSession
import net.dungeonhub.env.env

object AuthRoutes {
    fun Application.authRoutes(httpClient: HttpClient = applicationHttpClient) {
        install(Sessions) {
            cookie<UserSession>("user_session", SessionStorageMemory()) {
                cookie.path = "/"
                cookie.httpOnly = true
            }
        }

        val redirects = mutableMapOf<String, String>()

        install(Authentication) {
            oauth("keycloak") {
                urlProvider = { "${env("SERVER_URL")}/auth/callback" }
                providerLookup = {
                    OAuthServerSettings.OAuth2ServerSettings(
                        name = "dungeon-hub",
                        authorizeUrl = env("AUTH_URL"),
                        accessTokenUrl = env("TOKEN_URL"),
                        requestMethod = HttpMethod.Post,
                        clientId = env("CLIENT_ID"),
                        clientSecret = env("CLIENT_SECRET"),
                        defaultScopes = listOf("openid", "profile", "email", "guilds"),
                        onStateCreated = { call, state ->
                            call.request.queryParameters["redirectUrl"]?.let {
                                redirects[state] = it
                            }
                        }
                    )
                }
                client = httpClient
            }

            session<UserSession>("auth-session") {
                validate { session ->
                    if(!session.validate()) return@validate null
                    session
                }
                challenge {
                    call.respondRedirect("/auth/login")
                }
            }
        }

        routing {
            authenticate("keycloak") {
                get("/auth/login") {
                    // Redirects to 'authorizeUrl' automatically
                }

                get("/auth/callback") {
                    val currentPrincipal: OAuthAccessTokenResponse.OAuth2? = call.principal()
                    // redirects home if the url is not found before authorization
                    currentPrincipal?.let { principal ->
                        principal.state?.let { state ->
                            val idToken = principal.extraParameters["id_token"]

                            if (idToken == null) {
                                (call.respond(HttpStatusCode.BadRequest, "No ID token received"))
                                return@get
                            }

                            val refreshToken = principal.refreshToken
                            if (refreshToken == null) {
                                (call.respond(HttpStatusCode.BadRequest, "No refresh token received"))
                                return@get
                            }

                            val expiresIn = principal.extraParameters["expires_in"]?.toLongOrNull() ?: 300
                            val expiresAt = System.currentTimeMillis() / 1000 + expiresIn

                            call.sessions.set(UserSession(
                                state,
                                principal.accessToken,
                                idToken,
                                refreshToken,
                                expiresAt
                            ))
                            redirects[state]?.let { redirect ->
                                call.respondRedirect(redirect)
                                return@get
                            }
                        }
                    }
                    call.respondRedirect("/")
                }
            }

            get("/auth/logout") {
                val session = call.sessions.get<UserSession>()
                call.sessions.clear<UserSession>()

                val logoutUrl = URLBuilder(env("LOGOUT_URL")).apply {
                    parameters.append("id_token_hint", session?.idToken ?: "")
                    parameters.append("post_logout_redirect_uri", "${env("SERVER_URL")}/")
                }.buildString()

                call.respondRedirect(logoutUrl)
            }

            get("/auth/settings") {
                call.respondRedirect(env("SETTINGS_URL"))
            }
        }
    }
}