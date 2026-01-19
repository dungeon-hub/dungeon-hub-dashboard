package net.dungeonhub.data

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

class DiscordGuild(val id: Long, val name: String, val icon: String?) {
    companion object {
        fun JsonObject.toDiscordGuild(): DiscordGuild {
            return DiscordGuild(
                this["id"]!!.jsonPrimitive.content.toLong(),
                this["name"]!!.jsonPrimitive.content,
                this["icon"]?.jsonPrimitive?.contentOrNull
            )
        }
    }
}