package net.dungeonhub.route

import io.ktor.client.HttpClient
import io.ktor.server.application.Application
import io.ktor.server.html.respondHtml
import io.ktor.server.http.content.staticResources
import io.ktor.server.response.respondRedirect
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.server.sessions.get
import io.ktor.server.sessions.sessions
import kotlinx.html.a
import kotlinx.html.div
import kotlinx.html.h1
import kotlinx.html.h5
import kotlinx.html.main
import kotlinx.html.p
import kotlinx.html.section
import kotlinx.html.style
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import net.dungeonhub.applicationHttpClient
import net.dungeonhub.auth.UserSession
import net.dungeonhub.connection.DiscordServerConnection
import net.dungeonhub.content.page
import net.dungeonhub.content.serverCard
import net.dungeonhub.data.DiscordGuild.Companion.toDiscordGuild
import kotlin.collections.associateWith
import kotlin.collections.component1
import kotlin.collections.component2
import kotlin.collections.firstOrNull

fun Application.dashboardModule(httpClient: HttpClient = applicationHttpClient) {
    routing {
        staticResources("/static", "static")

        get("/") {
            call.respondRedirect("/dashboard")
        }

        get("/dashboard") {
            val session = call.sessions.get<UserSession>()?.let {
                if(it.validate()) it else null
            }

            val discordServers = if (session != null) {
                DiscordServerConnection.authenticated(session).loadAllServers()
            } else null

            call.respondHtml {
                page(session) {
                    main(classes = "container-fluid") {
                        div {
                            p {
                                if (session != null) {
                                    h1(classes = "holographic") { +"Welcome, ${session.name}! Select a server below." }

                                    val userInfo = session.userInfo

                                    val discordGuilds = userInfo["discord-guilds"]?.jsonArray?.map {
                                        it.jsonObject.toDiscordGuild()
                                    }

                                    if(discordServers == null || discordGuilds == null) {
                                        return@p
                                    }

                                    val serverMap = discordGuilds.associateWith { guild ->
                                        discordServers.firstOrNull { it.id == guild.id }
                                    }.filter { it.value != null }.entries.associate { it.key to it.value!! }

                                    section {
                                        style = """
                                            display: flex;
                                            flex-wrap: wrap;
                                            gap: 1rem;
                                        """.trimIndent()

                                        if(!serverMap.isEmpty()) {
                                            serverMap.forEach { (guild, model) ->
                                                serverCard(
                                                    model.id,
                                                    guild.name,
                                                    guild.icon
                                                )
                                            }
                                        } else {
                                            h5(classes = "holographic") {
                                                +"You don't have any servers you're able to manage."
                                            }
                                        }
                                    }

                                    p {
                                        +"Seeing servers here requires the bot to be on the server, as well as you either being the owner or a user with administrator permissions."
                                    }
                                } else {
                                    h1(classes = "holographic") { +"Please login to access the dashboard." }
                                    a("/auth/login") { +"Login" }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
