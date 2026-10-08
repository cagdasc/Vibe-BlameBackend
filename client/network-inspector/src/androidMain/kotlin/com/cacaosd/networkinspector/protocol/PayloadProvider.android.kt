package com.cacaosd.networkinspector.protocol

import android.content.Context
import android.os.Build
import com.cacaosd.networkinspector.core.PlatformContext

class AndroidHelloPayloadProvider(private val appContext: Context) : HelloPayloadProvider {
    override fun getHelloPayload(): HelloPayload {
        val packageInfo = runCatching {
            appContext.packageManager.getPackageInfo(appContext.packageName, 0)
        }.getOrNull()

        return HelloPayload(
            deviceName = "${Build.MANUFACTURER} ${Build.MODEL}",
            osVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
            appName = appContext.packageName,
            appVersion = packageInfo?.versionName ?: "debug"
        )
    }
}

actual fun getPayloadProvider(platformContext: PlatformContext): HelloPayloadProvider =
    AndroidHelloPayloadProvider(platformContext)