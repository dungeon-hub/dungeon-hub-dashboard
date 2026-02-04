package net.dungeonhub.content

import kotlinx.html.BODY
import kotlinx.html.Dir
import kotlinx.html.HTML
import kotlinx.html.a
import kotlinx.html.body
import kotlinx.html.details
import kotlinx.html.dir
import kotlinx.html.div
import kotlinx.html.footer
import kotlinx.html.head
import kotlinx.html.header
import kotlinx.html.hr
import kotlinx.html.img
import kotlinx.html.lang
import kotlinx.html.li
import kotlinx.html.link
import kotlinx.html.meta
import kotlinx.html.nav
import kotlinx.html.small
import kotlinx.html.strong
import kotlinx.html.summary
import kotlinx.html.title
import kotlinx.html.ul
import net.dungeonhub.auth.UserSession

fun HTML.addHead() {
    head {
        meta(charset = "UTF-8")
        meta(name = "viewport", content = "width=device-width, initial-scale=1")
        meta(name = "color-scheme", content = "light dark")

        title("Dungeon Hub Dashboard")

        link(
            rel = "stylesheet",
            href = "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fuchsia.min.css"
        ) {
            attributes["blocking"] = "render"
        }
        link(rel = "stylesheet", href = "/static/default.css")
        link(rel = "icon", href = "https://static.dungeon-hub.net/favicon.gif")
    }
}

fun BODY.addHeader(session: UserSession?) {
    header(classes = "container-fluid") {
        nav {
            ul {
                li {
                    a("https://dungeon-hub.net/") {
                        img(
                            src = "https://static.dungeon-hub.net/favicon.gif",
                            alt = "Dungeon Hub Logo",
                            classes = "rounded-full"
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
}

fun HTML.page(session: UserSession?, page: BODY.() -> Unit) {
    lang = "en"
    addHead()

    body {
        addHeader(session)

        page()

        footer(classes = "footer") {
            small { + "© 2026. All rights reserved." }
            div (classes = "footer-links"){
                a(classes = "footer-link") {
                    href = "https://dungeon-hub.net/terms-of-service"
                    + "Terms"
                }
                a(classes = "footer-link") {
                    href = "https://dungeon-hub.net/cookies"
                    + "Cookies"
                }
                a(classes = "footer-link") {
                    href = "https://dungeon-hub.net/privacy"
                    + "Privacy and Legal Notice"
                }
            }
        }
    }
}
