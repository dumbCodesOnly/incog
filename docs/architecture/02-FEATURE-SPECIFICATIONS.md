# Feature Specifications

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Pre-Development Blueprint

---

## Executive Summary

This document provides detailed specifications for all core features of the Incog browser application. Each feature includes functional requirements, technical specifications, acceptance criteria, and integration points with other system components.

---

## 1. Multi-Account Management

### 1.1 Overview

The multi-account management system enables users to create, manage, and switch between multiple distinct browsing identities, each with complete session isolation.

### 1.2 Functional Requirements

**Account Creation:**

- Users MUST be able to create unlimited accounts
- Each account MUST have a unique UUID identifier
- Each account MUST have a user-defined name and optional description
- Account creation MUST be atomic (all-or-nothing)
- Account metadata MUST be encrypted before storage

**Account Listing:**

- Users MUST be able to view all their accounts
- Account list MUST display account name, description, and creation date
- Account list MUST support sorting and filtering
- Account list MUST show account status (active, protected, etc.)

**Account Modification:**

- Users MUST be able to update account name and description
- Users MUST be able to enable/disable biometric protection
- Users MUST be able to assign proxy configurations to accounts
- Modifications MUST not affect current session if account is active

**Account Deletion:**

- Users MUST be able to delete accounts
- Deletion MUST be preceded by confirmation dialog
- Deletion MUST remove all associated data (tabs, cookies, cache)
- Deletion MUST be logged for audit purposes
- Deletion MUST be irreversible

**Account Switching:**

- Users MUST be able to switch between accounts
- Switching MUST clear current account's session context
- Switching MUST load new account's isolated context
- Switching MUST preserve session state for both accounts
- Switching MUST be instantaneous (< 500ms)

### 1.3 Technical Specifications

**Data Model:**

```typescript
interface Account {
  id: string; // UUID
  userId: string; // Foreign key to users table
  name: string; // Encrypted
  description?: string; // Encrypted
  isProtected: boolean; // Biometric auth required
  proxyConfigId?: string; // Foreign key to proxy configs
  dataDirectory: string; // Unique suffix for isolation
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
}
```

**Storage Isolation:**

Each account MUST have a dedicated storage context:

- **Client-side:** Separate IndexedDB database per account
- **Server-side:** Separate encrypted fields in database
- **Cookies:** Isolated per account context
- **Cache:** Isolated per account context

**Context Switching:**

```typescript
interface AccountContext {
  accountId: string;
  userId: string;
  cookies: Map<string, string>;
  cache: Map<string, CacheEntry>;
  storage: Map<string, StorageEntry>;
  webViewState?: WebViewState;
}
```

### 1.4 API Contracts

**Create Account:**

```typescript
account.create({
  name: string;                  // Required, max 100 chars
  description?: string;          // Optional, max 500 chars
  proxyConfigId?: string;        // Optional
}) → { id: string; name: string; }
```

**List Accounts:**

```typescript
account.list({
  sortBy?: 'name' | 'createdAt' | 'lastAccessedAt';
  order?: 'asc' | 'desc';
  filter?: { protected?: boolean };
}) → Account[]
```

**Switch Account:**

```typescript
account.switch({
  accountId: string;
}) → { success: boolean; accountId: string; }
```

**Update Account:**

```typescript
account.update({
  accountId: string;
  name?: string;
  description?: string;
  isProtected?: boolean;
  proxyConfigId?: string;
}) → Account
```

**Delete Account:**

```typescript
account.delete({
  accountId: string;
  confirmDeletion: boolean;
}) → { success: boolean; }
```

### 1.5 Acceptance Criteria

- [ ] User can create account with name and description
- [ ] User can view list of all created accounts
- [ ] User can switch between accounts without data loss
- [ ] User can update account settings
- [ ] User can delete account with confirmation
- [ ] Account switching completes in < 500ms
- [ ] No data leakage between accounts
- [ ] Deleted account data is completely removed

---

## 2. Advanced WebView Isolation

### 2.1 Overview

WebView isolation ensures complete separation of browsing contexts, preventing cross-contamination of cookies, cache, and session state between accounts.

### 2.2 Functional Requirements

**Isolated Storage:**

- Each account MUST have isolated cookies
- Each account MUST have isolated cache
- Each account MUST have isolated local storage
- Each account MUST have isolated session storage
- Storage MUST be cleared when switching accounts

**Security Settings:**

- File access MUST be disabled
- Content access MUST be disabled
- Mixed content MUST be blocked
- Third-party cookies MUST be disabled by default
- JavaScript MUST be enabled (for anti-detection)

**State Persistence:**

- WebView state MUST be saved per account
- WebView state MUST be restored when switching to account
- State MUST include navigation history
- State MUST include form data (if enabled)
- State MUST be encrypted before storage

**Session Management:**

- Each account MUST maintain independent session cookies
- Session cookies MUST expire after configurable timeout
- Session cookies MUST be HTTP-only and Secure
- Session cookies MUST be SameSite=Strict

### 2.3 Technical Specifications

**WebView Configuration:**

```typescript
interface WebViewConfig {
  accountId: string;
  allowFileAccess: false;
  allowContentAccess: false;
  mixedContentMode: "NEVER_ALLOW";
  thirdPartyCookiesEnabled: false;
  domStorageEnabled: true;
  databaseEnabled: true;
  cacheMode: "LOAD_DEFAULT";
  userAgent: string; // Rotated
}
```

**Storage Isolation:**

```typescript
interface IsolatedStorage {
  accountId: string;
  cookies: EncryptedMap<string, Cookie>;
  cache: EncryptedMap<string, CacheEntry>;
  localStorage: EncryptedMap<string, string>;
  sessionStorage: EncryptedMap<string, string>;
  indexedDB: EncryptedDatabase;
}
```

**State Persistence:**

```typescript
interface WebViewState {
  accountId: string;
  url: string;
  title: string;
  navigationHistory: HistoryEntry[];
  formData?: FormData;
  scrollPosition: { x: number; y: number };
  zoomLevel: number;
  timestamp: Date;
  encrypted: boolean;
}
```

### 2.4 Implementation Details

**Context Creation:**

1. Create new account with unique identifier
2. Create isolated IndexedDB database for account
3. Initialize empty cookie store for account
4. Initialize empty cache for account
5. Create WebView with isolated context
6. Configure WebView security settings
7. Inject anti-detection scripts

**Context Switching:**

1. Save current WebView state to database
2. Clear current WebView context
3. Clear current cookies from memory
4. Clear current cache from memory
5. Load target account's WebView state
6. Restore target account's cookies
7. Restore target account's cache
8. Inject anti-detection scripts for new account

### 2.5 Acceptance Criteria

- [ ] Each account has isolated cookies
- [ ] Each account has isolated cache
- [ ] Each account has isolated local storage
- [ ] Switching accounts clears previous context
- [ ] WebView state is persisted per account
- [ ] WebView state is restored correctly
- [ ] Security settings are enforced
- [ ] No cross-account data leakage

---

## 3. Anti-Detection System

### 3.1 Overview

The anti-detection system implements multiple techniques to prevent browser fingerprinting and bot detection, enabling access to websites with anti-bot protections.

### 3.2 Functional Requirements

**User Agent Rotation:**

- User agent MUST be rotated per request
- User agents MUST be realistic and current
- User agents MUST include desktop and mobile variants
- User agent database MUST be updated regularly
- User agent selection MUST be randomized

**Canvas Fingerprinting Protection:**

- Canvas API MUST be spoofed
- `toDataURL()` MUST return generic data
- `getImageData()` MUST return modified data
- Canvas operations MUST appear normal to scripts
- Protection MUST be transparent to legitimate uses

**WebGL Fingerprinting Protection:**

- WebGL API MUST be spoofed
- `getParameter()` MUST return generic GPU info
- Vendor and renderer MUST be generic
- WebGL operations MUST appear normal to scripts
- Protection MUST be transparent to legitimate uses

**Navigator Spoofing:**

- `navigator.webdriver` MUST be false
- `navigator.plugins` MUST be populated
- `navigator.languages` MUST be realistic
- `navigator.hardwareConcurrency` MUST be realistic
- `navigator.deviceMemory` MUST be realistic

**Behavior Simulation:**

- Mouse movements MUST be simulated
- Scrolling MUST appear human-like
- Typing MUST have realistic delays
- Click patterns MUST be realistic
- Idle time MUST be simulated

**Rate Limiting:**

- Requests per host MUST be throttled
- Rate limit MUST be configurable per account
- Rate limit MUST be enforced transparently
- Rate limit violations MUST be logged
- Rate limit MUST support burst allowances

### 3.3 Technical Specifications

**User Agent Database:**

```typescript
interface UserAgent {
  id: string;
  userAgent: string;
  browser: string;
  version: string;
  platform: "desktop" | "mobile";
  os: string;
  osVersion: string;
  lastUpdated: Date;
  active: boolean;
}
```

**Anti-Detection Script:**

```typescript
interface AntiDetectionConfig {
  spoofCanvas: boolean;
  spoofWebGL: boolean;
  spoofNavigator: boolean;
  simulateBehavior: boolean;
  userAgent: string;
  languages: string[];
  hardwareConcurrency: number;
  deviceMemory: number;
  plugins: BrowserPlugin[];
}
```

**Rate Limiting:**

```typescript
interface RateLimitConfig {
  accountId: string;
  host: string;
  requestsPerMinute: number;
  burstSize: number;
  windowSize: number; // milliseconds
}
```

### 3.4 Implementation Details

**JavaScript Injection:**

```javascript
// Spoof canvas
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function () {
  if (this.width === 280 && this.height === 60) {
    // Likely fingerprinting canvas
    return "data:image/png;base64,iVBORw0KGgoAAAANS...";
  }
  return originalToDataURL.apply(this, arguments);
};

// Spoof WebGL
const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function (param) {
  if (param === 37445) {
    return "Intel Inc."; // Generic vendor
  }
  if (param === 37446) {
    return "Intel Iris OpenGL Engine"; // Generic renderer
  }
  return originalGetParameter.apply(this, arguments);
};

// Spoof navigator
Object.defineProperty(navigator, "webdriver", {
  get: () => false,
});
```

### 3.5 Acceptance Criteria

- [ ] User agent rotates per request
- [ ] Canvas fingerprinting is prevented
- [ ] WebGL fingerprinting is prevented
- [ ] Navigator properties are spoofed
- [ ] Behavior appears human-like
- [ ] Rate limiting is enforced
- [ ] Anti-detection is transparent to users
- [ ] No performance degradation

---

## 4. Proxy & V2Ray Integration

### 4.1 Overview

The proxy integration system enables flexible network configuration through support for HTTP, HTTPS, SOCKS5, and V2Ray protocols with per-account assignment.

### 4.2 Functional Requirements

**Proxy Protocol Support:**

- HTTP proxies MUST be supported
- HTTPS proxies MUST be supported
- SOCKS5 proxies MUST be supported
- V2Ray (VMess, VLESS, Trojan, Shadowsocks) MUST be supported
- Protocol selection MUST be user-configurable

**Per-Account Configuration:**

- Each account MUST support proxy assignment
- Proxy configuration MUST be encrypted
- Proxy credentials MUST be encrypted
- Proxy assignment MUST be changeable
- Proxy can be optional (direct connection)

**Proxy Testing:**

- Proxy connectivity MUST be testable
- Test MUST verify successful connection
- Test MUST measure latency
- Test MUST identify protocol issues
- Test results MUST be displayed to user

**Connection Management:**

- Connections MUST be pooled for efficiency
- Connections MUST have configurable timeouts
- Connections MUST support keep-alive
- Failed connections MUST be retried
- Connection errors MUST be logged

### 4.3 Technical Specifications

**Proxy Configuration Model:**

```typescript
interface ProxyConfig {
  id: string;
  userId: string;
  name: string;
  type:
    | "HTTP"
    | "HTTPS"
    | "SOCKS5"
    | "V2RAY_VMESS"
    | "V2RAY_VLESS"
    | "V2RAY_TROJAN"
    | "V2RAY_SHADOWSOCKS";
  host: string;
  port: number;
  username?: string; // Encrypted
  password?: string; // Encrypted
  v2rayConfig?: string; // JSON, Encrypted
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTestedAt?: Date;
  testResult?: {
    success: boolean;
    latency: number;
    error?: string;
  };
}
```

**V2Ray Configuration:**

```typescript
interface V2RayConfig {
  protocol: "vmess" | "vless" | "trojan" | "shadowsocks";
  server: string;
  port: number;
  uuid?: string;
  password?: string;
  cipher?: string;
  tls?: boolean;
  alpn?: string[];
  sni?: string;
  allowInsecure?: boolean;
}
```

**Connection Pool:**

```typescript
interface ConnectionPool {
  proxyConfigId: string;
  maxConnections: number;
  idleTimeout: number; // milliseconds
  connectionTimeout: number; // milliseconds
  keepAliveInterval: number; // milliseconds
  activeConnections: Connection[];
  idleConnections: Connection[];
}
```

### 4.4 Implementation Details

**Proxy Testing:**

```typescript
async function testProxyConnection(config: ProxyConfig): Promise<TestResult> {
  const startTime = Date.now();
  try {
    // Create test connection
    const connection = await createProxyConnection(config);

    // Test connectivity
    const response = await connection.fetch("https://httpbin.org/ip", {
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const latency = Date.now() - startTime;

    return {
      success: true,
      latency,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      latency: Date.now() - startTime,
      error: error.message,
    };
  }
}
```

**Connection Routing:**

```typescript
async function routeRequestThroughProxy(
  request: Request,
  proxyConfig: ProxyConfig
): Promise<Response> {
  // Get connection from pool
  const connection = await connectionPool.acquire(proxyConfig.id);

  try {
    // Route request through proxy
    const response = await connection.fetch(request);

    // Return response
    return response;
  } finally {
    // Release connection back to pool
    connectionPool.release(proxyConfig.id, connection);
  }
}
```

### 4.5 Acceptance Criteria

- [ ] HTTP proxies can be configured
- [ ] HTTPS proxies can be configured
- [ ] SOCKS5 proxies can be configured
- [ ] V2Ray proxies can be configured
- [ ] Proxy credentials are encrypted
- [ ] Proxy connectivity can be tested
- [ ] Proxy can be assigned to account
- [ ] Requests route through proxy correctly

---

## 5. Advanced Incognito Mode

### 5.1 Overview

Incognito mode provides memory-only browsing with no persistent storage, enabling temporary sessions that are completely cleared upon closure.

### 5.2 Functional Requirements

**Memory-Only Storage:**

- No data MUST be written to disk
- All data MUST be stored in memory only
- Memory MUST be cleared on session close
- Cookies MUST not be persisted
- Cache MUST not be persisted

**Isolation Groups:**

- Multiple incognito sessions MUST be independent
- Each session MUST have isolated storage
- Sessions MUST not interfere with each other
- Sessions MUST not affect regular accounts

**Auto-Cleanup:**

- Session data MUST be destroyed on close
- Memory MUST be freed immediately
- WebView MUST be destroyed
- Cookies MUST be cleared
- Cache MUST be cleared

**Visual Indication:**

- Incognito mode MUST be visually distinct
- UI MUST show incognito indicator
- Tabs MUST be marked as incognito
- User MUST be aware of incognito status

### 5.3 Technical Specifications

**Incognito Session Model:**

```typescript
interface IncognitoSession {
  id: string;
  userId: string;
  createdAt: Date;
  cookies: Map<string, Cookie>;
  cache: Map<string, CacheEntry>;
  storage: Map<string, string>;
  tabs: IncognitoTab[];
  isActive: boolean;
}

interface IncognitoTab {
  id: string;
  sessionId: string;
  url: string;
  title: string;
  isActive: boolean;
}
```

**Memory Management:**

```typescript
interface MemoryManager {
  allocateMemory(sessionId: string, size: number): MemoryBlock;
  deallocateMemory(sessionId: string): void;
  clearSessionMemory(sessionId: string): void;
  getMemoryUsage(sessionId: string): number;
}
```

### 5.4 Implementation Details

**Session Creation:**

1. Create new incognito session with unique ID
2. Allocate memory block for session
3. Create isolated storage context
4. Create WebView with memory-only configuration
5. Disable disk caching
6. Disable cookie persistence

**Session Cleanup:**

1. Close all tabs in session
2. Destroy WebView
3. Clear all cookies from memory
4. Clear all cache from memory
5. Clear all storage from memory
6. Deallocate memory block
7. Remove session from active list

### 5.5 Acceptance Criteria

- [ ] Incognito session can be created
- [ ] Incognito session is memory-only
- [ ] Multiple incognito sessions are independent
- [ ] Incognito data is cleared on close
- [ ] Incognito mode is visually distinct
- [ ] No data persists after close
- [ ] Memory is freed on cleanup

---

## 6. Tab Management

### 6.1 Overview

Tab management enables users to organize multiple browsing sessions within an account, with state persistence and restoration.

### 6.2 Functional Requirements

**Tab Creation:**

- Users MUST be able to create new tabs
- Tabs MUST have unique identifiers
- Tabs MUST have configurable initial URL
- Tabs MUST be added to active account
- Tab creation MUST be instant

**Tab Listing:**

- Users MUST be able to view all tabs
- Tab list MUST show tab title and URL
- Tab list MUST show tab status (loading, idle)
- Tab list MUST support sorting
- Tab list MUST show thumbnail preview

**Tab Switching:**

- Users MUST be able to switch between tabs
- Switching MUST be instant (< 100ms)
- Switching MUST preserve tab state
- Switching MUST update UI
- Switching MUST show tab content

**Tab Closing:**

- Users MUST be able to close tabs
- Closing MUST be reversible (undo)
- Closing MUST free resources
- Closing MUST update tab list
- Closing last tab MUST close account

**Tab State Persistence:**

- Tab state MUST be saved on close
- Tab state MUST be restored on open
- Tab state MUST include URL, title, scroll position
- Tab state MUST be encrypted
- Tab state MUST survive app restart

### 6.3 Technical Specifications

**Tab Model:**

```typescript
interface BrowserTab {
  id: string;
  accountId: string;
  title: string;
  url: string;
  isActive: boolean;
  isIncognito: boolean;
  createdAt: Date;
  lastAccessedAt: Date;
  favicon?: string;
  thumbnail?: string;
  state?: WebViewState;
}
```

**Tab Manager:**

```typescript
interface TabManager {
  createTab(accountId: string, url?: string): Promise<BrowserTab>;
  listTabs(accountId: string): Promise<BrowserTab[]>;
  switchTab(tabId: string): Promise<void>;
  closeTab(tabId: string): Promise<void>;
  updateTabState(tabId: string, state: WebViewState): Promise<void>;
  restoreTab(tabId: string): Promise<void>;
}
```

### 6.4 Acceptance Criteria

- [ ] User can create new tab
- [ ] User can view all tabs
- [ ] User can switch between tabs
- [ ] User can close tab
- [ ] Tab state is persisted
- [ ] Tab state is restored correctly
- [ ] Tab switching is instant
- [ ] Tab undo works

---

## 7. Security Features

### 7.1 Biometric Authentication

Users MUST be able to enable biometric authentication (fingerprint or face recognition) for account protection.

**Requirements:**

- Biometric auth MUST be optional per account
- Biometric auth MUST be required on account access
- Failed biometric auth MUST lock account temporarily
- Biometric data MUST not be stored
- Biometric verification MUST be delegated to OS

### 7.2 Data Encryption

All sensitive data MUST be encrypted before storage.

**Requirements:**

- Encryption MUST use AES-256-GCM
- Encryption keys MUST be stored securely
- Encryption keys MUST be rotated regularly
- Encryption MUST be transparent to application
- Encryption MUST not impact performance

### 7.3 Environment Integrity Checks

The application MUST verify environment integrity on startup.

**Requirements:**

- Root detection MUST be performed
- Emulator detection MUST be performed
- Tamper detection MUST be performed
- Hook detection MUST be performed
- Failed checks MUST prevent operation

---

## 8. Integration Points

### 8.1 OAuth Integration

The application MUST integrate with Manus OAuth for authentication.

**Integration Points:**

- Login flow redirects to OAuth portal
- OAuth callback handled at `/api/oauth/callback`
- User information stored in database
- Session cookie issued after authentication
- Logout clears session

### 8.2 S3 Integration

The application MUST integrate with AWS S3 for file storage.

**Integration Points:**

- File uploads to S3 via presigned URLs
- File metadata stored in database
- Presigned URLs generated for access
- File cleanup on account deletion
- Access control enforced

### 8.3 V2Ray Integration

The application MUST integrate with V2Ray core for advanced proxy support.

**Integration Points:**

- V2Ray configuration stored in database
- V2Ray core initialized with configuration
- Requests routed through V2Ray
- Connection monitoring and logging
- Error handling and fallback

---

## References

[1] OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
[2] MDN Web Security: https://developer.mozilla.org/en-US/docs/Web/Security
[3] V2Ray Project: https://www.v2ray.com/
[4] WebGL Specification: https://www.khronos.org/webgl/
[5] Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

---

**Next Document:** [Security Model](../security/01-SECURITY-MODEL.md)
