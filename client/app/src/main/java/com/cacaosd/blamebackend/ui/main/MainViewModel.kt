package com.cacaosd.blamebackend.ui.main

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cacaosd.blamebackend.data.repository.PostRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.time.Duration.Companion.milliseconds

@HiltViewModel
class MainViewModel @Inject constructor(
    private val repository: PostRepository
) : ViewModel() {

    private val _status = MutableStateFlow("Ready")
    val status: StateFlow<String> = _status.asStateFlow()

    fun load() {
        request("Load posts") {
            "Loaded ${repository.getPosts().size} posts"
        }
    }

    fun loadPostsByUser() {
        request("Load posts for user 1") {
            "Loaded ${repository.getPostsByUser(1).size} posts for user 1"
        }
    }

    fun loadPost() {
        request("Load post 1") {
            val post = repository.getPost(1)
            "Loaded post ${post.id}: ${post.title}"
        }
    }

    fun loadMissingPost() {
        request("Load missing post 101 (expected 404)") {
            "Unexpectedly loaded missing post ${repository.getMissingPost().id}"
        }
    }

    fun createPost() {
        request("Create post") {
            "Created post ${repository.createPost().id}"
        }
    }

    fun replacePost() {
        request("Replace post 1") {
            "Replaced post ${repository.replacePost(1).id}"
        }
    }

    fun patchPost() {
        request("Patch post 1") {
            "Patched post ${repository.patchPost(1).id}"
        }
    }

    fun deletePost() {
        request("Delete post 1") {
            "Deleted post 1: ${repository.deletePost(1)}"
        }
    }

    fun loadPostComments() {
        request("Load comments for post 1") {
            "Loaded ${repository.getPostComments(1).size} comments for post 1"
        }
    }

    fun runRandomRequestsSequentially() {
        viewModelScope.launch {
            _status.value = "Running 10 random requests sequentially..."
            val results = buildList {
                repeat(10) { index ->
                    add(runRandomRequest(index + 1))
                    _status.value = "Completed ${index + 1}/10 requests sequentially"
                    delay(100.milliseconds)
                }
            }
            _status.value = results.joinToString(
                separator = "\n",
                prefix = "Sequential run complete:\n"
            )
        }
    }

    fun runRandomRequestsConcurrently() {
        viewModelScope.launch {
            _status.value = "Running 10 random requests concurrently..."
            val results = coroutineScope {
                (1..10).map { index ->
                    async { runRandomRequest(index) }
                }.awaitAll()
            }
            _status.value = results.joinToString(
                separator = "\n",
                prefix = "Concurrent run complete:\n"
            )
        }
    }

    private fun request(name: String, action: suspend () -> String) {
        viewModelScope.launch {
            _status.value = "$name..."
            try {
                val result = action()
                Log.d("MainViewModel", result)
                _status.value = result
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (exception: Exception) {
                Log.e("MainViewModel", "$name failed", exception)
                _status.value = "$name failed: ${exception.message ?: "Unknown error"}"
            }
        }
    }

    private suspend fun runRandomRequest(index: Int): String =
        try {
            repository.randomRequest().also { result ->
                Log.d("MainViewModel", "Request $index: $result")
            }
        } catch (cancellation: CancellationException) {
            throw cancellation
        } catch (exception: Exception) {
            Log.e("MainViewModel", "Random request $index failed", exception)
            "Request $index failed: ${exception.message ?: "Unknown error"}"
        }
}
