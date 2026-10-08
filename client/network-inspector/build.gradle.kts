plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.android.kotlin.multiplatform)
    alias(libs.plugins.kotlin.serialization)
}

kotlin {
    android {
        namespace = "com.cacaosd.networkinspector"
        compileSdk = 37
        minSdk = 23

        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_11)
        }
    }

    jvm()

    sourceSets {
        val commonMain = getByName("commonMain")
        val jvmAndAndroidMain = create("jvmAndAndroidMain") {
            dependsOn(commonMain)
            dependencies {
                api(libs.okhttp)
            }
        }

        getByName("androidMain") {
            dependsOn(jvmAndAndroidMain)
        }

        getByName("jvmMain") {
            dependsOn(jvmAndAndroidMain)
        }

        commonMain.dependencies {
            api(libs.ktor.client.core)
            api(libs.kotlinx.serialization.json)
            api(libs.kotlinx.coroutines.core)
            implementation("io.github.shivathapaa:logger:2.0.0")
        }

        getByName("androidMain").dependencies {
            implementation(libs.androidx.core.ktx)
        }
    }
}