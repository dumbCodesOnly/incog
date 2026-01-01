# Security Model & Architecture

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Pre-Development Blueprint

---

## Executive Summary

The security model for the Incog browser application is built on multiple layers of protection, addressing threats at the network, application, data, and infrastructure levels. This document outlines the comprehensive security architecture, threat model, and mitigation strategies.

---

## 1. Security Principles

### 1.1 Core Principles

**Defense in Depth:** Multiple layers of security controls ensure that compromise of one layer does not lead to complete system failure.

**Least Privilege:** All components operate with the minimum permissions required for their function.

**Secure by Default:** Security features are enabled by default; users must explicitly opt-in to less secure configurations.

**Zero Trust:** All requests and users are treated as untrusted until verified.

**Encryption Everywhere:** All sensitive data is encrypted in transit and at rest.

**Transparency:** Security mechanisms are transparent to users; no security trade-offs for usability.

### 1.2 Threat Model

**Threat Actors:**

- **Passive Attackers:** Eavesdropping on network traffic
- **Active Attackers:** Man-in-the-middle attacks, DNS spoofing
- **Malicious Websites:** XSS, CSRF, clickjacking attacks
- **Compromised Infrastructure:** Insider threats, supply chain attacks
- **Bot Detection Services:** Fingerprinting and behavior analysis

**Attack Vectors:**

- Network interception (MITM, DNS spoofing)
- Browser fingerprinting (Canvas, WebGL, Navigator)
- Cookie theft and session hijacking
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Malware and rootkits
- Social engineering

---

## 2. Network Security

### 2.1 Transport Layer Security

**TLS Configuration:**

```typescript
interface TLSConfig {
  version: "TLS 1.3";
  cipherSuites: [
    "TLS_AES_256_GCM_SHA384",
    "TLS_CHACHA20_POLY1305_SHA256",
    "TLS_AES_128_GCM_SHA256",
  ];
  certificatePinning: boolean;
  hstsEnabled: boolean;
  hstsMaxAge: 31536000; // 1 year
}
```

**Requirements:**

- All connections MUST use TLS 1.3 or higher
- Only strong cipher suites MUST be enabled
- Certificate pinning MUST be implemented for critical domains
- HSTS MUST be enabled with long max-age
- TLS session resumption MUST be supported
- Perfect forward secrecy MUST be enabled

### 2.2 HTTP Security Headers

**Required Headers:**

| Header                    | Value                                                 | Purpose               |
| ------------------------- | ----------------------------------------------------- | --------------------- |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload          | Force HTTPS           |
| Content-Security-Policy   | default-src 'self'; script-src 'self' 'unsafe-inline' | Prevent XSS           |
| X-Content-Type-Options    | nosniff                                               | Prevent MIME sniffing |
| X-Frame-Options           | DENY                                                  | Prevent clickjacking  |
| X-XSS-Protection          | 1; mode=block                                         | Legacy XSS protection |
| Referrer-Policy           | strict-origin-when-cross-origin                       | Control referrer info |
| Permissions-Policy        | geolocation=(), microphone=(), camera=()              | Restrict APIs         |

### 2.3 CORS Configuration

**CORS Policy:**

```typescript
interface CORSConfig {
  allowedOrigins: string[]; // Whitelist only known origins
  allowedMethods: ["GET", "POST", "OPTIONS"];
  allowedHeaders: ["Content-Type", "Authorization"];
  exposedHeaders: ["X-Total-Count"];
  credentials: true; // Allow cookies
  maxAge: 86400; // 24 hours
}
```

**Requirements:**

- CORS MUST be configured restrictively
- Only necessary origins MUST be whitelisted
- Credentials MUST be allowed for same-origin requests
- Preflight requests MUST be cached appropriately

---

## 3. Authentication & Authorization

### 3.1 OAuth 2.0 Integration

**OAuth Flow:**

```
1. User clicks "Login"
   ↓
2. Frontend redirects to Manus OAuth portal
   ↓
3. User authenticates with credentials
   ↓
4. OAuth portal redirects to /api/oauth/callback with authorization code
   ↓
5. Backend exchanges code for access token
   ↓
6. Backend fetches user information
   ↓
7. Backend creates/updates user record
   ↓
8. Backend issues session cookie with JWT
   ↓
9. Frontend stores session cookie (HTTP-only)
   ↓
10. User is authenticated
```

**Security Requirements:**

- Authorization code MUST be single-use
- Authorization code MUST expire after 10 minutes
- State parameter MUST be validated to prevent CSRF
- PKCE MUST be used for public clients
- Redirect URIs MUST be registered and validated
- Access tokens MUST be short-lived (1 hour)
- Refresh tokens MUST be long-lived (30 days)

### 3.2 Session Management

**Session Cookie Configuration:**

```typescript
interface SessionCookie {
  name: "__session";
  value: string; // JWT token
  httpOnly: true; // Prevent JavaScript access
  secure: true; // HTTPS only
  sameSite: "Strict"; // CSRF protection
  maxAge: 86400000; // 24 hours
  path: "/";
  domain: "example.com";
}
```

**JWT Token Structure:**

```typescript
interface JWTPayload {
  sub: string; // User ID
  iat: number; // Issued at
  exp: number; // Expiration (1 hour)
  iss: "incog-browser";
  aud: "incog-browser";
  role: "user" | "admin";
  sessionId: string;
}
```

**Session Lifecycle:**

```
Login → Issue JWT → Store in HTTP-only cookie → Validate on each request → Refresh if needed → Logout → Clear cookie
```

**Requirements:**

- Sessions MUST expire after 24 hours of inactivity
- Sessions MUST be invalidated on logout
- Sessions MUST be invalidated on password change
- Sessions MUST be invalidated on suspicious activity
- Session tokens MUST be cryptographically signed
- Session tokens MUST not be stored in localStorage

### 3.3 Biometric Authentication

**Biometric Flow:**

```
Account Access → Check if biometric required → Prompt for biometric → Verify with OS → Grant access
```

**Implementation:**

- Biometric verification MUST be delegated to OS
- Biometric data MUST NOT be stored by application
- Biometric failure MUST lock account temporarily
- Biometric retry MUST be limited (3 attempts)
- Biometric lockout MUST expire after 15 minutes

### 3.4 Authorization Model

**Role-Based Access Control (RBAC):**

```typescript
enum Role {
  USER = "user",
  ADMIN = "admin",
}

interface Permission {
  resource: string;
  action: "create" | "read" | "update" | "delete";
  role: Role;
}

const permissions: Permission[] = [
  { resource: "account", action: "create", role: Role.USER },
  { resource: "account", action: "read", role: Role.USER },
  { resource: "account", action: "update", role: Role.USER },
  { resource: "account", action: "delete", role: Role.USER },
  { resource: "user", action: "read", role: Role.ADMIN },
  { resource: "user", action: "update", role: Role.ADMIN },
  { resource: "user", action: "delete", role: Role.ADMIN },
];
```

**Access Control Enforcement:**

```typescript
function checkPermission(
  user: User,
  resource: string,
  action: string
): boolean {
  const permission = permissions.find(
    p => p.resource === resource && p.action === action && p.role === user.role
  );
  return !!permission;
}

// Usage in tRPC procedure
export const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
```

---

## 4. Data Security

### 4.1 Encryption at Rest

**AES-256-GCM Encryption:**

```typescript
interface EncryptionConfig {
  algorithm: "AES-256-GCM";
  keyLength: 256; // bits
  ivLength: 96; // bits (12 bytes)
  tagLength: 128; // bits (16 bytes)
}

async function encryptData(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  // Combine IV + ciphertext + tag
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decryptData(
  ciphertext: string,
  key: CryptoKey
): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}
```

**Encryption Scope:**

| Data              | Encryption      | Key Storage   |
| ----------------- | --------------- | ------------- |
| User passwords    | Hashed (bcrypt) | Database      |
| Proxy credentials | AES-256-GCM     | Keystore      |
| Account metadata  | AES-256-GCM     | Keystore      |
| Session tokens    | Signed (JWT)    | Cookie        |
| API keys          | AES-256-GCM     | Keystore      |
| User files        | AES-256-GCM     | S3 + Keystore |

### 4.2 Key Management

**Key Hierarchy:**

```
Master Key (Hardware-backed Keystore)
    ↓
Account Key (Derived from Master Key)
    ├─ Proxy Credentials Key
    ├─ Account Metadata Key
    └─ Session Data Key
```

**Key Rotation:**

```typescript
interface KeyRotationPolicy {
  masterKeyRotationInterval: 365 * 24 * 60 * 60 * 1000;  // 1 year
  accountKeyRotationInterval: 90 * 24 * 60 * 60 * 1000;  // 90 days
  sessionKeyRotationInterval: 24 * 60 * 60 * 1000;  // 24 hours
  rotationStrategy: 'dual-write';  // Write with new key, read with old key
}
```

**Key Storage:**

- Master keys MUST be stored in hardware-backed keystore
- Keys MUST NOT be logged or exposed in error messages
- Keys MUST be rotated regularly
- Old keys MUST be retained for decryption of old data
- Key access MUST be logged for audit

### 4.3 Database Security

**Encrypted Fields:**

```sql
CREATE TABLE accounts (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  name VARBINARY(255) NOT NULL,  -- Encrypted
  description VARBINARY(1000),   -- Encrypted
  proxy_config_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (proxy_config_id) REFERENCES proxy_configs(id)
);

CREATE TABLE proxy_configs (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  name VARBINARY(255) NOT NULL,  -- Encrypted
  type VARCHAR(50) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INT NOT NULL,
  username VARBINARY(255),  -- Encrypted
  password VARBINARY(255),  -- Encrypted
  v2ray_config LONGTEXT,  -- Encrypted JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Query Encryption/Decryption:**

```typescript
async function createAccount(
  userId: number,
  name: string,
  description?: string
) {
  const encryptedName = await encryptData(name, accountKey);
  const encryptedDescription = description
    ? await encryptData(description, accountKey)
    : null;

  return db.insert(accounts).values({
    id: generateUUID(),
    userId,
    name: encryptedName,
    description: encryptedDescription,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function getAccount(accountId: string) {
  const account = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!account.length) return null;

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

---

## 5. Anti-Fingerprinting Techniques

### 5.1 Canvas Fingerprinting Protection

**Attack Vector:**
Websites can extract pixel data from canvas elements to create a unique fingerprint of the browser.

**Mitigation:**

```javascript
// Override canvas methods to return generic data
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function (type = "image/png", quality) {
  // Check if this looks like a fingerprinting canvas
  if (this.width === 280 && this.height === 60) {
    // Return a generic data URL
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAR...";
  }
  return originalToDataURL.call(this, type, quality);
};

// Override getImageData to return modified data
const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
CanvasRenderingContext2D.prototype.getImageData = function (sx, sy, sw, sh) {
  const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
  // Modify pixel data slightly to prevent fingerprinting
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] ^= Math.floor(Math.random() * 256); // Random noise
  }
  return imageData;
};
```

### 5.2 WebGL Fingerprinting Protection

**Attack Vector:**
Websites can query WebGL capabilities to create a unique fingerprint of the GPU.

**Mitigation:**

```javascript
// Override WebGL getParameter to return generic values
const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function (param) {
  if (param === WebGLRenderingContext.VENDOR) {
    return "Intel Inc."; // Generic vendor
  }
  if (param === WebGLRenderingContext.RENDERER) {
    return "Intel Iris OpenGL Engine"; // Generic renderer
  }
  if (param === WebGLRenderingContext.UNMASKED_VENDOR_WEBGL) {
    return "Intel Inc.";
  }
  if (param === WebGLRenderingContext.UNMASKED_RENDERER_WEBGL) {
    return "Intel Iris OpenGL Engine";
  }
  return originalGetParameter.call(this, param);
};
```

### 5.3 Navigator Spoofing

**Attack Vector:**
Websites can read navigator properties to identify the browser and detect automation tools.

**Mitigation:**

```javascript
// Spoof navigator.webdriver
Object.defineProperty(navigator, "webdriver", {
  get: () => false,
  configurable: true,
});

// Spoof navigator.plugins
Object.defineProperty(navigator, "plugins", {
  get: () => [
    { name: "Chrome PDF Plugin", description: "Portable Document Format" },
    { name: "Chrome PDF Viewer", description: "" },
    { name: "Native Client Executable", description: "" },
  ],
  configurable: true,
});

// Spoof navigator.languages
Object.defineProperty(navigator, "languages", {
  get: () => ["en-US", "en"],
  configurable: true,
});

// Spoof navigator.hardwareConcurrency
Object.defineProperty(navigator, "hardwareConcurrency", {
  get: () => 8,
  configurable: true,
});

// Spoof navigator.deviceMemory
Object.defineProperty(navigator, "deviceMemory", {
  get: () => 8,
  configurable: true,
});
```

### 5.4 User Agent Rotation

**User Agent Database:**

```typescript
const userAgents = [
  // Chrome Desktop
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

  // Firefox Desktop
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",

  // Safari
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",

  // Mobile Chrome
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
];

function getRandomUserAgent(): string {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}
```

---

## 6. Input Validation & Output Encoding

### 6.1 Input Validation

**Validation Rules:**

```typescript
import { z } from "zod";

// Account creation validation
const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  proxyConfigId: z.string().uuid().optional(),
});

// Proxy configuration validation
const createProxyConfigSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["HTTP", "HTTPS", "SOCKS5", "V2RAY_VMESS", "V2RAY_VLESS"]),
  host: z.string().ip().or(z.string().hostname()),
  port: z.number().int().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
});

// tRPC procedure with validation
export const account = router({
  create: protectedProcedure
    .input(createAccountSchema)
    .mutation(async ({ ctx, input }) => {
      // Input is automatically validated by zod
      return createAccount(ctx.user.id, input);
    }),
});
```

**Validation Requirements:**

- All user input MUST be validated
- Validation MUST use schema-based approach (Zod)
- Validation errors MUST not expose system details
- Validation MUST be performed server-side
- Validation MUST be performed before processing

### 6.2 Output Encoding

**HTML Encoding:**

```typescript
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
```

**JSON Encoding:**

```typescript
// JSON.stringify automatically escapes special characters
const json = JSON.stringify({ message: 'Hello "World"' });
// Output: {"message":"Hello \"World\""}
```

**URL Encoding:**

```typescript
function encodeUrl(url: string): string {
  return encodeURIComponent(url);
}
```

---

## 7. Security Testing

### 7.1 Static Analysis

**Tools:**

- ESLint with security plugins
- TypeScript strict mode
- SonarQube for code quality

**Configuration:**

```json
{
  "extends": ["eslint:recommended", "plugin:security/recommended"],
  "rules": {
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-unsafe-regex": "error"
  }
}
```

### 7.2 Dynamic Testing

**OWASP Top 10 Testing:**

- Injection attacks (SQL, NoSQL, Command)
- Broken authentication
- Sensitive data exposure
- XML external entities (XXE)
- Broken access control
- Security misconfiguration
- Cross-site scripting (XSS)
- Insecure deserialization
- Using components with known vulnerabilities
- Insufficient logging and monitoring

### 7.3 Penetration Testing

**Scope:**

- Authentication bypass
- Session hijacking
- Cross-site scripting
- Cross-site request forgery
- SQL injection
- Command injection
- Privilege escalation
- Data exfiltration

---

## 8. Compliance & Auditing

### 8.1 Audit Logging

**Logged Events:**

```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  status: "success" | "failure";
  errorMessage?: string;
}

// Events to log
const auditEvents = [
  "user.login",
  "user.logout",
  "user.passwordChange",
  "account.create",
  "account.update",
  "account.delete",
  "account.switch",
  "proxy.create",
  "proxy.update",
  "proxy.delete",
  "proxy.test",
  "file.upload",
  "file.download",
  "file.delete",
  "admin.userUpdate",
  "admin.userDelete",
];
```

### 8.2 Data Retention

**Retention Policy:**

| Data Type             | Retention Period | Reason                       |
| --------------------- | ---------------- | ---------------------------- |
| Audit logs            | 1 year           | Compliance and investigation |
| User sessions         | 24 hours         | Security and performance     |
| Failed login attempts | 90 days          | Security analysis            |
| API access logs       | 30 days          | Monitoring and debugging     |
| Deleted user data     | 30 days          | Recovery and compliance      |

### 8.3 Privacy Compliance

**GDPR Compliance:**

- User data collection MUST be transparent
- Users MUST have right to access their data
- Users MUST have right to delete their data
- Data processing MUST be documented
- Data breaches MUST be reported within 72 hours

**Data Minimization:**

- Only necessary data MUST be collected
- Data MUST be deleted when no longer needed
- Personal data MUST be anonymized when possible
- Data sharing MUST be minimized

---

## 9. Incident Response

### 9.1 Incident Classification

**Severity Levels:**

| Level    | Description                                   | Response Time |
| -------- | --------------------------------------------- | ------------- |
| Critical | Data breach, system compromise                | 1 hour        |
| High     | Authentication bypass, privilege escalation   | 4 hours       |
| Medium   | Vulnerability, security misconfiguration      | 24 hours      |
| Low      | Minor security issue, best practice violation | 1 week        |

### 9.2 Response Procedures

**Incident Response Steps:**

1. **Detection:** Identify and classify incident
2. **Containment:** Isolate affected systems
3. **Investigation:** Analyze scope and impact
4. **Remediation:** Fix the underlying issue
5. **Recovery:** Restore normal operations
6. **Post-Incident:** Review and improve

### 9.3 Communication

**Notification Requirements:**

- Users MUST be notified of data breaches
- Notification MUST include scope and impact
- Notification MUST include remediation steps
- Notification MUST include contact information
- Notification MUST be timely and transparent

---

## References

[1] OWASP Top 10: https://owasp.org/www-project-top-ten/
[2] NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
[3] CWE/SANS Top 25: https://cwe.mitre.org/top25/
[4] MDN Web Security: https://developer.mozilla.org/en-US/docs/Web/Security
[5] GDPR Compliance: https://gdpr-info.eu/
[6] Cryptography Best Practices: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html

---

**Next Document:** [Multi-Account Isolation](./02-MULTI-ACCOUNT-ISOLATION.md)
