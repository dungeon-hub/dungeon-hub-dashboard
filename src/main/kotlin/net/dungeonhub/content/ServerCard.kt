package net.dungeonhub.content

import kotlinx.html.*

fun FlowContent.serverCard(
    serverId: Long,
    serverName: String,
    serverIcon: String?
) {
    article {
        style = """
            flex: 1 1 500px; 
            min-width: 500px; 
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        """.trimIndent()

        id = serverId.toString()

        val iconUrl = iconUrl(serverId, serverIcon)

        img(src = iconUrl, alt = "Server icon of $serverId") {
            width = "90"
            height = "90"
            style = """
                border-radius: 50%; 
                position: absolute;
                
                top: 0;
                bottom: 0;
                right: 0;
                
                margin-top: auto;
                margin-bottom: auto;
                margin-right: 2rem; 
            """.trimIndent()
        }

        h5 {
            +serverName
        }

        a(
            href = "/dashboard/server/$serverId",
            classes = "contrast"
        ) {
            style = "width: 100%; max-width: 200px;"
            role = "button"
            +"Manage"
        }
    }
}

fun iconUrl(serverId: Long, serverIcon: String?) = if (serverIcon != null) {
    "https://cdn.discordapp.com/icons/$serverId/$serverIcon${if (serverIcon.startsWith("a_")) ".gif" else ".png"}"
} else {
    "/static/no-icon.png"
}