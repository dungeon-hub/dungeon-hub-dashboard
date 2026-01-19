package net.dungeonhub.content

import kotlinx.html.FlowContent
import kotlinx.html.a
import kotlinx.html.article
import kotlinx.html.h5
import kotlinx.html.id
import kotlinx.html.role
import kotlinx.html.style

fun FlowContent.ticketPanelCard(
    serverId: Long,
    ticketPanelId: Long,
    ticketPanelName: String
) {
    article {
        style = """
            flex: 1 1 300px; 
            min-width: 300px; 
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        """.trimIndent()

        id = ticketPanelId.toString()

        h5 {
            +ticketPanelName
        }

        a(
            href = "/dashboard/server/$serverId/ticket-panel/$ticketPanelId",
            classes = "contrast"
        ) {
            style = "width: 100%; max-width: 200px;"
            role = "button"
            +"Edit"
        }
    }
}