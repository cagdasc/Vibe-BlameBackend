package com.cacaosd.blamebackend.data.remote

import com.cacaosd.blamebackend.data.model.Comment
import com.cacaosd.blamebackend.data.model.Post
import com.cacaosd.blamebackend.data.model.PostPatchRequest
import com.cacaosd.blamebackend.data.model.PostRequest
import kotlinx.serialization.json.JsonObject
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.PUT
import retrofit2.http.Query

interface PostApi {
    @GET("posts")
    suspend fun getPosts(@Query("userId") userId: Int? = null): List<Post>

    @GET("posts/{id}")
    suspend fun getPost(@Path("id") id: Int): Post

    @POST("posts")
    suspend fun createPost(@Body post: PostRequest): Post

    @PUT("posts/{id}")
    suspend fun replacePost(@Path("id") id: Int, @Body post: Post): Post

    @PATCH("posts/{id}")
    suspend fun patchPost(
        @Path("id") id: Int,
        @Body post: PostPatchRequest,
    ): Post

    @DELETE("posts/{id}")
    suspend fun deletePost(@Path("id") id: Int): JsonObject

    @GET("posts/{id}/comments")
    suspend fun getPostComments(@Path("id") id: Int): List<Comment>
}