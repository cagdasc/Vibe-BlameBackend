package com.cacaosd.networkinspector.protocol

import com.cacaosd.networkinspector.core.PlatformContext

interface HelloPayloadProvider {
    fun getHelloPayload(): HelloPayload
}

expect fun getPayloadProvider(platformContext: PlatformContext): HelloPayloadProvider