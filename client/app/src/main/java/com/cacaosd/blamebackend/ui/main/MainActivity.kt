package com.cacaosd.blamebackend.ui.main

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    val status by viewModel.status.collectAsStateWithLifecycle()
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("BlameBackend")
                        Text(status, modifier = Modifier.fillMaxWidth())
                        Button(
                            onClick = { viewModel.load() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Load posts")
                        }
                        Button(
                            onClick = { viewModel.loadPostsByUser() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Load posts for user 1")
                        }
                        Button(
                            onClick = { viewModel.loadPost() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Load post 1")
                        }
                        Button(
                            onClick = { viewModel.createPost() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Create post (POST)")
                        }
                        Button(
                            onClick = { viewModel.replacePost() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Replace post 1 (PUT)")
                        }
                        Button(
                            onClick = { viewModel.patchPost() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Patch post 1 (PATCH)")
                        }
                        Button(
                            onClick = { viewModel.deletePost() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Delete post 1 (DELETE)")
                        }
                        Button(
                            onClick = { viewModel.loadPostComments() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Load comments for post 1")
                        }
                        Button(
                            onClick = { viewModel.runRandomRequestsSequentially() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Run 10 random requests sequentially")
                        }
                        Button(
                            onClick = { viewModel.runRandomRequestsConcurrently() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Run 10 random requests concurrently")
                        }
                    }
                }
            }
        }
    }
}
