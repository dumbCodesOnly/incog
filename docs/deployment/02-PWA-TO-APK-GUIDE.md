# PWA-to-APK Packaging Guide

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Pre-Development Blueprint

---

## Executive Summary

This document provides a comprehensive guide for packaging the Incog browser web application as a progressive web app (PWA) with eventual Android APK distribution through Trusted Web Activity (TWA) or Capacitor frameworks. The guide covers PWA implementation, APK generation, signing, and Play Store submission.

---

## 1. Progressive Web App (PWA) Implementation

### 1.1 PWA Requirements

A Progressive Web App must meet the following requirements:

**HTTPS:** All content MUST be served over HTTPS with valid SSL certificates.

**Web App Manifest:** A `manifest.json` file MUST define app metadata and icons.

**Service Worker:** A service worker MUST handle offline functionality and caching.

**Responsive Design:** The app MUST work on all screen sizes (mobile, tablet, desktop).

**Installable:** Users MUST be able to install the app on their device.

### 1.2 Web App Manifest

**Create `client/public/manifest.json`:**

```json
{
  "name": "Incog - Secure Multi-Account Browser",
  "short_name": "Incog",
  "description": "Privacy-focused browser with multi-account management and advanced security",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#000000",
  "background_color": "#FFFFFF",
  "categories": ["productivity", "utilities"],
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshot-540x720.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshot-1280x720.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "shortcuts": [
    {
      "name": "Create Account",
      "short_name": "New Account",
      "description": "Create a new browsing account",
      "url": "/accounts?action=create",
      "icons": [
        {
          "src": "/shortcut-icon-192x192.png",
          "sizes": "192x192",
          "type": "image/png"
        }
      ]
    }
  ]
}
```

**Reference in HTML:**

```html
<!-- client/index.html -->
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#000000" />
<meta
  name="description"
  content="Privacy-focused browser with multi-account management"
/>
```

### 1.3 Service Worker

**Create `client/src/service-worker.ts`:**

```typescript
declare const self: ServiceWorkerGlobalScope;

// Cache version
const CACHE_VERSION = "v1.0.0";
const CACHE_NAME = `incog-${CACHE_VERSION}`;

// Files to cache on install
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

// Install event
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Network first for API calls
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache on network error
          return caches.match(request);
        })
    );
    return;
  }

  // Cache first for static assets
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
});
```

**Register Service Worker in `client/src/main.tsx`:**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then((registration) => {
    console.log('Service Worker registered:', registration);
  }).catch((error) => {
    console.error('Service Worker registration failed:', error);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 1.4 Web App Installation

**Add install prompt:**

```typescript
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('App installed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
      <p className="mb-2">Install Incog for quick access</p>
      <button
        onClick={handleInstall}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Install
      </button>
    </div>
  );
}
```

---

## 2. Trusted Web Activity (TWA)

### 2.1 TWA Overview

Trusted Web Activity (TWA) is a technology that allows a web app to be packaged as an Android app and distributed through the Google Play Store. The app runs in a full-screen Chrome Custom Tab.

**Advantages:**

- Reuse existing web codebase
- Distribute through Play Store
- Access to native Android APIs
- Automatic updates through web app

**Requirements:**

- HTTPS domain with valid SSL certificate
- Digital Asset Links configuration
- Android keystore for signing
- Google Play Developer account

### 2.2 Digital Asset Links Configuration

**Create `/.well-known/assetlinks.json`:**

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.incog.browser",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

**Generate SHA256 fingerprint:**

```bash
# From keystore
keytool -list -v -keystore release.keystore -alias release_key

# Output includes:
# SHA256: AA:BB:CC:DD:...
```

### 2.3 TWA Project Setup

**Install Bubblewrap CLI:**

```bash
npm install -g @bubblewrap/cli
```

**Initialize TWA project:**

```bash
bubblewrap init \
  --package=com.incog.browser \
  --host=incog-browser.com \
  --app-name="Incog" \
  --app-short-name="Incog" \
  --app-version=1.0.0 \
  --icon=/path/to/icon-512x512.png
```

**Project structure:**

```
twa-project/
├── android/                   # Android project
├── bubblewrap.json           # Configuration
├── icon.png                  # App icon
└── twa-manifest.json         # TWA manifest
```

### 2.4 Building APK

**Build signed APK:**

```bash
# Generate keystore (first time only)
keytool -genkey -v -keystore release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias release_key

# Build APK
bubblewrap build \
  --keystore=release.keystore \
  --keystore-alias=release_key \
  --keystore-password=YOUR_PASSWORD \
  --key-password=YOUR_PASSWORD

# Output: app-release.apk
```

### 2.5 TWA Configuration

**`twa-manifest.json`:**

```json
{
  "packageId": "com.incog.browser",
  "host": "incog-browser.com",
  "name": "Incog",
  "shortName": "Incog",
  "launcherIcon": "/icon-192x192.png",
  "primaryColor": "#000000",
  "themeColor": "#000000",
  "display": "standalone",
  "startUrl": "/",
  "orientation": "portrait",
  "scope": "/",
  "enableNotifications": true,
  "shareTarget": {
    "action": "/share",
    "method": "POST",
    "encType": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

---

## 3. Capacitor Integration (Alternative)

### 3.1 Capacitor Setup

**Install Capacitor:**

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init
```

**Configuration:**

```json
{
  "appId": "com.incog.browser",
  "appName": "Incog",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 0
    }
  }
}
```

### 3.2 Building with Capacitor

**Build web app:**

```bash
pnpm build
```

**Add Android platform:**

```bash
npx cap add android
```

**Build APK:**

```bash
npx cap build android
```

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

---

## 4. APK Signing & Distribution

### 4.1 APK Signing

**Sign APK with release keystore:**

```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore release.keystore \
  app-release-unsigned.apk \
  release_key

# Verify signature
jarsigner -verify -verbose -certs app-release.apk
```

### 4.2 Play Store Submission

**Create Play Store listing:**

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Fill in app details:
   - App name: "Incog"
   - Category: Productivity
   - Content rating: Unrated
   - Privacy policy: [URL]
4. Upload APK
5. Fill in store listing:
   - Title
   - Short description
   - Full description
   - Screenshots
   - Feature graphic
6. Set pricing and distribution
7. Submit for review

**Store Listing Template:**

```
Title: Incog - Secure Multi-Account Browser

Short Description:
Privacy-focused browser with multi-account management and advanced security.

Full Description:
Incog is a secure, privacy-focused browser that enables multi-account management with complete session isolation. Features include:

- Multi-account management with complete session isolation
- Advanced security with encryption and anti-fingerprinting
- Proxy support (HTTP, HTTPS, SOCKS5, V2Ray)
- Incognito mode with memory-only storage
- Biometric account protection
- Cross-platform support (web, mobile, desktop)

Permissions:
- Internet: Required for web browsing
- Storage: Required for cache and data storage
```

### 4.3 App Updates

**Update version in manifest:**

```json
{
  "version": "1.0.1",
  "versionCode": 2
}
```

**Build and submit new APK:**

```bash
# Increment version
npm version patch

# Build APK
pnpm build
bubblewrap build --keystore=release.keystore

# Upload to Play Store
# (via Play Console UI)
```

---

## 5. Testing

### 5.1 PWA Testing

**Test PWA functionality:**

```bash
# Lighthouse audit
npm install -g lighthouse
lighthouse https://incog-browser.com --view

# Check PWA requirements
# - HTTPS: ✓
# - Manifest: ✓
# - Service Worker: ✓
# - Responsive: ✓
# - Installable: ✓
```

### 5.2 APK Testing

**Test APK on device:**

```bash
# Install APK on device
adb install app-release.apk

# Run app
adb shell am start -n com.incog.browser/.MainActivity

# View logs
adb logcat | grep incog

# Uninstall
adb uninstall com.incog.browser
```

### 5.3 Emulator Testing

**Test on Android emulator:**

```bash
# Create emulator
android create avd -n incog-emulator -t android-34

# Start emulator
emulator -avd incog-emulator

# Install APK
adb install app-release.apk
```

---

## 6. Performance Optimization for Mobile

### 6.1 Bundle Size Optimization

**Reduce bundle size:**

```bash
# Analyze bundle
npm install -g webpack-bundle-analyzer
webpack-bundle-analyzer dist/assets/index.*.js

# Code splitting
# - Lazy load pages
# - Tree shake unused code
# - Minify CSS and JavaScript
```

### 6.2 Offline Support

**Enhance offline functionality:**

```typescript
// Service worker caching strategy
// Network first for API calls
// Cache first for static assets
// Stale while revalidate for images
```

### 6.3 Mobile-Specific Optimizations

**Optimize for mobile:**

```typescript
// Reduce animations on low-end devices
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// Optimize touch interactions
// - Larger touch targets (44x44px minimum)
// - Faster response times
// - Haptic feedback

// Optimize battery usage
// - Reduce background activity
// - Batch network requests
// - Use efficient algorithms
```

---

## 7. Monitoring & Analytics

### 7.1 Crash Reporting

**Setup crash reporting:**

```typescript
// Firebase Crashlytics integration
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";

const firebaseApp = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const analytics = getAnalytics(firebaseApp);

// Log events
logEvent(analytics, "app_installed", {
  version: "1.0.0",
});

// Catch errors
window.addEventListener("error", event => {
  logEvent(analytics, "app_error", {
    message: event.message,
    stack: event.error?.stack,
  });
});
```

### 7.2 User Analytics

**Track user behavior:**

```typescript
logEvent(analytics, "account_created", {
  accountId: account.id,
  timestamp: new Date().toISOString(),
});

logEvent(analytics, "proxy_configured", {
  proxyType: proxy.type,
  timestamp: new Date().toISOString(),
});
```

---

## 8. Security Considerations

### 8.1 Code Obfuscation

**Obfuscate JavaScript code:**

```bash
# Use ProGuard for Android code
# Configure in android/app/build.gradle

buildTypes {
  release {
    minifyEnabled true
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
  }
}
```

### 8.2 Certificate Pinning

**Implement certificate pinning:**

```typescript
// Pin SSL certificates for critical domains
const certPin = {
  "incog-browser.com": ["sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="],
};
```

### 8.3 Secure Storage

**Store sensitive data securely:**

```typescript
// Use Capacitor Preferences for secure storage
import { Preferences } from "@capacitor/preferences";

await Preferences.set({
  key: "auth_token",
  value: token,
});

const { value } = await Preferences.get({ key: "auth_token" });
```

---

## References

[1] PWA Documentation: https://web.dev/progressive-web-apps/
[2] Trusted Web Activity: https://developer.chrome.com/docs/android/trusted-web-activity/
[3] Bubblewrap CLI: https://github.com/GoogleChromeLabs/bubblewrap
[4] Capacitor: https://capacitorjs.com/
[5] Google Play Console: https://play.google.com/console
[6] Android Development: https://developer.android.com/

---

**Next Document:** [GitHub Actions Workflows](../workflows/README.md)
