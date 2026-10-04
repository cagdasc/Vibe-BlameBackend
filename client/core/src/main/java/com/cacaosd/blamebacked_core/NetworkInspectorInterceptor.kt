package com.cacaosd.blamebacked_core

import com.cacaosd.blamebacked_core.okhttp.NetworkInspector
import com.cacaosd.blamebacked_core.okhttp.PayloadUtils
import com.cacaosd.blamebacked_core.protocol.NetworkErrorDto
import com.cacaosd.blamebacked_core.protocol.NetworkEventDto
import com.cacaosd.blamebacked_core.protocol.NetworkRequestDto
import com.cacaosd.blamebacked_core.protocol.NetworkResponseDto
import com.cacaosd.blamebacked_core.protocol.PayloadDto
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import okio.Buffer
import java.io.IOException
import java.util.UUID

/**
 * OkHttp Interceptor for Network Inspector.
 *
 * Rules strictly followed:
 * 1. Never consumes request or response bodies destructively.
 * 2. Never alters original request semantics.
 * 3. Catches and reports IOExceptions without swallowing them.
 * 4. Redacts sensitive authentication tokens and cookies.
 */
class NetworkInspectorInterceptor : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val requestId = UUID.randomUUID().toString()
        val startNs = System.nanoTime()
        val timestamp = System.currentTimeMillis()

        // 1. Capture Request metadata safely
        val requestHeaders = mutableMapOf<String, String>()
        for (i in 0 until request.headers.size) {
            requestHeaders[request.headers.name(i)] = request.headers.value(i)
        }
        val safeRequestHeaders = NetworkInspector.redactor.redact(requestHeaders)

        // Non-destructively buffer request body if present
        val requestPayload = captureRequestBody(request)

        val requestDto = NetworkRequestDto(
            id = requestId,
            timestamp = timestamp,
            method = request.method,
            url = request.url.toString(),
            host = request.url.host,
            path = request.url.encodedPath + if (request.url.encodedQuery != null) "?${request.url.encodedQuery}" else "",
            protocol = "HTTP/2.0",
            headers = safeRequestHeaders,
            body = requestPayload,
            clientType = "okhttp"
        )

        // Dispatch initial event
        NetworkInspector.dispatch(
            NetworkEventDto(
                id = requestId,
                timestamp = timestamp,
                request = requestDto
            )
        )

        // 2. Proceed with real network chain
        val response: Response
        try {
            response = chain.proceed(request)
        } catch (e: IOException) {
            val durationMs = (System.nanoTime() - startNs) / 1_000_000
            NetworkInspector.dispatch(
                NetworkEventDto(
                    id = requestId,
                    timestamp = timestamp,
                    request = requestDto,
                    durationMs = durationMs,
                    error = NetworkErrorDto(
                        errorType = e.javaClass.name,
                        message = e.message ?: "Network error during call",
                        stackTrace = e.stackTraceToString()
                    )
                )
            )
            throw e // Always rethrow to preserve application semantics
        }

        // 3. Capture Response metadata safely
        val durationMs = (System.nanoTime() - startNs) / 1_000_000
        val responseHeaders = mutableMapOf<String, String>()
        for (i in 0 until response.headers.size) {
            responseHeaders[response.headers.name(i)] = response.headers.value(i)
        }
        val safeResponseHeaders = NetworkInspector.redactor.redact(responseHeaders)

        // Use response.peekBody to avoid exhausting the response body stream
        val responsePayload = captureResponseBody(response)

        val responseDto = NetworkResponseDto(
            statusCode = response.code,
            statusMessage = response.message,
            headers = safeResponseHeaders,
            body = responsePayload,
            durationMs = durationMs,
            sizeBytes = responsePayload?.sizeBytes ?: (response.body?.contentLength() ?: 0L),
            protocol = response.protocol.toString()
        )

        NetworkInspector.dispatch(
            NetworkEventDto(
                id = requestId,
                timestamp = timestamp,
                request = requestDto,
                response = responseDto,
                durationMs = durationMs
            )
        )

        return response
    }

    private fun captureRequestBody(request: Request): PayloadDto? {
        val body = request.body ?: return null
        if (body.isOneShot()) {
            return PayloadDto(
                contentType = body.contentType()?.toString(),
                sizeBytes = body.contentLength(),
                content = "[One-shot streaming request body]",
                truncated = false,
                isBinary = false
            )
        }

        return runCatching {
            val buffer = Buffer()
            body.writeTo(buffer)
            val bytes = buffer.readByteArray()
            PayloadUtils.createPayload(
                bytes = bytes,
                contentType = body.contentType()?.toString(),
                maxSizeBytes = NetworkInspector.maxBodySizeBytes
            )
        }.getOrNull()
    }

    private fun captureResponseBody(response: Response): PayloadDto? {
        val body = response.body ?: return null
        val contentType = body.contentType()?.toString()

        return runCatching {
            // Peek up to configured limit without consuming original source
            val peek = response.peekBody(NetworkInspector.maxBodySizeBytes + 1)
            val bytes = peek.bytes()
            PayloadUtils.createPayload(
                bytes = bytes,
                contentType = contentType,
                maxSizeBytes = NetworkInspector.maxBodySizeBytes
            )
        }.getOrNull()
    }
}
