package com.cacaosd.networkinspector.protocol

import com.cacaosd.networkinspector.core.PlatformContext

class JvmHelloPayloadProvider : HelloPayloadProvider {
    override fun getHelloPayload(): HelloPayload {
        val osName = System.getProperty("os.name")
        val osVersion = System.getProperty("os.version")
        val osArch = System.getProperty("os.arch")

        return HelloPayload(
            deviceName = "$osName - $osArch",
            osVersion = osVersion,
            appName = "",
            appVersion = ""
        )
    }
}

actual fun getPayloadProvider(platformContext: PlatformContext): HelloPayloadProvider = JvmHelloPayloadProvider()