package com.cacaosd.blamebacked_core.okhttp

import com.cacaosd.blamebacked_core.protocol.HelloPayload
import com.cacaosd.blamebacked_core.protocol.MessageType
import com.cacaosd.blamebacked_core.protocol.WireEnvelope
import kotlinx.serialization.json.Json
import java.io.BufferedWriter
import java.io.OutputStreamWriter
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

/**
 * Local TCP server bound to 127.0.0.1 on the Android device.
 * Accessed by Desktop CLI via: `adb forward tcp:PORT tcp:PORT`.
 */
class InspectorServer(
    private val port: Int,
    private val helloPayload: HelloPayload,
    private val onClientConnected: (Socket) -> Unit = {}
) {
    private var serverSocket: ServerSocket? = null
    private val isRunning = AtomicBoolean(false)
    private val activeClients = CopyOnWriteArrayList<ConnectedClient>()

    fun start() {
        if (isRunning.compareAndSet(false, true)) {
            thread(name = "inspector-server-accept", isDaemon = true) {
                runCatching {
                    serverSocket = ServerSocket().apply {
                        reuseAddress = true
                        bind(InetSocketAddress("127.0.0.1", port))
                    }

                    while (isRunning.get()) {
                        val clientSocket = serverSocket?.accept() ?: break
                        handleNewClient(clientSocket)
                    }
                }
            }
        }
    }

    private fun handleNewClient(socket: Socket) {
        runCatching {
            socket.tcpNoDelay = true
            val writer = BufferedWriter(OutputStreamWriter(socket.getOutputStream(), Charsets.UTF_8))
            val client = ConnectedClient(socket, writer)
            activeClients.add(client)
            onClientConnected(socket)

            // Send initial HELLO handshake envelope
            val helloEnvelope = WireEnvelope(
                type = MessageType.HELLO,
                payloadJson = Json.encodeToString(helloPayload)
            )
            client.send(Json.encodeToString(helloEnvelope))
        }
    }

    fun broadcast(line: String) {
        val deadClients = mutableListOf<ConnectedClient>()
        for (client in activeClients) {
            val ok = client.send(line)
            if (!ok) deadClients.add(client)
        }
        activeClients.removeAll(deadClients)
    }

    fun stop() {
        if (isRunning.compareAndSet(true, false)) {
            runCatching { serverSocket?.close() }
            activeClients.forEach { it.close() }
            activeClients.clear()
        }
    }

    private class ConnectedClient(
        private val socket: Socket,
        private val writer: BufferedWriter
    ) {
        fun send(text: String): Boolean {
            return synchronized(writer) {
                runCatching {
                    writer.write(text)
                    writer.newLine()
                    writer.flush()
                    true
                }.getOrDefault(false)
            }
        }

        fun close() {
            runCatching { socket.close() }
        }
    }
}
