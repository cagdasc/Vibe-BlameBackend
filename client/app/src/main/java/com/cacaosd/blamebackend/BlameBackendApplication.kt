package com.cacaosd.blamebackend

import android.app.Application
import com.cacaosd.networkinspector.protocol.AndroidHelloPayloadProvider
import com.cacaosd.networkinspector.transport.NetworkInspector

class BlameBackendApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        NetworkInspector.install(AndroidHelloPayloadProvider(this))
    }
}
