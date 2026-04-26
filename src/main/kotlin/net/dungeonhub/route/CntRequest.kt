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
import kotlinx.html.h5
import kotlinx.html.input
import kotlinx.html.label
import kotlinx.html.main
import kotlinx.html.option
import kotlinx.html.p
import kotlinx.html.script
import kotlinx.html.section
import kotlinx.html.select
import kotlinx.html.style
import kotlinx.html.time
import kotlinx.html.unsafe
import net.dungeonhub.applicationHttpClient
import net.dungeonhub.auth.UserSession
import net.dungeonhub.connection.CntRequestConnection
import net.dungeonhub.content.cntRequestCard
import net.dungeonhub.content.page
import net.dungeonhub.enums.CntRequestType
import net.dungeonhub.mojang.connection.MojangConnection

private const val CNT_REQUESTS_PAGE_SIZE = 10

fun Application.cntRequestModule(httpClient: HttpClient = applicationHttpClient) {
    routing {
        authenticate("auth-session") {
            get("/dashboard/server/{serverId}/cnt-requests") {
                val session = call.sessions.get<UserSession>()!!
                val serverId = call.parameters["serverId"]?.toLong()
                    ?: return@get call.respond(HttpStatusCode.BadRequest)
                val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 0

                val cntRequestPage = CntRequestConnection[serverId].authenticated(session)
                    .getCntRequests(page = page, size = CNT_REQUESTS_PAGE_SIZE)
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

                                if (cntRequestPage.requests.isEmpty()) {
                                    p { +"No CNT requests found on this page." }
                                } else {
                                    cntRequestPage.requests.forEach { request ->
                                        cntRequestCard(serverId, request)
                                    }

                                    script {
                                        unsafe {
                                            +"""
                                                document.querySelectorAll(".js-local-time").forEach(el => {
                                                    const date = new Date(el.dateTime);
                                                    el.textContent = date.toLocaleString();
                                                });
                                            """.trimIndent()
                                        }
                                    }
                                }
                            }

                            footer {
                                style = "display: flex; justify-content: space-between; margin-top: 2rem;"

                                if (cntRequestPage.hasPrevPage()) {
                                    a(href = "/dashboard/server/$serverId/cnt-requests?page=${cntRequestPage.page - 1}", classes = "outline") {
                                        +"Previous"
                                    }
                                } else {
                                    div {}
                                }

                                if (cntRequestPage.hasNextPage()) {
                                    a(href = "/dashboard/server/$serverId/cnt-requests?page=${cntRequestPage.page + 1}", classes = "outline") {
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

                val cntRequest = CntRequestConnection[serverId].authenticated(session)
                    .getCntRequest(cntRequestId)
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

                                        p { +"Requester: ${
                                            cntRequest.user.minecraftId?.let {
                                                MojangConnection.getNameByUUID(it)
                                            } ?: cntRequest.user.id
                                        }" }

                                        if(cntRequest.claimer != null) {
                                            p { +"Claimed by: ${
                                                cntRequest.claimer?.minecraftId?.let {
                                                    MojangConnection.getNameByUUID(it)
                                                } ?: cntRequest.claimer?.id
                                            }" }
                                        }

                                        label {
                                            +"Request type"
                                            select {
                                                name = "requestType"

                                                for(requestType in CntRequestType.entries) {
                                                    option {
                                                        label = requestType.description
                                                        selected = requestType == cntRequest.requestType
                                                        value = requestType.name
                                                    }
                                                }
                                            }
                                        }


                                        label {
                                            +"Created at: "
                                            time(classes = "js-local-time") {
                                                attributes["datetime"] = cntRequest.time.toString()
                                                +"Loading..."
                                            }
                                        }

                                        label {
                                            input(type = InputType.checkBox, name = "completed") {
                                                checked = cntRequest.completed
                                            }
                                            +"Completed"
                                        }

                                        if(cntRequest.claimer != null) {
                                            label {
                                                input(type = InputType.checkBox, name = "unclaim") {
                                                    checked = false
                                                }
                                                +"Unclaim"
                                            }
                                        }

                                        script {
                                            unsafe {
                                                +"""
                                                document.querySelectorAll(".js-local-time").forEach(el => {
                                                    const date = new Date(el.dateTime);
                                                    el.textContent = date.toLocaleString();
                                                });
                                            """.trimIndent()
                                            }
                                        }
                                    }

                                    article {
                                        h5 { +"Information" }

                                        label {
                                            +"Description"
                                            input(type = InputType.text, name = "description") {
                                                value = cntRequest.description
                                            }
                                        }

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

                val cntRequest = CntRequestConnection[serverId].authenticated(session)
                    .getCntRequest(cntRequestId)
                    ?: return@post call.respond(HttpStatusCode.NotFound)

                val params = call.receiveParameters()

                fun String?.toCleanString() = this?.takeIf { it.isNotBlank() }

                val coinValue = params["coinValue"].toCleanString()
                val requirement = params["requirement"].toCleanString()
                val description = params["description"].toCleanString()
                val completed = params["completed"] != null
                val shouldUnclaim = params["unclaim"].toCleanString().let { "on" == it }
                val requestType = params["requestType"].toCleanString()?.let { CntRequestType.valueOf(it) }

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
                if(shouldUnclaim) {
                    updateModel.claimer = null
                }
                if(requestType != cntRequest.requestType) {
                    updateModel.requestType = requestType
                }

                CntRequestConnection[serverId].authenticated(session).updateCntRequest(cntRequestId, updateModel)

                call.respondRedirect("/dashboard/server/$serverId/cnt-request/$cntRequestId?page=$page")
            }
        }
    }
}
