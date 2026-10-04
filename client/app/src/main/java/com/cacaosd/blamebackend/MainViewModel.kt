package com.cacaosd.blamebackend

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val repository: PostRepository
) : ViewModel() {

    fun load() {
        viewModelScope.launch {
            repository.getPosts()
                .onSuccess { posts ->
                    Log.d("MainViewModel", "Loaded ${posts.size} posts")
                }
                .onFailure { Log.e("MainViewModel", "Error loading posts $it") }
        }
    }
}
