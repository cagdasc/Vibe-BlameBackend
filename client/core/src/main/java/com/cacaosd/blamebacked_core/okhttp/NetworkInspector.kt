package com.cacaosd.blamebacked_core.okhttp

import android.content.Context
import android.os.Build
import android.util.Log
import com.cacaosd.blamebacked_core.protocol.DEFAULT_INSPECTOR_PORT
import com.cacaosd.blamebacked_core.protocol.HelloPayload
import com.cacaosd.blamebacked_core.protocol.MessageType
import com.cacaosd.blamebacked_core.protocol.NetworkEventDto
import com.cacaosd.blamebacked_core.protocol.WireEnvelope
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import java.util.concurrent.ArrayBlockingQueue
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
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // Memory-bounded event queue to prevent any memory growth or thread blocking
    private val eventQueue = ArrayBlockingQueue<NetworkEventDto>(config.maxQueueSize)

    fun install(context: Context, configuration: NetworkInspectorConfig = NetworkInspectorConfig()) {
        if (isStarted.compareAndSet(false, true)) {
            this.config = configuration
            startInternal(context.applicationContext)
        }
    }

    private fun startInternal(appContext: Context) {
        val packageInfo = runCatching {
            appContext.packageManager.getPackageInfo(appContext.packageName, 0)
        }.getOrNull()

        val hello = HelloPayload(
            deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}",
            androidVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
            appPackage = appContext.packageName,
            appVersion = packageInfo?.versionName ?: "debug"
        )

        server = InspectorServer(
            port = config.port,
            helloPayload = hello,
            onClientConnected = { client ->
                Log.d(TAG, "Desktop inspector connected: ${client.remoteSocketAddress}")
            }
        ).apply { start() }

        // Event processing worker in background coroutine
        scope.launch {
            while (isActive) {
                try {
                    val event = withContext(Dispatchers.IO) { eventQueue.take() }
                    val json = Json.encodeToString(event)
                    val envelope = WireEnvelope(
                        type = MessageType.NETWORK_EVENT,
                        payloadJson = json
                    )
                    server?.broadcast(Json.encodeToString(envelope))
                } catch (e: InterruptedException) {
                    break
                } catch (e: Exception) {
                    // Silently ignore transport exceptions: networking thread must never fail
                    Log.e(TAG, "Error processing event", e)
                }
            }
        }

        Log.i(TAG, "NetworkInspector active on 127.0.0.1:${config.port}. Forward via 'adb forward tcp:${config.port} tcp:${config.port}'")
    }

    /**
     * Non-blocking event dispatch.
     * Uses backpressure drop-oldest policy so network threads are never blocked.
     */
    fun dispatch(event: NetworkEventDto) {
        if (!isStarted.get()) return

        // If queue is full, drop oldest event to keep recent events flowing
        if (!eventQueue.offer(event)) {
            eventQueue.poll() // Drop oldest
            eventQueue.offer(event)
        }
    }

    fun stop() {
        if (isStarted.compareAndSet(true, false)) {
            server?.stop()
            server = null
            eventQueue.clear()
            scope.cancel()
        }
    }

    val redactor: HeaderRedactor
        get() = config.redactor

    val maxBodySizeBytes: Long
        get() = config.maxBodySizeBytes
}

data class NetworkInspectorConfig(
    val port: Int = DEFAULT_INSPECTOR_PORT,
    val maxBodySizeBytes: Long = 64 * 1024L, // 64 KB
    val maxQueueSize: Int = 500,
    val redactor: HeaderRedactor = HeaderRedactor()
)
