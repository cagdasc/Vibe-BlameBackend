# BlameBackend

> **Real-time Android Network Inspector & Terminal TUI for OkHttp and Ktor.**  
> BlameBackend captures HTTP/HTTPS traffic directly from your Android app over a local TCP socket, streaming requests, responses, headers, and timings straight into a modern terminal-style web console or headless shell CLI.

> **Note:** Vibe coded. No idea where it goes.

![TUI Console](assets/tui.png)

---

## Notice: Client Library Status

> ⚠️ **The Android client library is still actively under development.**  
> There is **no published artifact (Maven Central / JitPack) yet**. To use it in your app, include the `:core` module locally from `/client/core`:
>
> ```kotlin
> implementation(project(":core"))
> ```

---

## Features

- **Zero Semantics Alteration**: Intercepts requests and responses non-destructively using OkHttp's `peekBody`.
- **Automatic Port Forwarding**: Automatically detects attached USB devices and emulators, forwarding `tcp:10245` on selection.
- **Interactive TUI Console**: Keyboard-driven UI (`j`/`k` navigation, `/` search, `c` clear, `Tab` panel switching).
- **Headless Terminal CLI**: Stream colored requests directly in your shell (`npm run cli`).
- **Sensitive Data Redaction**: Automatic redaction of auth tokens, cookies, and secret headers.
- **Binary & Image Inspection**: Safe hex preview for non-text payloads.

---

## Quickstart

### 1. Web Console & Server

```bash
# Install dependencies
npm install

# Start local server (http://localhost:3000)
npm run dev
```

*(Or press `Ctrl+Shift+B` / `Cmd+Shift+B` in VS Code).*

### 2. Android App Integration

```kotlin
// In Application.onCreate:
NetworkInspector.install(this)

// In OkHttpClient builder:
OkHttpClient.Builder()
    .addInterceptor(NetworkInspectorInterceptor())
    .build()
```

### 3. Run the Android App & Select Device

```bash
cd client
./gradlew installDebug
```

Open the **Devices** tab in BlameBackend—your device is auto-selected and port-forwarded.

![Devices](assets/devices.png)

### 4. Custom Request Dispatcher

Test endpoint edge cases or inject custom payloads directly into the inspector using the built-in Dispatcher:

![Dispatcher](assets/dispatcher.png)

### 5. Standalone Terminal CLI (Without Browser)

```bash
npm run cli
# or
npx tsx desktop-cli.ts
```

![Terminal CLI](assets/cli.png)

---

## License

```text
Copyright 2026 Cagdas Caglak

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
