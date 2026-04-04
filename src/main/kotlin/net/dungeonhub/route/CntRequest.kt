package net.dungeonhub.route

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
import kotlinx.html.footer
import kotlinx.html.form
import kotlinx.html.h2
import kotlinx.html.h4
import kotlinx.html.h5
import kotlinx.html.input
import kotlinx.html.label
import kotlinx.html.main
import kotlinx.html.p
import kotlinx.html.section
import kotlinx.html.style
import kotlinx.html.textArea
import net.dungeonhub.applicationHttpClient
import net.dungeonhub.auth.UserSession
import net.dungeonhub.connection.CntRequestConnection
import net.dungeonhub.content.cntRequestCard
import net.dungeonhub.content.page

fun Application.cntRequestModule(httpClient: HttpClient = applicationHttpClient) {
    routing {
        authenticate("auth-session") {
            get("/dashboard/server/{serverId}/cnt-requests") {
                val session = call.sessions.get<UserSession>()!!
                val serverId = call.parameters["serverId"]?.toLong()
                    ?: return@get call.respond(HttpStatusCode.BadRequest)
                val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 0

                val leaderboard = CntRequestConnection[serverId].authenticated(session).loadLeaderboard(page)
                    ?: return@get call.respond(HttpStatusCode.NotFound)

                call.respondHtml {
                    page(session) {
                        main(classes = "container-fluid") {
                            div {
                                style = "display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;"
                                a(href = "/dashboard/server/$serverId", classes = "outline") {
                                    style = "padding: 0.5rem 1rem; text-decoration: none;"
                                    +"← Back"
                                }
                                h2(classes = "holographic") {
                                    style = "margin: 0;"
                                    +"CNT Requests"
                                }
                            }

                            section {
                                style = "display: flex; flex-wrap: wrap; gap: 1rem;"

                                if (leaderboard.requests.isEmpty()) {
                                    p { +"No CNT requests found on this page." }
                                } else {
                                    leaderboard.requests.forEach { request ->
                                        cntRequestCard(serverId, request)
                                    }
                                }
                            }

                            footer {
                                style = "display: flex; justify-content: space-between; margin-top: 2rem;"

                                if (leaderboard.hasPrevPage()) {
                                    a(href = "/dashboard/server/$serverId/cnt-requests?page=${leaderboard.page - 1}", classes = "outline") {
                                        +"Previous"
                                    }
                                } else {
                                    div {}
                                }

                                if (leaderboard.hasNextPage()) {
                                    a(href = "/dashboard/server/$serverId/cnt-requests?page=${leaderboard.page + 1}", classes = "outline") {
                                        +"Next"
                                    }
                                }
                            }
                        }
                    }
                }
            }

            get("/dashboard/server/{serverId}/cnt-request/{cntRequestId}") {
                val session = call.sessions.get<UserSession>()!!
                val serverId = call.parameters["serverId"]?.toLong()
                    ?: return@get call.respond(HttpStatusCode.BadRequest)
                val cntRequestId = call.parameters["cntRequestId"]?.toLong()
                    ?: return@get call.respond(HttpStatusCode.BadRequest)
                val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 0

                val leaderboard = CntRequestConnection[serverId].authenticated(session).loadLeaderboard(page)
                    ?: return@get call.respond(HttpStatusCode.NotFound)
                val cntRequest = leaderboard.requests.firstOrNull { it.id == cntRequestId }
                    ?: return@get call.respond(HttpStatusCode.NotFound)

                call.respondHtml {
                    page(session) {
                        main(classes = "container-fluid") {
                            div {
                                style = "display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;"
                                a(href = "/dashboard/server/$serverId/cnt-requests?page=$page", classes = "outline") {
                                    style = "padding: 0.5rem 1rem; text-decoration: none;"
                                    +"← Back"
                                }
                                h2(classes = "holographic") {
                                    style = "margin: 0;"
                                    +"Edit CNT Request #${cntRequest.id}"
                                }
                            }

                            form(action = "/dashboard/server/$serverId/cnt-request/${cntRequest.id}/update?page=$page", method = FormMethod.post) {
                                div(classes = "grid") {
                                    article {
                                        h5 { +"General" }

                                        p { +"Message ID: ${cntRequest.messageId}" }
                                        p { +"Requester ID: ${cntRequest.user.id}" }
                                        p { +"Request type: ${cntRequest.requestType.name}" }

                                        label {
                                            +"Coin Value"
                                            input(type = InputType.text, name = "coinValue") {
                                                value = cntRequest.coinValue
                                            }
                                        }

                                        label {
                                            +"Requirement"
                                            input(type = InputType.text, name = "requirement") {
                                                value = cntRequest.requirement
                                            }
                                        }

                                        label {
                                            input(type = InputType.checkBox, name = "completed") {
                                                checked = cntRequest.completed
                                            }
                                            +"Completed"
                                        }
                                    }

                                    article {
                                        h5 { +"Description" }
                                        label {
                                            +"Description"
                                            textArea(rows = "10") {
                                                name = "description"
                                                +cntRequest.description
                                            }
                                        }
                                    }
                                }

                                footer {
                                    style = "margin-top: 2rem; display: flex; justify-content: flex-end;"
                                    button(type = ButtonType.submit) {
                                        +"Save Changes"
                                    }
                                }
                            }
                        }
                    }
                }
            }

            post("/dashboard/server/{serverId}/cnt-request/{cntRequestId}/update") {
                val session = call.sessions.get<UserSession>()!!
                val serverId = call.parameters["serverId"]?.toLong()
                    ?: return@post call.respond(HttpStatusCode.BadRequest)
                val cntRequestId = call.parameters["cntRequestId"]?.toLong()
                    ?: return@post call.respond(HttpStatusCode.BadRequest)
                val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 0

                val leaderboard = CntRequestConnection[serverId].authenticated(session).loadLeaderboard(page)
                    ?: return@post call.respond(HttpStatusCode.NotFound)
                val cntRequest = leaderboard.requests.firstOrNull { it.id == cntRequestId }
                    ?: return@post call.respond(HttpStatusCode.NotFound)

                val params = call.receiveParameters()

                fun String?.toCleanString() = this?.takeIf { it.isNotBlank() }

                val coinValue = params["coinValue"].toCleanString()
                val requirement = params["requirement"].toCleanString()
                val description = params["description"].toCleanString()
                val completed = params["completed"] != null

                val updateModel = cntRequest.getUpdateModel()
                if (coinValue != cntRequest.coinValue) {
                    updateModel.coinValue = coinValue
                }
                if (requirement != cntRequest.requirement) {
                    updateModel.requirement = requirement
                }
                if (description != cntRequest.description) {
                    updateModel.description = description
                }
                if (completed != cntRequest.completed) {
                    updateModel.completed = completed
                }

                CntRequestConnection[serverId].authenticated(session).updateCntRequest(cntRequestId, updateModel)

                call.respondRedirect("/dashboard/server/$serverId/cnt-request/$cntRequestId?page=$page")
            }
        }
    }
}
