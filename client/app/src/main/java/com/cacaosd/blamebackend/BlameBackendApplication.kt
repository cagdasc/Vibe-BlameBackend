package com.cacaosd.blamebackend

import android.app.Application
import com.cacaosd.blamebacked_core.okhttp.NetworkInspector
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class BlameBackendApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        NetworkInspector.install(this)
    }
}
