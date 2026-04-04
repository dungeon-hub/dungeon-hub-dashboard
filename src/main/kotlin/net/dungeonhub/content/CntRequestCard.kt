package net.dungeonhub.content

import kotlinx.html.FlowContent
import kotlinx.html.a
import kotlinx.html.article
import kotlinx.html.h5
import kotlinx.html.id
import kotlinx.html.p
import kotlinx.html.role
import kotlinx.html.style
import net.dungeonhub.model.cnt_request.CntRequestModel

fun FlowContent.cntRequestCard(
    serverId: Long,
    cntRequest: CntRequestModel
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
            gap: 0.5rem;
        """.trimIndent()

        id = cntRequest.id.toString()

        h5 {
            +"${cntRequest.requestType.name} #${cntRequest.id}"
        }

        p {
            +"${cntRequest.coinValue} - ${cntRequest.requirement}"
        }

        p {
            +if (cntRequest.completed) "Completed" else "Open"
        }

        a(
            href = "/dashboard/server/$serverId/cnt-request/${cntRequest.id}",
            classes = "contrast"
        ) {
            style = "width: 100%; max-width: 200px;"
            role = "button"
            +"Edit"
        }
    }
}
