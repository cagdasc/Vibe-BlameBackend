package com.cacaosd.blamebackend.desktop

import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import com.cacaosd.blamebackend.App
import com.cacaosd.networkinspector.core.PlatformContext
import com.cacaosd.networkinspector.protocol.getPayloadProvider
import com.cacaosd.networkinspector.transport.NetworkInspector

fun main() {
    try {
        NetworkInspector.install(getPayloadProvider(PlatformContext.EMPTY))
        application {
            Window(
                onCloseRequest = ::exitApplication,
                title = "BlameBackend",
            ) {
                App()
            }
        }
    } finally {
        NetworkInspector.stop()
    }

}
