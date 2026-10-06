package com.cacaosd.blamebackend.data.repository

import com.cacaosd.blamebackend.data.model.Comment
import com.cacaosd.blamebackend.data.model.Post
import com.cacaosd.blamebackend.data.model.PostPatchRequest
import com.cacaosd.blamebackend.data.model.PostRequest
import com.cacaosd.blamebackend.data.remote.PostApi
import kotlinx.serialization.json.JsonObject
import javax.inject.Inject
import kotlin.random.Random

class PostRepository @Inject constructor(private val api: PostApi) {
    suspend fun getPosts(): List<Post> = api.getPosts()

    suspend fun getPostsByUser(userId: Int): List<Post> = api.getPosts(userId)

    suspend fun getPost(id: Int): Post = api.getPost(id)

    suspend fun createPost(): Post = api.createPost(
        PostRequest(
            userId = 1,
            title = "Created by BlameBackend",
            body = "A sample JSONPlaceholder post."
        )
    )

    suspend fun replacePost(id: Int): Post = api.replacePost(
        id = id,
        post = Post(
            userId = 1,
            id = id,
            title = "Replaced by BlameBackend",
            body = "A sample replacement post."
        )
    )

    suspend fun patchPost(id: Int): Post = api.patchPost(
        id = id,
        post = PostPatchRequest(title = "Patched by BlameBackend")
    )

    suspend fun deletePost(id: Int): JsonObject = api.deletePost(id)

    suspend fun getPostComments(id: Int): List<Comment> = api.getPostComments(id)

    suspend fun randomRequest(): String {
        val id = Random.nextInt(from = 1, until = 101)
        return when (Random.nextInt(8)) {
            0 -> "GET posts: loaded ${getPosts().size} posts"
            1 -> "GET posts?userId=1: loaded ${getPostsByUser(1).size} posts"
            2 -> "GET posts/$id: loaded post ${getPost(id).id}"
            3 -> "POST posts: created post ${createPost().id}"
            4 -> "PUT posts/$id: replaced post ${replacePost(id).id}"
            5 -> "PATCH posts/$id: patched post ${patchPost(id).id}"
            6 -> "DELETE posts/$id: ${deletePost(id)}"
            else -> "GET posts/$id/comments: loaded ${getPostComments(id).size} comments"
        }
    }
}