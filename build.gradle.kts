plugins {
    kotlin("jvm") version libs.versions.kotlin.get()
    kotlin("plugin.serialization") version libs.versions.kotlin.get()
    application
    id("dev.kordex.gradle.kordex") version "1.9.0"
}

group = "net.dungeonhub"
version = "1.0.0"

repositories {
    mavenCentral()
    mavenLocal()
}

kordEx {
    kordExVersion = libs.versions.kord.extensions.get()
    jvmTarget = 21
}

dependencies {
    // Kotlinx Frameworks
    implementation(libs.kotlinx.html.jvm)
    implementation(libs.kotlinx.serialization.json)

    // Ktor Server
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.netty)
    implementation(libs.ktor.server.html.builder)
    implementation(libs.ktor.server.auth)

    // Ktor Client
    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.apache5)

    // Dungeon Hub Libraries
    implementation(libs.dungeon.hub.api.client)

    // Environment Variables
    implementation(libs.dotenv)

    // Logging Framework
    runtimeOnly(libs.logback.classic)

    // Testing
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
}

kotlin {
    jvmToolchain(21)
}

application {
    mainClass.set("net.dungeonhub.MainKt")
}