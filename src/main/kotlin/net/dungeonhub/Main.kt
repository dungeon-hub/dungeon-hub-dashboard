package net.dungeonhub

import io.ktor.client.*
import io.ktor.client.engine.apache5.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.html.*
import io.ktor.server.http.content.*
import io.ktor.server.netty.*
import io.ktor.server.routing.*
import io.ktor.server.sessions.*
import kotlinx.html.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import net.dungeonhub.routing.AuthRoutes.authRoutes
import java.util.*

val applicationHttpClient = HttpClient(Apache5) {
    install(ContentNegotiation) {
        json()
    }
}

fun main() {
    embeddedServer(Netty, port = 8080, module = Application::mainModule).start(wait = true)
}

@Serializable
data class UserSession(val state: String, val token: String, val idToken: String) {
    fun parseIdToken(): JsonObject {
        val parts = idToken.split(".")
        require(parts.size == 3) { "Invalid JWT format" }

        val payload = Base64.getUrlDecoder().decode(parts[1])
        return Json.decodeFromString(payload.decodeToString())
    }

    val name: String?
        get() = parseIdToken()["preferred_username"]?.jsonPrimitive?.content

    /**
     * This is a link to the user's profile picture.
     */
    val picture: String?
        get() = parseIdToken()["picture"]?.jsonPrimitive?.content
}

fun Application.mainModule(httpClient: HttpClient = applicationHttpClient) {
    authRoutes(httpClient)

    routing {
        staticResources("/static", "static")

        //TODO server card:
        /*
        <div className={"px-2"} id={server.id}>
			<div className="relative flex flex-col min-w-0 break-words bg-zinc-700 rounded-lg mb-6 xl:mb-3 shadow-lg">
				<div className="flex-auto">
					<div className="flex flex-wrap m-2">
						<div className="relative w-full mt-2 ml-2 max-w-full flex-grow flex-1">
							<h5 className="text-gray-400 font-bold text-xl">
								{emoji.replace_colons(server.name)}
							</h5>
						</div>
						<div className="relative w-auto h-auto flex-initial">
							<div className="text-center inline-flex items-center justify-center w-full h-11 shadow-lg rounded-full">
								{server.icon ? (
									<Image
										className={"rounded-full"}
										src={`https://cdn.discordapp.com/icons/${server.id}/${
											server.icon
										}${server.icon.startsWith("a_") ? ".gif" : ".png"}`}
										alt={`Server icon of ${server.name}`}
										width={45}
										height={45}
									/>
								) : (
									<Image
										className={"rounded-full"}
										src={"/assets/no-icon.png"}
										alt={"No server icon"}
										width={45}
										height={45}
									/>
								)}
							</div>
						</div>
					</div>
					<div className={"bg-emerald-500 w-auto my-3 mx-5 rounded"}>
						<a href={`/dashboard/server/${server.id}`}>
							<p className="text-md m-auto">
								<span>Manage</span>
							</p>
						</a>
					</div>
				</div>
			</div>
		</div>
         */

        get("/") {
            val session = call.sessions.get<UserSession>()

            call.respondHtml {
                head {
                    meta(charset = "UTF-8")
                    meta(name = "viewport", content = "width=device-width, initial-scale=1")
                    meta(name = "color-scheme", content = "light dark")

                    link(
                        rel = "stylesheet",
                        href = "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fuchsia.min.css"
                    )
                    link(rel = "stylesheet", href = "/static/default.css")
                }

                body {
                    header(classes = "container-fluid") {
                        nav {
                            ul {
                                li {
                                    a("https://dungeon-hub.net/") {
                                        img(
                                            src = "https://static.dungeon-hub.net/favicon.gif",
                                            alt = "Dungeon Hub Logo",
                                            classes = "rounded-sm"
                                        ) { width = "50px"; height = "50px" }
                                    }
                                }
                                li { a("https://dungeon-hub.net/") { strong { +"Dungeon Hub" } } }
                            }

                            ul {
                                li { a("https://invite.dungeon-hub.net/", classes = "contrast") { +"Invite" } }
                                li { a("https://discord.dungeon-hub.net/", classes = "contrast") { +"Discord" } }
                                li { a("https://docs.dungeon-hub.net/", classes = "contrast") { +"Documentation" } }

                                li {
                                    details(classes = "dropdown") {
                                        if (session != null) {
                                            summary {
                                                img(
                                                    src = session.picture,
                                                    alt = session.name,
                                                    classes = "rounded-lg"
                                                ) { width = "35px"; height = "35px" }
                                            }
                                            ul {
                                                dir = Dir.rtl
                                                li {
                                                    a("/auth/settings") { +"Settings" }
                                                    a("/auth/logout") { +"Logout" }
                                                }
                                            }
                                        } else {
                                            summary { +"Account" }
                                            ul {
                                                dir = Dir.rtl
                                                li {
                                                    a("/auth/login") { +"Login" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        hr { }
                    }

                    main(classes = "container-fluid") {
                        div {
                            p {
                                if (session != null) {
                                    h1(classes = "holographic") { +"Welcome, ${session.name}" }
                                    p { +session.parseIdToken().keys.joinToString(", ") }
                                } else {
                                    h1 { +"Please login to access the dashboard." }
                                    a("/auth/login") { +"Login" }
                                }
                            }
                        }
                    }
                }
            }
        }

        get("/hello/{name}") {
            val name = call.pathParameters["name"]

            call.respondHtml {
                body {
                    h1 { +"Hello, $name!" }
                }
            }
        }
    }
}
