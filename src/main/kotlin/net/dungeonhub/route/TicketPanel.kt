package net.dungeonhub.route

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonSyntaxException
import com.squareup.moshi.adapter
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
import kotlinx.html.div
import kotlinx.html.fieldSet
import kotlinx.html.footer
import kotlinx.html.form
import kotlinx.html.h2
import kotlinx.html.h5
import kotlinx.html.input
import kotlinx.html.label
import kotlinx.html.main
import kotlinx.html.option
import kotlinx.html.script
import kotlinx.html.select
import kotlinx.html.small
import kotlinx.html.style
import kotlinx.html.textArea
import kotlinx.html.unsafe
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import net.dungeonhub.applicationHttpClient
import net.dungeonhub.auth.UserSession
import net.dungeonhub.connection.TicketPanelConnection
import net.dungeonhub.content.page
import net.dungeonhub.data.DiscordGuild.Companion.toDiscordGuild
import net.dungeonhub.enums.TranscriptTarget
import net.dungeonhub.model.ticket_panel.TicketPanelFormModel
import net.dungeonhub.service.GsonService
import net.dungeonhub.service.MoshiService

@OptIn(ExperimentalStdlibApi::class)
fun Application.ticketPanelModule(httpClient: HttpClient = applicationHttpClient) {
    routing {
        authenticate("auth-session") {
            get("/dashboard/server/{serverId}/ticket-panel/{ticketPanelId}") {
                val session = call.sessions.get<UserSession>()!!

                val serverId = call.parameters["serverId"]?.toLong()
                    ?: return@get call.respond(HttpStatusCode.BadRequest)

                val ticketPanelId = call.parameters["ticketPanelId"]?.toLong()
                    ?: return@get call.respond(HttpStatusCode.BadRequest)

                val userInfo = session.userInfo

                val discordGuild = userInfo["discord-guilds"]?.jsonArray?.map {
                    it.jsonObject.toDiscordGuild()
                }?.firstOrNull { it.id == serverId } ?: return@get call.respond(HttpStatusCode.BadRequest)

                val ticketPanel = TicketPanelConnection[serverId].authenticated(session)
                    .getById(ticketPanelId)
                    ?: return@get call.respond(HttpStatusCode.BadRequest)

                call.respondHtml {
                    page(session) {
                        main(classes = "container-fluid") {
                            // Header with Back Button
                            div {
                                style = "display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;"
                                a(href = "/dashboard/server/$serverId", classes = "outline") {
                                    style = "padding: 0.5rem 1rem; text-decoration: none;"
                                    +"← Back"
                                }
                                h2(classes = "holographic") { style = "margin: 0;"; +"Edit Ticket Panel: ${ticketPanel.displayName ?: ticketPanel.name} #${ticketPanel.id}" }
                            }

                            // TODO add help-buttons (or tooltips) with some more information about the setting
                            form(action = "/dashboard/server/$serverId/ticket-panel/$ticketPanelId/update", method = FormMethod.post) {
                                div(classes = "grid") {
                                    // --- Section 1: General Appearance ---
                                    article {
                                        h5 { +"General Settings" }

                                        label {
                                            +"Internal Name"
                                            input(type = InputType.text, name = "name") { value = ticketPanel.name }
                                        }

                                        label {
                                            +"Display Name"
                                            input(type = InputType.text, name = "displayName") {
                                                value = ticketPanel.displayName ?: ""
                                                placeholder = "Visible on button..."
                                            }
                                        }

                                        label {
                                            +"Button Emoji"
                                            input(type = InputType.text, name = "emoji") {
                                                value = ticketPanel.emoji ?: ""
                                                }
                                        }

                                        fieldSet {
                                            label {
                                                input(type = InputType.checkBox, name = "requiresLinking") {
                                                    checked = ticketPanel.requiresLinking == true
                                                }
                                                +"Require Linked Account"
                                            }
                                        }
                                    }

                                    // --- Section 2: Behavior & Logic ---
                                    article {
                                        h5 { +"Ticket Logic" }

                                        label {
                                            input(type = InputType.checkBox, name = "claimable") {
                                                checked = ticketPanel.claimable == true
                                            }
                                            +"Enable claiming tickets"
                                        }

                                        label {
                                            input(type = InputType.checkBox, name = "closeable") {
                                                checked = ticketPanel.closeable == true
                                            }
                                            +"Enable closing tickets"
                                        }
                                        small { +"Tickets are instantly deleted if the user tries to close the ticket." }

                                        label {
                                            input(type = InputType.checkBox, name = "closeConfirmation") {
                                                checked = ticketPanel.closeConfirmation == true
                                            }
                                            +"Ask for close confirmation"
                                        }

                                        @Suppress("DEPRECATION")
                                        val gson = GsonService.gson.newBuilder().setPrettyPrinting().create()
                                        val ticketMessage = try {
                                            gson.fromJson(ticketPanel.ticketMessage, JsonObject::class.java)
                                        } catch (_: JsonSyntaxException) {
                                            null
                                        }

                                        val content = ticketMessage?.get("content")?.asString ?: ""
                                        val embeds = ticketMessage?.get("embeds")?.asJsonArray?.let { gson.toJson(it) } ?: ""
                                        val additionalButtons = ticketMessage?.get("additional-buttons")?.asJsonArray?.let { gson.toJson(it) } ?: ""

                                        label {
                                            +"Ticket Message Content"
                                            textArea(rows = "4") {
                                                name = "ticketMessageContent"
                                                +(content)
                                            }
                                            small { +"The message content of the first message sent in a new ticket." }
                                        }

                                        label {
                                            +"Ticket Message Embeds"
                                            textArea(rows = "4", classes = "json-editor") {
                                                name = "ticketMessageEmbeds"
                                                +(embeds)
                                            }
                                            small { +"The embeds of the first message sent in a new ticket." }
                                            a(href = "#") {
                                                attributes["onClick"] = "formatJson(this)"
                                                +"Auto-format"
                                            }
                                        }

                                        // TODO add a button that adds the custom buttons to the array
                                        label {
                                            +"Ticket Message Buttons"
                                            textArea(rows = "4", classes = "json-editor") {
                                                name = "ticketMessageButtons"
                                                +(additionalButtons)
                                            }
                                            small { +"The additional buttons of the first message sent in a new ticket." }
                                            a(href = "#") {
                                                attributes["onClick"] = "formatJson(this)"
                                                +"Auto-format"
                                            }
                                        }
                                    }
                                }

                                div(classes = "grid") {
                                    // --- Section 3: Channel Naming ---
                                    article {
                                        h5 { +"Channel Naming" }
                                        label {
                                            +"Open Channel Pattern"
                                            input(type = InputType.text, name = "openChannelName") { value = ticketPanel.openChannelName ?: "" }
                                        }
                                        label {
                                            +"Claimed Channel Pattern"
                                            input(type = InputType.text, name = "claimedChannelName") { value = ticketPanel.claimedChannelName ?: "" }
                                        }
                                        label {
                                            +"Closed Channel Pattern"
                                            input(type = InputType.text, name = "closedChannelName") { value = ticketPanel.closedChannelName ?: "" }
                                        }
                                    }

                                    // --- Section 4: Transcripts ---
                                    article {
                                        h5 { +"Transcripts" }
                                        label {
                                            +"Transcript Channel ID"
                                            input(type = InputType.number, name = "transcriptChannel") {
                                                value = ticketPanel.transcriptChannel?.id?.toString() ?: ""
                                            }
                                            small { +"If left blank, the property TRANSCRIPTS_CHANNEL from /config will be used." }
                                        }
                                        label {
                                            +"DM Transcript Embed"
                                            textArea(classes = "json-editor") {
                                                name = "userTranscriptDm"
                                                +(ticketPanel.userTranscriptDm ?: "")
                                            }
                                            a(href = "#") {
                                                attributes["onClick"] = "formatJson(this)"
                                                +"Auto-format"
                                            }
                                        }
                                        label {
                                            +"Close Transcript Target"
                                            select {
                                                name = "closeTranscriptTarget"
                                                TranscriptTarget.entries.forEach { target ->
                                                    option {
                                                        value = target.name
                                                        selected = ticketPanel.closeTranscriptTarget == target
                                                        +target.name
                                                    }
                                                }
                                            }
                                        }
                                        label {
                                            +"Delete Transcript Target"
                                            select {
                                                name = "deleteTranscriptTarget"
                                                TranscriptTarget.entries.forEach { target ->
                                                    option {
                                                        value = target.name
                                                        selected = ticketPanel.deleteTranscriptTarget == target
                                                        +target.name
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                div(classes = "grid") {
                                    // --- Section 5: Role & Category IDs ---
                                    article {
                                        h5 { +"Roles & Categories" }
                                        label {
                                            +"Support Roles (Comma separated IDs)"
                                            input(type = InputType.text, name = "supportRoles") {
                                                value = ticketPanel.supportRoles?.joinToString(", ") { it.id.toString() } ?: ""
                                            }
                                        }
                                        label {
                                            +"Additional Roles (Comma separated IDs)"
                                            input(type = InputType.text, name = "additionalRoles") {
                                                value = ticketPanel.additionalRoles?.joinToString(", ") { it.id.toString() } ?: ""
                                            }
                                        }
                                        label {
                                            +"Open Categories (Comma separated IDs)"
                                            input(type = InputType.text, name = "openCategories") {
                                                value = ticketPanel.openCategories?.joinToString(", ") ?: ""
                                            }
                                        }
                                        label {
                                            +"Closed Categories (Comma separated IDs)"
                                            input(type = InputType.text, name = "closedCategories") {
                                                value = ticketPanel.closedCategories?.joinToString(", ") ?: ""
                                            }
                                        }
                                    }

                                    // --- Section 6: Ticket Form ---
                                    article {
                                        h5 { +"Ticket Form" }
                                        label {
                                            +"Form Questions"
                                            textArea(rows = "10", classes = "json-editor") {
                                                name = "formQuestions"
                                                +(ticketPanel.formQuestions.let {
                                                    MoshiService.moshi.adapter<List<TicketPanelFormModel>>().indent("   ").toJson(it)
                                                })
                                            }
                                            a(href = "#") {
                                                attributes["onClick"] = "formatJson(this)"
                                                +"Auto-format"
                                            }
                                        }
                                    }
                                }

                                footer {
                                    style = """
                                        position: sticky; 
                                        bottom: 1rem; 
                                        z-index: 10; 
                                        
                                        /* The trick: only take up the space of the button */
                                        width: fit-content;
                                        margin-left: auto; /* Keeps it on the right side */
                                        
                                        background: rgba(20, 25, 31, 0.8); 
                                        backdrop-filter: blur(8px); 
                                        -webkit-backdrop-filter: blur(8px);
                                        
                                        padding: 0.5rem; /* Reduced padding for a tighter border look */
                                        border: 1px solid var(--pico-muted-border-color);
                                        border-radius: var(--pico-border-radius);
                                    """.trimIndent()

                                    // No flex wrapper needed anymore since the footer itself is now small
                                    button(type = ButtonType.submit) {
                                        style = """
                                            margin-bottom: 0; 
                                            width: auto;
                                            min-width: 150px;
                                        """.trimIndent()
                                        +"Save Changes"
                                    }
                                }
                            }

                            script {
                                unsafe {
                                    +"""
                                        function formatJson(triggerElement) {
                                            // Finds the textarea closest to the clicked link
                                            const area = triggerElement.parentElement.parentElement.querySelector('.json-editor');
                                            try {
                                                const obj = JSON.parse(area.value);
                                                area.value = JSON.stringify(obj, null, 3);
                                            } catch (e) {
                                                
                                            }
                                        }
                            
                                        document.addEventListener('DOMContentLoaded', () => {
                                            const editors = document.querySelectorAll('.json-editor');
                                            
                                            editors.forEach(editor => {
                                                editor.addEventListener('keydown', function(e) {
                                                    if (e.key === 'Tab') {
                                                        e.preventDefault();
                                                        const start = this.selectionStart;
                                                        const end = this.selectionEnd;
                                                        this.value = this.value.substring(0, start) + "   " + this.value.substring(end);
                                                        this.selectionStart = this.selectionEnd = start + 3;
                                                    }
                                                });
                            
                                                editor.addEventListener('input', function() {
                                                    try {
                                                        JSON.parse(this.value);
                                                        this.setAttribute('aria-invalid', 'false');
                                                    } catch (e) {
                                                        this.setAttribute('aria-invalid', 'true');
                                                    }
                                                });
                                                
                                                try {
                                                    JSON.parse(editor.value);
                                                    editor.setAttribute('aria-invalid', 'false');
                                                } catch (e) {
                                                    editor.setAttribute('aria-invalid', 'true');
                                                }
                                            });
                                        });
                                    """.trimIndent()
                                }
                            }
                        }
                    }
                }
            }

            // TODO: permissions
            post("/dashboard/server/{serverId}/ticket-panel/{ticketPanelId}/update") {
                val session = call.sessions.get<UserSession>()!!

                val serverId = call.parameters["serverId"]?.toLong()
                    ?: return@post call.respond(HttpStatusCode.BadRequest)
                val ticketPanelId = call.parameters["ticketPanelId"]?.toLong()
                    ?: return@post call.respond(HttpStatusCode.BadRequest)

                val ticketPanel = TicketPanelConnection[serverId].authenticated(session).getById(ticketPanelId)
                    ?: return@post call.respond(HttpStatusCode.BadRequest)

                val params = call.receiveParameters()

                fun String?.toCleanString() = this?.takeIf { it.isNotBlank() }

                fun String?.toLongList(): List<Long>? = this?.toCleanString()
                    ?.split(",")
                    ?.mapNotNull { it.trim().toLongOrNull() }

                val name = params["name"].toCleanString()
                val displayName = params["displayName"].toCleanString()
                val emoji = params["emoji"].toCleanString()
                val openChannelName = params["openChannelName"].toCleanString()
                val claimedChannelName = params["claimedChannelName"].toCleanString()
                val closedChannelName = params["closedChannelName"].toCleanString()
                val userTranscriptDm = params["userTranscriptDm"].toCleanString()

                val transcriptChannel = params["transcriptChannel"]?.toLongOrNull()

                val requiresLinking = params["requiresLinking"] != null
                val claimable = params["claimable"] != null
                val closeable = params["closeable"] != null
                val closeConfirmation = params["closeConfirmation"] != null

                val closeTranscriptTarget = params["closeTranscriptTarget"]?.let { TranscriptTarget.valueOf(it) }
                val deleteTranscriptTarget = params["deleteTranscriptTarget"]?.let { TranscriptTarget.valueOf(it) }

                val supportRoles = params["supportRoles"].toLongList()
                val additionalRoles = params["additionalRoles"].toLongList()
                val openCategories = params["openCategories"].toLongList()
                val closedCategories = params["closedCategories"].toLongList()

                val ticketMessageContent = params["ticketMessageContent"].toCleanString()
                @Suppress("DEPRECATION")
                val ticketMessageEmbeds = params["ticketMessageEmbeds"].toCleanString()?.let {
                    try {
                        GsonService.gson.fromJson(it, JsonArray::class.java)
                    } catch (_: JsonSyntaxException) {
                        null
                    }
                }
                @Suppress("DEPRECATION")
                val ticketMessageButtons = params["ticketMessageButtons"].toCleanString()?.let {
                    try {
                        GsonService.gson.fromJson(it, JsonArray::class.java)
                    } catch (_: JsonSyntaxException) {
                        null
                    }
                }

                val ticketMessageJson = JsonObject()
                ticketMessageJson.addProperty("content", ticketMessageContent)
                ticketMessageJson.add("embeds", ticketMessageEmbeds)
                ticketMessageJson.add("additional-buttons", ticketMessageButtons)

                @Suppress("DEPRECATION")
                val ticketMessage = GsonService.gson.toJson(ticketMessageJson)

                val formQuestions = params["formQuestions"]?.toCleanString()?.let {
                    MoshiService.moshi.adapter<List<TicketPanelFormModel>>().fromJson(it)
                }

                val updateModel = ticketPanel.getUpdateModel()
                if(name != null && name != ticketPanel.name) {
                    updateModel.name = name
                }
                if(displayName != ticketPanel.displayName) {
                    updateModel.displayName = displayName
                }
                if(emoji != ticketPanel.emoji) {
                    updateModel.emoji = emoji
                }
                if(ticketMessage != ticketPanel.ticketMessage) { // TODO prevent unneccessary updates
                    updateModel.ticketMessage = ticketMessage
                }
                if(openChannelName != ticketPanel.openChannelName) {
                    updateModel.openChannelName = openChannelName
                }
                if(claimedChannelName != ticketPanel.claimedChannelName) {
                    updateModel.claimedChannelName = claimedChannelName
                }
                if(closedChannelName != ticketPanel.closedChannelName) {
                    updateModel.closedChannelName = closedChannelName
                }
                if(transcriptChannel != ticketPanel.transcriptChannel?.id) {
                    updateModel.transcriptChannel = transcriptChannel
                }
                if(userTranscriptDm != ticketPanel.userTranscriptDm) {
                    updateModel.userTranscriptDm = userTranscriptDm
                }
                if(requiresLinking != ticketPanel.requiresLinking) {
                    updateModel.requiresLinking = requiresLinking
                }
                if(claimable != ticketPanel.claimable) {
                    updateModel.claimable = claimable
                }
                if(closeable != ticketPanel.closeable) {
                    updateModel.closeable = closeable
                }
                if(closeConfirmation != ticketPanel.closeConfirmation) {
                    updateModel.closeConfirmation = closeConfirmation
                }
                if (closeTranscriptTarget != ticketPanel.closeTranscriptTarget) {
                    updateModel.closeTranscriptTarget = closeTranscriptTarget
                }
                if (deleteTranscriptTarget != ticketPanel.deleteTranscriptTarget) {
                    updateModel.deleteTranscriptTarget = deleteTranscriptTarget
                }
                if (supportRoles != ticketPanel.supportRoles.map { it.id }) {
                    updateModel.supportRoles = supportRoles
                }
                if (additionalRoles != ticketPanel.additionalRoles.map { it.id }) {
                    updateModel.additionalRoles = additionalRoles
                }
                if (openCategories != ticketPanel.openCategories) {
                    updateModel.openCategories = openCategories
                }
                if (closedCategories != ticketPanel.closedCategories) {
                    updateModel.closedCategories = closedCategories
                }
                if(formQuestions != ticketPanel.formQuestions) { // TODO prevent updates without changes
                    updateModel.formQuestions = formQuestions
                }

                TicketPanelConnection[serverId].authenticated(session).updateTicketPanel(ticketPanelId, updateModel)

                call.respondRedirect("/dashboard/server/$serverId/ticket-panel/$ticketPanelId")
            }
        }
    }
}