package com.cacaosd.blamebacked_core.okhttp

import com.cacaosd.blamebacked_core.protocol.PayloadDto
import java.nio.charset.Charset

object PayloadUtils {

    private val BINARY_MEDIA_TYPES = listOf(
        "image/",
        "audio/",
        "video/",
        "font/",
        "application/octet-stream",
        "application/pdf",
        "application/zip",
        "application/gzip"
    )

    fun isBinary(contentType: String?): Boolean {
        if (contentType == null) return false
        val clean = contentType.substringBefore(";").trim().lowercase()
        return BINARY_MEDIA_TYPES.any { clean.startsWith(it) }
    }

    fun createPayload(
        bytes: ByteArray,
        contentType: String?,
        maxSizeBytes: Long,
        charset: Charset = Charsets.UTF_8
    ): PayloadDto {
        val sizeBytes = bytes.size.toLong()
        val isBinaryContent = isBinary(contentType)
        val truncated = sizeBytes > maxSizeBytes

        val captureLength = if (truncated) maxSizeBytes.toInt() else bytes.size

        return if (isBinaryContent) {
            val previewBytes = bytes.copyOfRange(0, minOf(bytes.size, 64))
            PayloadDto(
                contentType = contentType,
                sizeBytes = sizeBytes,
                content = null,
                truncated = truncated,
                isBinary = true,
                hexPreview = formatHexPreview(previewBytes)
            )
        } else {
            val decodedString = runCatching {
                String(bytes, 0, captureLength, charset)
            }.getOrElse { "[Unable to decode text body: ${it.message}]" }

            PayloadDto(
                contentType = contentType,
                sizeBytes = sizeBytes,
                content = decodedString,
                truncated = truncated,
                isBinary = false
            )
        }
    }

    private fun formatHexPreview(bytes: ByteArray): String {
        return bytes.joinToString(" ") { "%02X".format(it) }
    }
}
