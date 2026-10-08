package com.cacaosd.networkinspector.core

actual abstract class PlatformContext private constructor() {
    companion object {
        @JvmField
        val EMPTY = object : PlatformContext() {}
    }
}