package net.dungeonhub.route

import dev.kord.common.DiscordBitSet
import dev.kord.common.entity.Permissions
import io.ktor.client.HttpClient
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.auth.authenticate
import io.ktor.server.html.respondHtml
import io.ktor.server.request.receiveParameters
import io.ktor.server.response.respond
import io.ktor.server.response.respondRedirect
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import io.ktor.server.sessions.get
import io.ktor.server.sessions.sessions
import kotlinx.html.ButtonType
import kotlinx.html.FormMethod
import kotlinx.html.InputType
import kotlinx.html.a
import kotlinx.html.article
import kotlinx.html.button
import kotlinx.html.dialog
import kotlinx.html.div
import kotlinx.html.footer
import kotlinx.html.form
import kotlinx.html.h3
import kotlinx.html.h4
import kotlinx.html.header
import kotlinx.html.id
import kotlinx.html.img
import kotlinx.html.input
import kotlinx.html.label
import kotlinx.html.main
import kotlinx.html.p
import kotlinx.html.small
import kotlinx.html.strong
import kotlinx.html.style
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import net.dungeonhub.applicationHttpClient
import net.dungeonhub.auth.UserSession
import net.dungeonhub.connection.TicketPanelConnection
import net.dungeonhub.content.iconUrl
import net.dungeonhub.content.page
import net.dungeonhub.content.ticketPanelCard
import net.dungeonhub.data.DiscordGuild.Companion.toDiscordGuild
import net.dungeonhub.enums.TicketPermissionCandidate
import net.dungeonhub.enums.TicketPermissionType
import net.dungeonhub.model.ticket_panel.TicketPanelCreationModel

fun Application.serverModule(httpClient: HttpClient = applicationHttpClient) {
    routing {
        authenticate("auth-session") {
            get("/dashboard/server/{serverId}") {
                val session = call.sessions.get<UserSession>()!!

                val serverId = call.parameters["serverId"]?.toLong()
                    ?: return@get call.respond(HttpStatusCode.BadRequest)

                val userInfo = session.userInfo

                val discordGuild = userInfo["discord-guilds"]?.jsonArray?.map {
                    it.jsonObject.toDiscordGuild()
                }?.firstOrNull { it.id == serverId } ?: return@get call.respond(HttpStatusCode.BadRequest)

                val ticketPanels = TicketPanelConnection[serverId].authenticated(session).allTicketPanels ?: emptyList()

                call.respondHtml {
                    page(session) {
                        main(classes = "container-fluid") {
                            div {
                                style = """
                                    display: flex; 
                                    align-items: center; 
                                    justify-content: center; 
                                    line-height: 1; 
                                    margin-bottom: 2rem;
                                    position: relative; /* Necessary for absolute positioning of the back button */
                                """.trimIndent()

                                a(href = "/dashboard", classes = "outline contrast") {
                                    style = """
                                        position: absolute;
                                        left: 0;
                                        padding: 4px 12px;
                                        text-decoration: none;
                                        font-size: 0.9rem;
                                    """.trimIndent()
                                    +"← Back"
                                }

                                val iconUrl = iconUrl(serverId, discordGuild.icon)
                                img(src = iconUrl, alt = "Server icon of $serverId") {
                                    width = "40"; height = "40"
                                    style = "border-radius: 50%; display: block; margin-right: 12px;"
                                }

                                h3(classes = "holographic") {
                                    style = "margin: 0;"
                                    +discordGuild.name
                                }
                            }

                            div {
                                style = "position: relative; border: 1px solid #374151; padding: 12px; border-radius: 8px;"

                                h4 {
                                    style = "margin: 0;"
                                    +"Ticket Panels"
                                }

                                // Round Green Plus Button
                                button {
                                    style = """
                                        position: absolute;
                                        top: 12px;
                                        right: 12px;
                                        width: 40px;
                                        height: 40px;
                                        padding: 0;
                                        border-radius: 50%;
                                        background-color: #2e7d32;
                                        border: none;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-size: 24px;
                                        cursor: pointer;
                                    """.trimIndent()

                                    attributes["onClick"] = "document.getElementById('add-panel-modal').showModal()"
                                    +"＋"
                                }

                                div {
                                    style = """
                                            display: flex;
                                            flex-wrap: wrap;
                                            gap: 1rem;
                                            margin-top: 12px;
                                        """.trimIndent()

                                    if(ticketPanels.isEmpty()) {
                                        p { +"No ticket panels have been created yet. Use the button on the right to create one!" }
                                    } else {
                                        ticketPanels.forEach { panel ->
                                            ticketPanelCard(
                                                panel.discordServer.id,
                                                panel.id,
                                                (panel.displayName ?: panel.name) + " #${panel.id}"
                                            )
                                        }
                                    }
                                }
                            }

                            dialog {
                                id = "add-panel-modal"
                                article {
                                    header {
                                        p { strong { +"Add a new Ticket Panel" } }
                                    }

                                    form(action = "/dashboard/server/$serverId/panels/create", method = FormMethod.post) {
                                        label {
                                            +"Internal Name"
                                            input(type = InputType.text, name = "name") {
                                                placeholder = "e.g. support_ticket"
                                                required = true
                                            }
                                            small { +"This is the unique identifier used by the system." }
                                        }

                                        label {
                                            +"Display Name (Optional)"
                                            input(type = InputType.text, name = "displayName") {
                                                placeholder = "e.g. Support Ticket"
                                            }
                                            small { +"This is what users will see on the button. The identifier is used as a fallback, if this value isn't filled" }
                                        }

                                        label {
                                            +"Emoji (Optional)"
                                            input(type = InputType.text, name = "emoji")
                                            small { +"This can be either either an unicode emoji or a custom emoji. Custom emojis must have the format: <:name:id>" }
                                        }

                                        footer {
                                            style = "margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem;"

                                            button(type = ButtonType.button, classes = "secondary") {
                                                style = "margin-bottom: 0;"
                                                attributes["onClick"] = "document.getElementById('add-panel-modal').close()"
                                                +"Cancel"
                                            }

                                            button(type = ButtonType.submit) {
                                                style = "margin-bottom: 0;"
                                                +"Create Panel"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            post("/dashboard/server/{serverId}/panels/create") {
                val session = call.sessions.get<UserSession>()!!

                val serverId = call.parameters["serverId"]?.toLong()
                    ?: return@post call.respond(HttpStatusCode.BadRequest)

                val params = call.receiveParameters()
                val name = params["name"] ?: return@post call.respond(HttpStatusCode.BadRequest)
                val displayName = params["displayName"]?.takeIf { it.isNotBlank() }
                val emoji = params["emoji"]?.takeIf { it.isNotBlank() }

                val creationModel = TicketPanelCreationModel(
                    name,
                    displayName,
                    emoji,
                    closeable = false,
                    closeConfirmation = false,
                    claimable = false,
                    openChannelName = "{panel.name}-{ticket.count}",
                    claimedChannelName = null,
                    closedChannelName = null,
                    transcriptChannel = null,
                    ticketMessage = "{\"content\":\"Welcome, {user.mention}!\\nPlease describe your {panel.name} request below further.\"}",
                    requiresLinking = false,
                    closeTranscriptTarget = null,
                    deleteTranscriptTarget = null,
                    userTranscriptDm = "[\"transcript\"]",
                    formQuestions = null,
                    supportRoles = null,
                    additionalRoles = null,
                    openCategories = null,
                    closedCategories = null,
                    permissions = defaultPermissions
                )

                TicketPanelConnection[serverId].authenticated(session).addNewTicketPanel(creationModel)

                call.respondRedirect("/dashboard/server/$serverId")
            }
        }
    }
}

val defaultPermissions = mapOf(
    TicketPermissionCandidate.SupportTeam to mapOf(
        TicketPermissionType.Allowed to Permissions.Builder(DiscordBitSet(68608)).build()
    ), TicketPermissionCandidate.AdditionalRoles to mapOf(
        TicketPermissionType.Allowed to Permissions.Builder(DiscordBitSet(68608)).build()
    ), TicketPermissionCandidate.TicketCreator to mapOf(
        TicketPermissionType.Allowed to Permissions.Builder(DiscordBitSet(68608)).build()
    ), TicketPermissionCandidate.TicketClaimer to mapOf(
        TicketPermissionType.Allowed to Permissions.Builder(DiscordBitSet(68608)).build()
    ), TicketPermissionCandidate.Everyone to mapOf(
        TicketPermissionType.Denied to Permissions.Builder(DiscordBitSet(1024)).build()
    )
)
