package com.cacaosd.blamebackend.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Post(
    val userId: Int,
    val id: Int,
    val title: String,
    val body: String,
)

@Serializable
data class PostRequest(
    val userId: Int,
    val title: String,
    val body: String,
)

@Serializable
data class PostPatchRequest(
    val userId: Int? = null,
    val title: String? = null,
    val body: String? = null,
)

@Serializable
data class Comment(
    val postId: Int,
    val id: Int,
    val name: String,
    val email: String,
    val body: String,
)
