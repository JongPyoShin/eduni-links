# EDUNI Android Portal baseline

This directory contains the recovered Android baseline for the EDUNI portal and
Native Jungle. It intentionally preserves the behavior of the local source
candidate audited for JNG-BASE-001.

## Project configuration

- Gradle wrapper: 8.9
- Android Gradle Plugin: 8.7.3
- Module: `:app`
- Namespace/application ID: `com.eduni.portal`
- Minimum SDK: 23
- Compile/target SDK: 35

Android Studio can create `local.properties` for the local SDK. Command-line
builds can instead set `ANDROID_HOME` or `ANDROID_SDK_ROOT`; no machine-local SDK
path is tracked.

Android Gradle Plugin 8.7 requires JDK 17 or newer. The recovered baseline is
validated with the JBR bundled with Android Studio.

```powershell
.\gradlew.bat test assembleDebug
```

The debug APK is generated at
`app/build/outputs/apk/debug/app-debug.apk` and must not be committed.

## Activity relationship

`MainActivity` is the landscape WebView portal launcher and opens
`NativeJungleActivity` for Jungle routes. `NativeJungleActivity` owns the
current Canvas game view, input handling, game state, local persistence, quiz
requests, and progress events.

`DebugJungleActivity` is declared only in the debug source set. It immediately
starts `NativeJungleActivity` and finishes, so debug and portal launches use the
same Native Jungle input and game-state implementation.

## Network and local state

The recovered behavior uses the existing private HTTP endpoint
`http://100.75.214.95:8081` for portal, quiz, and progress requests. Cleartext
traffic for the existing private/emulator hosts remains enabled in
`network_security_config.xml`. Jungle stage progress and sticker rewards use
Android `SharedPreferences`; quiz loading has a local fallback.

## Recovery notes

Generated Gradle output, IDE state, APKs, `local.properties`, signing material,
device captures, and historical backup files were excluded from the recovery.
Two source images contained JPEG bytes under `.png` names; only their extensions
were corrected to `.jpg` so AAPT2 can compile them. Android resource identifiers
and image bytes are unchanged.

The local candidate used Gradle 9.3.0 with Android Gradle Plugin 8.7.3. The
wrapper distribution was normalized to the plugin's supported Gradle 8.9
version; this affects only the build toolchain.

The source candidate contained no asset license or attribution record. Asset
provenance must be confirmed by the repository owner before redistribution.
