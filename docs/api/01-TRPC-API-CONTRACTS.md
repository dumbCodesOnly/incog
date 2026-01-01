# tRPC API Contracts

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Pre-Development Blueprint

---

## Executive Summary

This document defines all tRPC procedures for the Incog browser application, including request/response schemas, authentication requirements, error handling, and usage examples. All procedures are type-safe and automatically validated using Zod schemas.

---

## 1. Authentication Procedures

### 1.1 Get Current User

**Endpoint:** `auth.me`  
**Type:** Query  
**Authentication:** Public (returns null if not authenticated)

**Request:**

```typescript
// No input required
```

**Response:**

```typescript
interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
} | null
```

**Example:**

```typescript
const { data: user } = trpc.auth.me.useQuery();

if (user) {
  console.log(`Logged in as ${user.name}`);
} else {
  console.log("Not authenticated");
}
```

### 1.2 Logout

**Endpoint:** `auth.logout`  
**Type:** Mutation  
**Authentication:** Protected

**Request:**

```typescript
// No input required
```

**Response:**

```typescript
interface LogoutResponse {
  success: boolean;
}
```

**Example:**

```typescript
const logout = trpc.auth.logout.useMutation({
  onSuccess: () => {
    // Redirect to login
    window.location.href = "/login";
  },
});

logout.mutate();
```

---

## 2. Account Management Procedures

### 2.1 List Accounts

**Endpoint:** `account.list`  
**Type:** Query  
**Authentication:** Protected

**Request:**

```typescript
interface ListAccountsInput {
  sortBy?: "name" | "createdAt" | "lastAccessedAt";
  order?: "asc" | "desc";
  filter?: {
    protected?: boolean;
  };
}
```

**Response:**

```typescript
interface Account {
  id: string;
  userId: number;
  name: string;
  description: string | null;
  isProtected: boolean;
  proxyConfigId: string | null;
  dataDirectory: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date | null;
}
[];
```

**Example:**

```typescript
const { data: accounts } = trpc.account.list.useQuery({
  sortBy: "lastAccessedAt",
  order: "desc",
});

accounts?.forEach(account => {
  console.log(`${account.name} (${account.id})`);
});
```

### 2.2 Create Account

**Endpoint:** `account.create`  
**Type:** Mutation  
**Authentication:** Protected

**Request:**

```typescript
interface CreateAccountInput {
  name: string; // 1-100 chars
  description?: string; // max 500 chars
  proxyConfigId?: string; // optional
}
```

**Response:**

```typescript
interface CreateAccountResponse {
  id: string;
  name: string;
  createdAt: Date;
}
```

**Example:**

```typescript
const createAccount = trpc.account.create.useMutation({
  onSuccess: data => {
    console.log(`Account created: ${data.id}`);
  },
});

createAccount.mutate({
  name: "Work Account",
  description: "For work-related browsing",
});
```

### 2.3 Update Account

**Endpoint:** `account.update`  
**Type:** Mutation  
**Authentication:** Protected

**Request:**

```typescript
interface UpdateAccountInput {
  accountId: string;
  name?: string;
  description?: string;
  isProtected?: boolean;
  proxyConfigId?: string;
}
```

**Response:**

```typescript
interface Account {
  id: string;
  userId: number;
  name: string;
  description: string | null;
  isProtected: boolean;
  proxyConfigId: string | null;
  dataDirectory: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date | null;
}
```

**Example:**

```typescript
const updateAccount = trpc.account.update.useMutation();

updateAccount.mutate({
  accountId: "account-123",
  isProtected: true,
});
```

### 2.4 Switch Account

**Endpoint:** `account.switch`  
**Type:** Mutation  
**Authentication:** Protected

**Request:**

```typescript
interface SwitchAccountInput {
  accountId: string;
}
```

**Response:**

```typescript
interface SwitchAccountResponse {
  success: boolean;
  accountId: string;
  sessionId: string;
}
```

**Error Codes:**

- `NOT_FOUND`: Account not found or user doesn't have access
- `FORBIDDEN`: Account is protected and biometric auth failed

**Example:**

```typescript
const switchAccount = trpc.account.switch.useMutation({
  onSuccess: data => {
    console.log(`Switched to account ${data.accountId}`);
    // Reload UI with new account data
  },
  onError: error => {
    if (error.data?.code === "FORBIDDEN") {
      console.log("Biometric authentication required");
    }
  },
});

switchAccount.mutate({ accountId: "account-123" });
```

### 2.5 Delete Account

**Endpoint:** `account.delete`  
**Type:** Mutation  
**Authentication:** Protected

**Request:**

```typescript
interface DeleteAccountInput {
  accountId: string;
  confirmDeletion: boolean;
}
```

**Response:**

```typescript
interface DeleteAccountResponse {
  success: boolean;
}
```

**Example:**

```typescript
const deleteAccount = trpc.account.delete.useMutation({
  onSuccess: () => {
    console.log("Account deleted");
  },
});

deleteAccount.mutate({
  accountId: "account-123",
  confirmDeletion: true,
});
```

---

## 3. Proxy Configuration Procedures

### 3.1 List Proxy Configs

**Endpoint:** `proxy.list`  
**Type:** Query  
**Authentication:** Protected

**Request:**

```typescript
interface ListProxyConfigsInput {
  sortBy?: "name" | "type" | "createdAt";
  order?: "asc" | "desc";
  filter?: {
    type?: ProxyType;
    isActive?: boolean;
  };
}
```

**Response:**

```typescript
interface ProxyConfig {
  id: string;
  userId: number;
  name: string;
  type: ProxyType;
  host: string;
  port: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTestedAt: Date | null;
  testResult?: {
    success: boolean;
    latency: number;
    error?: string;
  };
}
[];
```

**Example:**

```typescript
const { data: proxies } = trpc.proxy.list.useQuery({
  filter: { isActive: true },
});
```

### 3.2 Create Proxy Config

**Endpoint:** `proxy.create`  
**Type:** Mutation  
**Authentication:** Protected

**Request:**

```typescript
interface CreateProxyConfigInput {
  name: string; // 1-100 chars
  type: ProxyType;
  host: string; // IP or hostname
  port: number; // 1-65535
  username?: string;
  password?: string;
  v2rayConfig?: {
    protocol: "vmess" | "vless" | "trojan" | "shadowsocks";
    server: string;
    port: number;
    uuid?: string;
    password?: string;
    cipher?: string;
    tls?: boolean;
    sni?: string;
    alpn?: string[];
  };
}
```

**Response:**

```typescript
interface CreateProxyConfigResponse {
  id: string;
  name: string;
  type: ProxyType;
}
```

**Validation Errors:**

- Invalid IP/hostname
- Port out of range
- Missing required fields

**Example:**

```typescript
const createProxy = trpc.proxy.create.useMutation();

createProxy.mutate({
  name: "Work Proxy",
  type: "SOCKS5",
  host: "192.168.1.100",
  port: 1080,
  username: "user",
  password: "pass",
});
```

### 3.3 Update Proxy Config

**Endpoint:** `proxy.update`  
**Type:** Mutation  
**Authentication:** Protected

**Request:**

```typescript
interface UpdateProxyConfigInput {
  proxyConfigId: string;
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  isActive?: boolean;
}
```

**Response:**

```typescript
interface ProxyConfig {
  /* ... */
}
```

### 3.4 Test Proxy

**Endpoint:** `proxy.test`  
**Type:** Mutation  
**Authentication:** Protected

**Request:**

```typescript
interface TestProxyInput {
  proxyConfigId: string;
}
```

**Response:**

```typescript
interface TestProxyResponse {
  success: boolean;
  latency: number;
  error?: string;
}
```

**Example:**

```typescript
const testProxy = trpc.proxy.test.useMutation({
  onSuccess: result => {
    if (result.success) {
      console.log(`Proxy working! Latency: ${result.latency}ms`);
    } else {
      console.log(`Proxy failed: ${result.error}`);
    }
  },
});

testProxy.mutate({ proxyConfigId: "proxy-123" });
```

### 3.5 Delete Proxy Config

**Endpoint:** `proxy.delete`  
**Type:** Mutation  
**Authentication:** Protected

**Request:**

```typescript
interface DeleteProxyConfigInput {
  proxyConfigId: string;
}
```

**Response:**

```typescript
interface DeleteProxyConfigResponse {
  success: boolean;
}
```

---

## 4. Browser Tab Procedures

### 4.1 List Tabs

**Endpoint:** `tab.list`  
**Type:** Query  
**Authentication:** Protected

**Request:**

```typescript
interface ListTabsInput {
  accountId: string;
}
```

**Response:**

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
}
[];
```

### 4.2 Create Tab

**Endpoint:** `tab.create`  
**Type:** Mutation  
**Authentication:** Protected

**Request:**

```typescript
interface CreateTabInput {
  accountId: string;
  url?: string;
  isIncognito?: boolean;
}
```

**Response:**

```typescript
interface BrowserTab {
  /* ... */
}
```

### 4.3 Update Tab

**Endpoint:** `tab.update`  
**Type:** Mutation  
**Authentication:** Protected

**Request:**

```typescript
interface UpdateTabInput {
  tabId: string;
  title?: string;
  url?: string;
  isActive?: boolean;
  scrollPositionX?: number;
  scrollPositionY?: number;
  zoomLevel?: number;
}
```

**Response:**

```typescript
interface BrowserTab {
  /* ... */
}
```

### 4.4 Close Tab

**Endpoint:** `tab.close`  
**Type:** Mutation  
**Authentication:** Protected

**Request:**

```typescript
interface CloseTabInput {
  tabId: string;
}
```

**Response:**

```typescript
interface CloseTabResponse {
  success: boolean;
}
```

---

## 5. Error Handling

### 5.1 Error Response Format

All errors follow the tRPC error format:

```typescript
interface TRPCError {
  code: string;
  message: string;
  data?: {
    code: string;
    httpStatus: number;
    path: string;
    stack?: string;
  };
}
```

### 5.2 Error Codes

| Code                  | HTTP Status | Description         |
| --------------------- | ----------- | ------------------- |
| PARSE_ERROR           | 400         | Invalid input       |
| BAD_REQUEST           | 400         | Bad request         |
| NOT_FOUND             | 404         | Resource not found  |
| INTERNAL_SERVER_ERROR | 500         | Server error        |
| UNAUTHORIZED          | 401         | Not authenticated   |
| FORBIDDEN             | 403         | Not authorized      |
| CONFLICT              | 409         | Resource conflict   |
| PRECONDITION_FAILED   | 412         | Precondition failed |
| PAYLOAD_TOO_LARGE     | 413         | Payload too large   |
| UNPROCESSABLE_CONTENT | 422         | Validation error    |
| TOO_MANY_REQUESTS     | 429         | Rate limited        |

### 5.3 Error Handling Example

```typescript
const createAccount = trpc.account.create.useMutation({
  onError: error => {
    switch (error.data?.code) {
      case "UNAUTHORIZED":
        console.log("Please log in");
        break;
      case "FORBIDDEN":
        console.log("You do not have permission");
        break;
      case "UNPROCESSABLE_CONTENT":
        console.log("Invalid input:", error.message);
        break;
      default:
        console.log("Error:", error.message);
    }
  },
});
```

---

## 6. Rate Limiting

### 6.1 Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### 6.2 Rate Limit Policies

| Endpoint         | Limit | Window   |
| ---------------- | ----- | -------- |
| `auth.me`        | 1000  | 1 hour   |
| `account.list`   | 100   | 1 minute |
| `account.create` | 10    | 1 hour   |
| `account.switch` | 100   | 1 minute |
| `proxy.test`     | 20    | 1 hour   |
| `tab.create`     | 100   | 1 minute |

### 6.3 Rate Limit Handling

```typescript
const createAccount = trpc.account.create.useMutation({
  onError: error => {
    if (error.data?.code === "TOO_MANY_REQUESTS") {
      console.log("Rate limited. Please try again later.");
    }
  },
});
```

---

## 7. Pagination

### 7.1 Pagination Pattern

For list endpoints that support pagination:

```typescript
interface PaginationInput {
  page?: number; // 1-indexed
  pageSize?: number; // default 20, max 100
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
```

### 7.2 Pagination Example

```typescript
const { data: accountsPage } = trpc.account.list.useQuery({
  page: 1,
  pageSize: 20,
});

console.log(`Page ${accountsPage?.page} of ${accountsPage?.pageCount}`);
```

---

## 8. Caching & Invalidation

### 8.1 Query Caching

tRPC automatically caches query results:

```typescript
// First call hits server
const { data: accounts1 } = trpc.account.list.useQuery();

// Second call uses cache
const { data: accounts2 } = trpc.account.list.useQuery();

// Force refetch
const { refetch } = trpc.account.list.useQuery();
refetch();
```

### 8.2 Cache Invalidation

After mutations, invalidate related queries:

```typescript
const createAccount = trpc.account.create.useMutation({
  onSuccess: () => {
    // Invalidate account list
    utils.account.list.invalidate();
  },
});

const utils = trpc.useUtils();
```

---

## 9. Subscription Support (Future)

### 9.1 Real-Time Updates

Future support for WebSocket subscriptions:

```typescript
// Example (not yet implemented)
const subscription = trpc.account.onUpdate.subscribe(
  { accountId: "account-123" },
  {
    onData: account => {
      console.log("Account updated:", account);
    },
  }
);
```

---

## References

[1] tRPC Documentation: https://trpc.io/
[2] Zod Validation: https://zod.dev/
[3] REST API Best Practices: https://restfulapi.net/
[4] HTTP Status Codes: https://httpwg.org/specs/rfc7231.html#status.codes

---

**Next Document:** [Frontend Architecture Guide](../frontend/01-ARCHITECTURE-GUIDE.md)
