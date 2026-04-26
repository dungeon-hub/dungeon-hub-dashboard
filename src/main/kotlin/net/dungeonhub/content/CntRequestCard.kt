package net.dungeonhub.content

import kotlinx.html.FlowContent
import kotlinx.html.a
import kotlinx.html.article
import kotlinx.html.h5
import kotlinx.html.id
import kotlinx.html.p
import kotlinx.html.role
import kotlinx.html.style
import kotlinx.html.time
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
            +"${cntRequest.requestType.description} #${cntRequest.id}"
        }

        p {
            +"Request: ${cntRequest.description}"
        }

        p {
            +"Coin Value: ${cntRequest.coinValue}"
        }

        p {
            +"Requirement: ${cntRequest.requirement}"
        }

        p {
            +"${ 
                if (cntRequest.completed) "Completed" else "Open" 
            }${
                if(cntRequest.claimer != null) " | Claimed" else ""
            }"
        }

        time(classes = "js-local-time") {
            attributes["datetime"] = cntRequest.time.toString()
            +"Loading..."
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
