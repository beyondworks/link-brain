# iOS Extensions Setup Guide

## Prerequisites
- Xcode 15+
- Apple Developer account (for App Groups)

## Step 1: Enable App Groups

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the `App` target -> Signing & Capabilities
3. Click `+ Capability` -> `App Groups`
4. Add group: `group.com.linkbrain.app`

## Step 2: Add Share Extension

1. File -> New -> Target -> Share Extension
2. Product Name: `ShareExtension`
3. Bundle Identifier: `cloud.linkbrain.app.ShareExtension`
4. Delete the auto-generated `ShareViewController.swift`
5. Add existing file: `ios/ShareExtension/ShareViewController.swift`
6. Add existing file: `ios/ShareExtension/Info.plist` (replace auto-generated)
7. Select ShareExtension target -> Signing & Capabilities -> Add `App Groups` -> same group
8. Select ShareExtension target -> Signing & Capabilities -> Add `Keychain Sharing` -> access group: `group.com.linkbrain.app`

## Step 3: Add Widget Extension

1. File -> New -> Target -> Widget Extension
2. Product Name: `LinkbrainWidget`
3. Bundle Identifier: `cloud.linkbrain.app.LinkbrainWidget`
4. Uncheck "Include Live Activity" and "Include Configuration App Intent"
5. Delete auto-generated files
6. Add existing file: `ios/LinkbrainWidget/LinkbrainWidget.swift`
7. Add existing file: `ios/LinkbrainWidget/Info.plist` (replace auto-generated)
8. Select LinkbrainWidget target -> Signing & Capabilities -> Add `App Groups` -> same group
9. Set deployment target to iOS 17.0

## Step 4: Keychain Sharing (for Share Extension auth)

For the main App target:
1. Signing & Capabilities -> Add `Keychain Sharing`
2. Keychain Groups: `group.com.linkbrain.app`

## Step 5: Build & Test

1. Select `App` scheme -> Build (Cmd+B)
2. Run on simulator -> test Share Extension from Safari
3. Add widgets from home screen long-press -> "Linkbrain" widgets

## Troubleshooting

- **Share Extension doesn't appear**: Check activation rules in ShareExtension/Info.plist
- **Widget shows placeholder only**: Ensure App Groups is enabled on both App and Widget targets
- **Keychain read fails**: Verify access group matches exactly between App and ShareExtension
