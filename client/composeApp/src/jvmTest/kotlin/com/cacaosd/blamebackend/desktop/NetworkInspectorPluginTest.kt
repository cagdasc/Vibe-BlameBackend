package com.cacaosd.blamebackend.desktop

import com.cacaosd.networkinspector.core.InspectorEventBus
import com.cacaosd.networkinspector.ktor.NetworkInspectorPlugin
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import java.net.ServerSocket
import java.net.Socket
import kotlin.concurrent.thread
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
private data class RequestPayload(val message: String)

class NetworkInspectorPluginTest {
    @Test
    fun capturesResponseBodyWithoutConsumingIt() = runBlocking {
        val responseBody = """{"message":"captured"}"""
        val server = startServer { socket ->
            readRequestHeaders(socket)
            val bodyBytes = responseBody.encodeToByteArray()
            val responseHeaders = (
                "HTTP/1.1 200 OK\r\n" +
                    "Content-Type: application/json\r\n" +
                    "Content-Length: ${bodyBytes.size}\r\n" +
                    "Connection: close\r\n\r\n"
                ).encodeToByteArray()
            socket.getOutputStream().apply {
                write(responseHeaders)
                write(bodyBytes)
                flush()
            }
        }
        val client = HttpClient(CIO) {
            expectSuccess = true
            install(NetworkInspectorPlugin)
        }

        try {
            val expectedUrl = "http://127.0.0.1:${server.localPort}/body"
            val event = async {
                withTimeout(5_000) {
                    InspectorEventBus.events.first {
                        it.request.url == expectedUrl && it.response != null
                    }
                }
            }
            val response = client.get(expectedUrl)

            assertEquals(responseBody, response.bodyAsText())
            assertEquals(responseBody, event.await().response?.body?.content)
        } finally {
            client.close()
            server.close()
        }
    }

    @Test
    fun capturesRequestBodyWithoutChangingWhatIsSent() = runBlocking {
        val requestBody = """{"message":"copied"}"""
        val server = startServer { socket ->
            val headers = readRequestHeaders(socket)
            val contentLength = headers.lineSequence()
                .first { it.startsWith("Content-Length:", ignoreCase = true) }
                .substringAfter(":")
                .trim()
                .toInt()
            val bodyBytes = ByteArray(contentLength)
            var read = 0
            while (read < contentLength) {
                val count = socket.getInputStream().read(bodyBytes, read, contentLength - read)
                if (count < 0) error("Request body ended early")
                read += count
            }
            check(bodyBytes.decodeToString() == requestBody)
            socket.getOutputStream().apply {
                write(
                    "HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
                        .encodeToByteArray()
                )
                flush()
            }
        }
        val client = HttpClient(CIO) {
            expectSuccess = true
            install(ContentNegotiation) {
                json(Json)
            }
            install(NetworkInspectorPlugin)
        }

        try {
            val expectedUrl = "http://127.0.0.1:${server.localPort}/body"
            val event = async {
                withTimeout(5_000) {
                    InspectorEventBus.events.first {
                        it.request.url == expectedUrl && it.request.body != null
                    }
                }
            }
            client.post(expectedUrl) {
                contentType(ContentType.Application.Json)
                setBody(RequestPayload("copied"))
            }

            assertEquals(requestBody, event.await().request.body?.content)
        } finally {
            client.close()
            server.close()
        }
    }

    private fun startServer(handler: (Socket) -> Unit): ServerSocket {
        val server = ServerSocket(0)
        thread(isDaemon = true) {
            server.accept().use(handler)
        }
        return server
    }

    private fun readRequestHeaders(socket: Socket): String {
        val input = socket.getInputStream()
        val headers = StringBuilder()
        while (true) {
            val value = input.read()
            if (value < 0) error("Request ended before headers were complete")
            headers.append(value.toChar())
            if (headers.endsWith("\r\n\r\n")) return headers.toString()
        }
    }
}
