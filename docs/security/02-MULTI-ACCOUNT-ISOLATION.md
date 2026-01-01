# Multi-Account Isolation Architecture

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Pre-Development Blueprint

---

## Executive Summary

Multi-account isolation is the core architectural principle of the Incog browser, enabling complete session separation between different browsing identities. This document details the isolation mechanisms, storage strategies, and context switching protocols that prevent cross-contamination between accounts.

---

## 1. Isolation Principles

### 1.1 Complete Separation

Each account operates in a completely isolated execution environment with no shared state between accounts. This principle extends across all layers:

- **Network Layer:** Each account may use different proxy configurations
- **Storage Layer:** Each account has isolated cookies, cache, and local storage
- **Session Layer:** Each account maintains independent authentication state
- **Data Layer:** Account data is encrypted and segregated in the database
- **Memory Layer:** Account contexts are isolated in memory

### 1.2 No Cross-Contamination

Switching between accounts MUST guarantee that:

- Previous account's cookies are not accessible to new account
- Previous account's cache is not accessible to new account
- Previous account's local storage is not accessible to new account
- Previous account's session state is not accessible to new account
- Previous account's network configuration is not accessible to new account

### 1.3 Transparent Isolation

Isolation mechanisms MUST be transparent to the application:

- Application code does not need to explicitly manage isolation
- Isolation is enforced at the framework level
- Isolation failures MUST be detected and prevented

---

## 2. Storage Isolation Architecture

### 2.1 Client-Side Storage

**IndexedDB Per-Account Storage:**

```typescript
interface ClientStorageContext {
  accountId: string;
  databases: {
    cookies: IDBDatabase;
    cache: IDBDatabase;
    localStorage: IDBDatabase;
    sessionStorage: IDBDatabase;
  };
}

// Create isolated IndexedDB for account
async function createAccountDatabase(accountId: string): Promise<IDBDatabase> {
  const dbName = `incog-account-${accountId}`;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      db.createObjectStore("cookies", { keyPath: "name" });
      db.createObjectStore("cache", { keyPath: "url" });
      db.createObjectStore("localStorage", { keyPath: "key" });
      db.createObjectStore("sessionStorage", { keyPath: "key" });
    };
  });
}

// Store cookie in account-specific database
async function setCookie(accountId: string, cookie: Cookie): Promise<void> {
  const db = await getAccountDatabase(accountId);
  const transaction = db.transaction(["cookies"], "readwrite");
  const store = transaction.objectStore("cookies");

  return new Promise((resolve, reject) => {
    const request = store.put(cookie);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Retrieve cookies only for current account
async function getCookies(accountId: string): Promise<Cookie[]> {
  const db = await getAccountDatabase(accountId);
  const transaction = db.transaction(["cookies"], "readonly");
  const store = transaction.objectStore("cookies");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
```

**Storage Context Switching:**

```typescript
class StorageContextManager {
  private currentAccountId: string | null = null;
  private accountDatabases: Map<string, IDBDatabase> = new Map();

  async switchContext(accountId: string): Promise<void> {
    // Save current context
    if (this.currentAccountId) {
      await this.saveContext(this.currentAccountId);
    }

    // Clear memory
    this.clearMemory();

    // Load new context
    this.currentAccountId = accountId;
    await this.loadContext(accountId);
  }

  private async saveContext(accountId: string): Promise<void> {
    // Save current cookies to IndexedDB
    const cookies = document.cookie.split(";").map(c => c.trim());
    for (const cookie of cookies) {
      await setCookie(accountId, parseCookie(cookie));
    }

    // Save current storage to IndexedDB
    const localStorage = Object.entries(window.localStorage);
    for (const [key, value] of localStorage) {
      await setLocalStorage(accountId, key, value);
    }
  }

  private async loadContext(accountId: string): Promise<void> {
    // Load cookies from IndexedDB
    const cookies = await getCookies(accountId);
    for (const cookie of cookies) {
      document.cookie = serializeCookie(cookie);
    }

    // Load storage from IndexedDB
    const storage = await getLocalStorage(accountId);
    window.localStorage.clear();
    for (const [key, value] of Object.entries(storage)) {
      window.localStorage.setItem(key, value);
    }
  }

  private clearMemory(): void {
    // Clear cookies
    document.cookie.split(";").forEach(c => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });

    // Clear storage
    window.localStorage.clear();
    window.sessionStorage.clear();

    // Clear IndexedDB
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name?.startsWith("incog-account-")) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  }
}
```

### 2.2 Server-Side Storage

**Account Data Encryption:**

```typescript
interface EncryptedAccountData {
  accountId: string;
  userId: string;
  encryptedName: string;
  encryptedDescription: string;
  encryptedMetadata: string;
  proxyConfigId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Store account with encrypted fields
async function createAccount(
  userId: string,
  name: string,
  description?: string
): Promise<Account> {
  const accountId = generateUUID();
  const accountKey = await deriveAccountKey(userId, accountId);

  const encryptedName = await encryptData(name, accountKey);
  const encryptedDescription = description
    ? await encryptData(description, accountKey)
    : null;

  return db.insert(accounts).values({
    id: accountId,
    userId,
    name: encryptedName,
    description: encryptedDescription,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// Retrieve account with decrypted fields
async function getAccount(userId: string, accountId: string): Promise<Account> {
  const account = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account.length) {
    throw new Error("Account not found");
  }

  const accountKey = await deriveAccountKey(userId, accountId);

  const decrypted = {
    ...account[0],
    name: await decryptData(account[0].name, accountKey),
    description: account[0].description
      ? await decryptData(account[0].description, accountKey)
      : null,
  };

  return decrypted;
}
```

**Per-Account Data Segregation:**

```sql
-- Query data only for specific account
SELECT * FROM browser_tabs
WHERE account_id = ? AND user_id = ?;

-- Query proxy config only for specific account
SELECT * FROM proxy_configs
WHERE id = (
  SELECT proxy_config_id FROM accounts
  WHERE id = ? AND user_id = ?
);

-- Query audit logs for specific account
SELECT * FROM audit_logs
WHERE account_id = ? AND user_id = ?
ORDER BY created_at DESC;
```

---

## 3. Session Isolation

### 3.1 Session Context

**Session Model:**

```typescript
interface SessionContext {
  sessionId: string;
  userId: string;
  accountId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress: string;
  userAgent: string;
  cookies: Map<string, Cookie>;
  cache: Map<string, CacheEntry>;
  storage: Map<string, StorageEntry>;
  webViewState?: WebViewState;
}

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: Date;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
}
```

**Session Creation:**

```typescript
async function createSession(
  userId: string,
  accountId: string,
  request: Request
): Promise<SessionContext> {
  const sessionId = generateUUID();
  const now = new Date();

  const session: SessionContext = {
    sessionId,
    userId,
    accountId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
    lastActivityAt: now,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") || "",
    cookies: new Map(),
    cache: new Map(),
    storage: new Map(),
  };

  // Store session in database
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    accountId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    lastActivityAt: session.lastActivityAt,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
  });

  return session;
}
```

**Session Validation:**

```typescript
async function validateSession(
  sessionId: string
): Promise<SessionContext | null> {
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session.length) {
    return null;
  }

  const sessionData = session[0];

  // Check expiration
  if (sessionData.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  // Update last activity
  await db
    .update(sessions)
    .set({ lastActivityAt: new Date() })
    .where(eq(sessions.id, sessionId));

  return {
    sessionId: sessionData.id,
    userId: sessionData.userId,
    accountId: sessionData.accountId,
    createdAt: sessionData.createdAt,
    expiresAt: sessionData.expiresAt,
    lastActivityAt: new Date(),
    ipAddress: sessionData.ipAddress,
    userAgent: sessionData.userAgent,
    cookies: new Map(),
    cache: new Map(),
    storage: new Map(),
  };
}
```

### 3.2 Session Cleanup

**Cleanup Procedures:**

```typescript
async function cleanupSession(sessionId: string): Promise<void> {
  // Get session data
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session.length) return;

  const { accountId, userId } = session[0];

  // Clear cookies
  const cookies = await db
    .select()
    .from(sessionCookies)
    .where(eq(sessionCookies.sessionId, sessionId));

  for (const cookie of cookies) {
    await db.delete(sessionCookies).where(eq(sessionCookies.id, cookie.id));
  }

  // Clear cache
  const cacheEntries = await db
    .select()
    .from(sessionCache)
    .where(eq(sessionCache.sessionId, sessionId));

  for (const entry of cacheEntries) {
    await db.delete(sessionCache).where(eq(sessionCache.id, entry.id));
  }

  // Clear storage
  const storageEntries = await db
    .select()
    .from(sessionStorage)
    .where(eq(sessionStorage.sessionId, sessionId));

  for (const entry of storageEntries) {
    await db.delete(sessionStorage).where(eq(sessionStorage.id, entry.id));
  }

  // Delete session
  await db.delete(sessions).where(eq(sessions.id, sessionId));

  // Log cleanup
  await logAuditEvent({
    userId,
    action: "session.cleanup",
    resource: "session",
    resourceId: sessionId,
    accountId,
    status: "success",
  });
}
```

---

## 4. Context Switching Protocol

### 4.1 Switching Flow

**Account Switch Sequence:**

```
1. User selects target account
   ↓
2. Frontend calls account.switch(targetAccountId)
   ↓
3. Backend validates user has access to target account
   ↓
4. Backend saves current session context
   ↓
5. Backend clears current session data
   ↓
6. Backend loads target account context
   ↓
7. Backend creates new session for target account
   ↓
8. Backend returns new session cookie
   ↓
9. Frontend clears local state
   ↓
10. Frontend reloads UI with new account data
```

**Implementation:**

```typescript
export const account = router({
  switch: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { accountId } = input;

      // Validate user has access to account
      const account = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id)))
        .limit(1);

      if (!account.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      // Save current session context
      const currentSession = await validateSession(ctx.sessionId);
      if (currentSession) {
        await saveSessionContext(currentSession);
      }

      // Clear current session
      if (currentSession) {
        await cleanupSession(currentSession.sessionId);
      }

      // Create new session for target account
      const newSession = await createSession(user.id, accountId, ctx.req);

      // Load target account context
      const targetContext = await loadAccountContext(accountId);

      // Issue new session cookie
      const sessionCookie = createSessionCookie(newSession.sessionId);
      ctx.res.setHeader("Set-Cookie", sessionCookie);

      // Log account switch
      await logAuditEvent({
        userId: user.id,
        action: "account.switch",
        resource: "account",
        resourceId: accountId,
        status: "success",
      });

      return {
        success: true,
        accountId,
        sessionId: newSession.sessionId,
      };
    }),
});
```

### 4.2 Context Loading

**Load Account Context:**

```typescript
async function loadAccountContext(accountId: string): Promise<AccountContext> {
  // Get account data
  const account = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!account.length) {
    throw new Error("Account not found");
  }

  // Get proxy configuration
  let proxyConfig = null;
  if (account[0].proxyConfigId) {
    const proxy = await db
      .select()
      .from(proxyConfigs)
      .where(eq(proxyConfigs.id, account[0].proxyConfigId))
      .limit(1);

    if (proxy.length) {
      proxyConfig = proxy[0];
    }
  }

  // Get browser tabs
  const tabs = await db
    .select()
    .from(browserTabs)
    .where(eq(browserTabs.accountId, accountId));

  // Get active tab
  const activeTab = tabs.find(t => t.isActive);

  return {
    accountId,
    account: account[0],
    proxyConfig,
    tabs,
    activeTab,
  };
}
```

### 4.3 Context Saving

**Save Session Context:**

```typescript
async function saveSessionContext(session: SessionContext): Promise<void> {
  // Save cookies
  for (const [name, cookie] of session.cookies) {
    await db.insert(sessionCookies).values({
      id: generateUUID(),
      sessionId: session.sessionId,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    });
  }

  // Save cache entries
  for (const [url, entry] of session.cache) {
    await db.insert(sessionCache).values({
      id: generateUUID(),
      sessionId: session.sessionId,
      url,
      content: entry.content,
      contentType: entry.contentType,
      expiresAt: entry.expiresAt,
    });
  }

  // Save storage entries
  for (const [key, entry] of session.storage) {
    await db.insert(sessionStorage).values({
      id: generateUUID(),
      sessionId: session.sessionId,
      key,
      value: entry.value,
    });
  }
}
```

---

## 5. Data Access Control

### 5.1 Query Filtering

**Enforce Account Isolation in Queries:**

```typescript
// Get tabs for current account only
async function getAccountTabs(userId: string, accountId: string) {
  return db
    .select()
    .from(browserTabs)
    .where(
      and(
        eq(browserTabs.accountId, accountId),
        // Verify user owns account
        inSubquery(
          browserTabs.accountId,
          db
            .select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.userId, userId))
        )
      )
    );
}

// Get proxy config for current account only
async function getAccountProxyConfig(userId: string, accountId: string) {
  const account = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account.length) {
    throw new Error("Account not found");
  }

  if (!account[0].proxyConfigId) {
    return null;
  }

  return db
    .select()
    .from(proxyConfigs)
    .where(
      and(
        eq(proxyConfigs.id, account[0].proxyConfigId),
        eq(proxyConfigs.userId, userId)
      )
    )
    .limit(1);
}
```

### 5.2 Mutation Filtering

**Enforce Account Isolation in Mutations:**

```typescript
// Update tab only if user owns account
async function updateTab(
  userId: string,
  accountId: string,
  tabId: string,
  updates: Partial<BrowserTab>
) {
  // Verify user owns account
  const account = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account.length) {
    throw new Error("Account not found");
  }

  // Update tab
  return db
    .update(browserTabs)
    .set(updates)
    .where(
      and(eq(browserTabs.id, tabId), eq(browserTabs.accountId, accountId))
    );
}

// Delete account only if user owns it
async function deleteAccount(userId: string, accountId: string) {
  // Verify user owns account
  const account = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account.length) {
    throw new Error("Account not found");
  }

  // Delete all tabs
  await db.delete(browserTabs).where(eq(browserTabs.accountId, accountId));

  // Delete account
  await db.delete(accounts).where(eq(accounts.id, accountId));
}
```

---

## 6. Isolation Verification

### 6.1 Testing Isolation

**Test Cross-Account Data Leakage:**

```typescript
describe("Multi-Account Isolation", () => {
  it("should not leak cookies between accounts", async () => {
    // Create two accounts
    const account1 = await createAccount(userId, "Account 1");
    const account2 = await createAccount(userId, "Account 2");

    // Switch to account 1
    await switchAccount(account1.id);

    // Set cookie in account 1
    document.cookie = "test=value1; path=/";

    // Switch to account 2
    await switchAccount(account2.id);

    // Verify cookie is not present in account 2
    const cookies = document.cookie.split(";").map(c => c.trim());
    expect(cookies).not.toContain("test=value1");

    // Switch back to account 1
    await switchAccount(account1.id);

    // Verify cookie is restored in account 1
    const cookies1 = document.cookie.split(";").map(c => c.trim());
    expect(cookies1).toContain("test=value1");
  });

  it("should not leak storage between accounts", async () => {
    // Create two accounts
    const account1 = await createAccount(userId, "Account 1");
    const account2 = await createAccount(userId, "Account 2");

    // Switch to account 1
    await switchAccount(account1.id);

    // Set storage in account 1
    window.localStorage.setItem("key", "value1");

    // Switch to account 2
    await switchAccount(account2.id);

    // Verify storage is not present in account 2
    expect(window.localStorage.getItem("key")).toBeNull();

    // Switch back to account 1
    await switchAccount(account1.id);

    // Verify storage is restored in account 1
    expect(window.localStorage.getItem("key")).toBe("value1");
  });
});
```

### 6.2 Monitoring Isolation

**Monitor for Isolation Violations:**

```typescript
interface IsolationMonitor {
  checkCookieLeakage(): Promise<boolean>;
  checkStorageLeakage(): Promise<boolean>;
  checkSessionLeakage(): Promise<boolean>;
  checkProxyLeakage(): Promise<boolean>;
}

async function monitorIsolation(): Promise<void> {
  const monitor = new IsolationMonitor();

  // Check for violations
  const cookieLeakage = await monitor.checkCookieLeakage();
  const storageLeakage = await monitor.checkStorageLeakage();
  const sessionLeakage = await monitor.checkSessionLeakage();
  const proxyLeakage = await monitor.checkProxyLeakage();

  // Log violations
  if (cookieLeakage || storageLeakage || sessionLeakage || proxyLeakage) {
    await logSecurityEvent({
      type: "ISOLATION_VIOLATION",
      cookieLeakage,
      storageLeakage,
      sessionLeakage,
      proxyLeakage,
      timestamp: new Date(),
    });
  }
}
```

---

## 7. Performance Considerations

### 7.1 Context Switching Performance

**Target Performance:**

- Account switch MUST complete in < 500ms
- Context loading MUST complete in < 200ms
- Context saving MUST complete in < 100ms

**Optimization Strategies:**

- Use lazy loading for account data
- Cache frequently accessed account data
- Use database indexes for account queries
- Implement connection pooling for database

### 7.2 Storage Performance

**Optimization Strategies:**

- Use IndexedDB for client-side storage (faster than localStorage)
- Implement storage quotas per account
- Clean up expired cache entries regularly
- Use compression for large storage entries

---

## References

[1] IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
[2] Web Storage API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
[3] HTTP Cookies: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
[4] Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

---

**Next Document:** [Proxy Integration Architecture](../architecture/03-PROXY-INTEGRATION.md)
