package net.dungeonhub

import io.ktor.client.*
import io.ktor.client.engine.apache5.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import kotlinx.serialization.json.Json
import net.dungeonhub.client.DungeonHubClient
import net.dungeonhub.env.env
import net.dungeonhub.route.AuthRoutes.authRoutes
import net.dungeonhub.route.dashboardModule
import net.dungeonhub.route.serverModule
import net.dungeonhub.route.ticketPanelModule

val applicationHttpClient = HttpClient(Apache5) {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
        })
    }
}

fun main() {
    DungeonHubClient.apiUrl = env("API_URL")
    DungeonHubClient.cdnUrl = env("CDN_URL")
    DungeonHubClient.staticUrl = env("STATIC_URL")

    embeddedServer(Netty, port = 8081, module = Application::mainModule).start(wait = true)
}

fun Application.mainModule(httpClient: HttpClient = applicationHttpClient) {
    authRoutes(httpClient)

    dashboardModule(httpClient)
    serverModule(httpClient)
    ticketPanelModule(httpClient)
}
