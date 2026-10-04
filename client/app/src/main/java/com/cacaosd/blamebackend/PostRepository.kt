package com.cacaosd.blamebackend

import javax.inject.Inject

class PostRepository @Inject constructor(private val api: PostApi) {
    suspend fun getPosts(): Result<List<Post>> = runCatching { api.getPosts() }
}