package net.dungeonhub.env

import io.github.cdimascio.dotenv.dotenv

object DotEnv {
    val dotenv = dotenv {
        ignoreIfMissing = true
    }

    val localDotenv = dotenv {
        filename = ".env.local"
        ignoreIfMissing = true
    }
}

fun env(key: String): String {
    return System.getenv(key) ?: DotEnv.localDotenv[key] ?: DotEnv.dotenv[key]
}