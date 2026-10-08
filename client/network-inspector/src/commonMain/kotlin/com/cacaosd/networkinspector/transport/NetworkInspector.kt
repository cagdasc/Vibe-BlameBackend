package com.cacaosd.networkinspector.transport

import com.cacaosd.networkinspector.core.HeaderRedactor
import com.cacaosd.networkinspector.core.InspectorEventBus
import com.cacaosd.networkinspector.protocol.DEFAULT_INSPECTOR_PORT
import com.cacaosd.networkinspector.protocol.HelloPayload
import com.cacaosd.networkinspector.protocol.HelloPayloadProvider
import com.cacaosd.networkinspector.protocol.MessageType
import com.cacaosd.networkinspector.protocol.WireEnvelope
import dev.shivathapaa.logger.api.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Android Network Inspector Facade.
 *
 * Captures, transports, and inspects HTTP traffic without affecting application semantics.
 * Completely inert/no-op in release builds or when the desktop tool is disconnected.
 */
object NetworkInspector {
    private const val TAG = "NetworkInspector"
    private val isStarted = AtomicBoolean(false)
    private var config: NetworkInspectorConfig = NetworkInspectorConfig()
    private var server: InspectorServer? = null
    private var scope: CoroutineScope? = null

    fun install(
        payloadProvider: HelloPayloadProvider,
        configuration: NetworkInspectorConfig = NetworkInspectorConfig()
    ) {
        if (isStarted.compareAndSet(false, true)) {
            this.config = configuration
            InspectorEventBus.configure(
                configuration.redactor,
                configuration.maxBodySizeBytes,
                configuration.maxQueueSize,
            )
            scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
            startInternal(payloadProvider.getHelloPayload())
        }
    }

    private fun startInternal(helloPayload: HelloPayload) {
        server = InspectorServer(
            port = config.port,
            helloPayload = helloPayload,
            onClientConnected = { client ->
                Log.i("Desktop inspector connected: ${client.remoteSocketAddress}")
            },
            onError = { error -> Log.e("Inspector server error", throwable = error) }
        ).apply { start() }

        scope?.launch(start = CoroutineStart.UNDISPATCHED) {
            InspectorEventBus.events.collect { event ->
                try {
                    val json = Json.encodeToString(event)
                    val envelope = WireEnvelope(
                        type = MessageType.NETWORK_EVENT,
                        timestamp = System.currentTimeMillis(),
                        payloadJson = json
                    )
                    server?.broadcast(Json.encodeToString(envelope))
                } catch (error: Exception) {
                    Log.e("Error processing event", throwable = error)
                }
            }
        }

        Log.i("NetworkInspector active on 127.0.0.1:${config.port}. Forward via 'adb forward tcp:${config.port} tcp:${config.port}'")
    }

    /**
     * Non-blocking event dispatch.
     * Uses backpressure drop-oldest policy so network threads are never blocked.
     */
    fun stop() {
        if (isStarted.compareAndSet(true, false)) {
            server?.stop()
            server = null
            scope?.cancel()
            scope = null
        }
    }
}

data class NetworkInspectorConfig(
    val port: Int = DEFAULT_INSPECTOR_PORT,
    val maxBodySizeBytes: Long = 64 * 1024L, // 64 KB
    val maxQueueSize: Int = 500,
    val redactor: HeaderRedactor = HeaderRedactor()
) {
    init {
        require(maxQueueSize > 0) { "maxQueueSize must be greater than zero" }
    }
}
