package net.dungeonhub.auth

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.forms.submitForm
import io.ktor.client.request.header
import io.ktor.client.request.request
import io.ktor.http.HttpMethod
import io.ktor.http.Parameters
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import net.dungeonhub.applicationHttpClient
import net.dungeonhub.env.env
import java.util.Base64

@Serializable
data class UserSession(
    val state: String,
    var apiToken: String,
    var idToken: String,
    var refreshToken: String,
    var expiresAt: Long
) : AuthenticationProvider {
    override suspend fun getApiToken(): String {
        return apiToken
    }

    fun parseApiToken(): JsonObject {
        val parts = apiToken.split(".")
        require(parts.size == 3) { "Invalid JWT format" }

        val payload = Base64.getUrlDecoder().decode(parts[1])
        return Json.decodeFromString(payload.decodeToString())
    }

    val name: String?
        get() = parseApiToken()["preferred_username"]?.jsonPrimitive?.content

    /**
     * This is a link to the user's profile picture.
     */
    val picture: String?
        get() = parseApiToken()["picture"]?.jsonPrimitive?.content

    val permissions: List<String>?
        get() = parseApiToken()["permissions"]?.jsonArray?.map {
            it.jsonPrimitive.content
        }

    val userInfo: JsonObject by lazy {
        runBlocking {
            Json.decodeFromString(
                applicationHttpClient.request(env("INFO_URL")) {
                    method = HttpMethod.Post
                    header("Authorization", "Bearer $apiToken")
                }.body<String>()
            )
        }
    }

    val accessTokenValid: Boolean
        get() {
            val now = System.currentTimeMillis() / 1000
            return expiresAt - now > 5
        }

    suspend fun validate(httpClient: HttpClient = applicationHttpClient): Boolean {
        if(accessTokenValid) return true

        val tokenResponse: KeycloakRefreshResponse = try {
            httpClient.submitForm(
                url = env("TOKEN_URL"),
                formParameters = Parameters.build {
                    append("grant_type", "refresh_token")
                    append("refresh_token", refreshToken)
                    append("client_id", env("CLIENT_ID"))
                    append("client_secret", env("CLIENT_SECRET"))
                }
            ).body()
        } catch (_: Exception) {
            return false
        }

        val now = System.currentTimeMillis() / 1000

        apiToken = tokenResponse.accessToken
        refreshToken = tokenResponse.refreshToken
        val expiresIn = tokenResponse.expiresIn
        expiresAt = now + expiresIn
        tokenResponse.idToken?.let { idToken = it }

        return true
    }

}