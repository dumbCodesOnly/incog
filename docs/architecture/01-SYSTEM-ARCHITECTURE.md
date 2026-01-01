# System Architecture Overview

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Pre-Development Blueprint

---

## Executive Summary

The Incog browser is an enterprise-grade, privacy-focused web application designed to enable secure multi-account management with complete session isolation. Built on modern web technologies with progressive web app (PWA) capabilities, the system supports eventual packaging as an Android application through Trusted Web Activity (TWA) or Capacitor frameworks.

The architecture prioritizes security, isolation, and anti-detection capabilities while maintaining a responsive, accessible user experience across desktop and mobile platforms.

---

## 1. Technology Stack

| Layer              | Component        | Technology           | Version | Rationale                                                              |
| ------------------ | ---------------- | -------------------- | ------- | ---------------------------------------------------------------------- |
| **Frontend**       | UI Framework     | React                | 19.x    | Modern component model, excellent ecosystem, strong TypeScript support |
| **Frontend**       | Styling          | Tailwind CSS         | 4.x     | Utility-first CSS, excellent mobile support, minimal bundle size       |
| **Frontend**       | UI Components    | shadcn/ui            | Latest  | Accessible, composable components built on Radix UI                    |
| **Frontend**       | State Management | TanStack Query       | 5.x     | Powerful server state management, built-in caching and synchronization |
| **Frontend**       | Routing          | Wouter               | 3.x     | Lightweight, zero-dependency routing for SPA                           |
| **Frontend**       | HTTP Client      | tRPC                 | 11.x    | End-to-end type-safe RPC framework                                     |
| **Backend**        | Runtime          | Node.js              | 22.x    | JavaScript runtime, excellent ecosystem, strong async support          |
| **Backend**        | Server Framework | Express              | 4.x     | Lightweight, well-established, excellent middleware ecosystem          |
| **Backend**        | RPC Framework    | tRPC                 | 11.x    | Type-safe RPC procedures with automatic validation                     |
| **Backend**        | Database ORM     | Drizzle              | 0.44.x  | Type-safe SQL builder, excellent TypeScript support                    |
| **Database**       | Engine           | MySQL/TiDB           | 8.0+    | Reliable, scalable, excellent transaction support                      |
| **Database**       | Encryption       | AES-256-GCM          | -       | Industry-standard encryption for sensitive data                        |
| **Authentication** | Method           | Manus OAuth          | -       | Platform-provided OAuth integration                                    |
| **Storage**        | File Storage     | AWS S3               | -       | Scalable, reliable object storage for user data                        |
| **Deployment**     | Container        | Docker               | Latest  | Containerization for consistent deployment                             |
| **Packaging**      | PWA              | Web Standards        | -       | Progressive Web App capabilities                                       |
| **Packaging**      | APK              | Trusted Web Activity | -       | Android app packaging from web app                                     |
| **CI/CD**          | Workflow         | GitHub Actions       | -       | Integrated CI/CD with GitHub repository                                |

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer (PWA)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  React App       │  │  Service Worker  │  │  Offline Cache   │ │
│  │  (UI Components) │  │  (PWA Support)   │  │  (IndexedDB)     │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│           │                     │                      │           │
│           └─────────────────────┼──────────────────────┘           │
│                                 │                                  │
│                         ┌───────▼────────┐                         │
│                         │  tRPC Client   │                         │
│                         │  (HTTP/WS)     │                         │
│                         └───────┬────────┘                         │
│                                 │                                  │
└─────────────────────────────────┼──────────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   API Gateway / Proxy      │
                    │   (TLS Termination)        │
                    └─────────────┬──────────────┘
                                  │
┌─────────────────────────────────┼──────────────────────────────────┐
│                      Backend Layer (Node.js)                       │
├─────────────────────────────────┼──────────────────────────────────┤
│                                 │                                  │
│                         ┌───────▼────────┐                         │
│                         │  Express App   │                         │
│                         │  (tRPC Router) │                         │
│                         └───────┬────────┘                         │
│                                 │                                  │
│  ┌──────────────────────────────┼──────────────────────────────┐  │
│  │                              │                              │  │
│  │  ┌────────────────────┐  ┌───▼──────────────┐  ┌─────────┐ │  │
│  │  │ Authentication     │  │  Account         │  │ Proxy   │ │  │
│  │  │ Service            │  │  Management      │  │ Manager │ │  │
│  │  │ (OAuth, JWT)       │  │  Service         │  │         │ │  │
│  │  └────────────────────┘  └───┬──────────────┘  └────┬────┘ │  │
│  │                              │                      │      │  │
│  │  ┌────────────────────┐  ┌───▼──────────────┐  ┌───▼────┐ │  │
│  │  │ Session Manager    │  │  Anti-Detection │  │ Storage│ │  │
│  │  │ (Isolation Logic)  │  │  Service        │  │ Manager│ │  │
│  │  └────────────────────┘  └───┬──────────────┘  └────┬───┘ │  │
│  │                              │                      │     │  │
│  │  ┌────────────────────┐  ┌───▼──────────────┐  ┌───▼───┐ │  │
│  │  │ Encryption Manager │  │  WebView        │  │ S3    │ │  │
│  │  │ (AES-256-GCM)      │  │  Controller     │  │ Client│ │  │
│  │  └────────────────────┘  └────────────────┘  └───────┘ │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Data Access Layer (Drizzle)               │  │
│  │  - Query builders                                       │  │
│  │  - Transaction management                              │  │
│  │  - Connection pooling                                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────┬───────────────────────────────┘
                                 │
┌────────────────────────────────┼───────────────────────────────┐
│                    Data Layer (MySQL/TiDB)                     │
├────────────────────────────────┼───────────────────────────────┤
│                                │                               │
│  ┌──────────────────────────────▼──────────────────────────┐  │
│  │                                                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐ │  │
│  │  │ Users           │  │ Accounts        │  │ Sessions│ │  │
│  │  │ (Encrypted)     │  │ (Encrypted)     │  │ (TTL)   │ │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────┘ │  │
│  │                                                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐ │  │
│  │  │ ProxyConfigs    │  │ BrowserTabs     │  │ Audit   │ │  │
│  │  │ (Encrypted)     │  │ (Encrypted)     │  │ Logs    │ │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────┘ │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    External Services                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ AWS S3           │  │ Proxy Services   │  │ V2Ray Core   │ │
│  │ (File Storage)   │  │ (HTTP/SOCKS5)    │  │ (Tunneling)  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ Manus OAuth      │  │ Analytics        │                   │
│  │ (Authentication) │  │ (Monitoring)     │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Components

### 3.1 Frontend Application

The frontend is a React-based single-page application (SPA) built with modern web standards and progressive web app (PWA) capabilities.

**Key Responsibilities:**

- Render user interface for account management, browsing, and settings
- Manage client-side state for UI interactions and temporary data
- Handle authentication flows and session management
- Communicate with backend through tRPC procedures
- Support offline functionality through service workers
- Provide responsive design for desktop and mobile platforms

**Technology Stack:**

- React 19 for component model and hooks
- Tailwind CSS 4 for styling and responsive design
- TanStack Query for server state management
- Wouter for client-side routing
- shadcn/ui for accessible UI components

### 3.2 Backend Application

The backend is a Node.js/Express application providing tRPC procedures for all client operations.

**Key Responsibilities:**

- Authenticate users through OAuth and session management
- Manage account creation, modification, and deletion
- Implement session isolation and context switching
- Handle proxy configuration and validation
- Manage WebView state and tab operations
- Enforce security policies and access control
- Log audit trails for compliance

**Technology Stack:**

- Express 4 for HTTP server
- tRPC 11 for type-safe RPC procedures
- Drizzle ORM for database access
- JWT for session management
- AES-256-GCM for sensitive data encryption

### 3.3 Database Layer

The database stores all persistent application data with encryption for sensitive fields.

**Key Responsibilities:**

- Store user accounts and authentication credentials
- Maintain proxy configurations and credentials
- Track browser tabs and session state
- Store audit logs and security events
- Manage encryption keys and metadata

**Technology Stack:**

- MySQL 8.0+ or TiDB for primary database
- Drizzle ORM for type-safe queries
- AES-256-GCM encryption for sensitive fields
- Connection pooling for performance

### 3.4 Authentication Service

Handles user authentication through OAuth and session management.

**Key Responsibilities:**

- Integrate with Manus OAuth for user authentication
- Issue and validate JWT tokens
- Manage session cookies with secure flags
- Implement logout and session cleanup
- Enforce biometric authentication for protected accounts

**Technology Stack:**

- Manus OAuth for identity provider
- JWT (jose library) for token management
- Secure HTTP-only cookies for session storage

### 3.5 Account Management Service

Manages account creation, modification, deletion, and isolation.

**Key Responsibilities:**

- Create new accounts with unique identifiers
- Manage account metadata and settings
- Implement account protection (biometric auth)
- Handle account switching and context cleanup
- Manage per-account data directories

**Technology Stack:**

- Drizzle ORM for data persistence
- UUID for unique account identifiers
- Encryption manager for sensitive data

### 3.6 Session Isolation Manager

Implements complete session isolation between accounts.

**Key Responsibilities:**

- Create isolated execution contexts per account
- Manage separate storage for each account
- Handle context switching with proper cleanup
- Prevent cross-account data leakage
- Manage WebView lifecycle per account

**Technology Stack:**

- IndexedDB for client-side per-account storage
- Session storage for temporary data
- Encrypted database fields for server-side isolation

### 3.7 Anti-Detection Service

Implements fingerprinting protection and behavior simulation.

**Key Responsibilities:**

- Rotate user agents across realistic browser profiles
- Inject JavaScript to spoof canvas and WebGL fingerprints
- Simulate human-like behavior (mouse movements, typing delays)
- Implement rate limiting per host
- Manage browser characteristics spoofing

**Technology Stack:**

- JavaScript injection for client-side protection
- User agent database with realistic profiles
- Rate limiting middleware

### 3.8 Proxy Manager

Manages proxy configuration and connection routing.

**Key Responsibilities:**

- Support HTTP, HTTPS, SOCKS5, and V2Ray protocols
- Manage per-account proxy configurations
- Validate proxy connectivity
- Handle proxy authentication
- Implement connection pooling and lifecycle management

**Technology Stack:**

- OkHttp-compatible proxy handling
- V2Ray core integration
- Connection pooling with timeout management

### 3.9 Storage Manager

Manages file storage and retrieval operations.

**Key Responsibilities:**

- Upload files to AWS S3
- Generate presigned URLs for secure access
- Manage file metadata and access control
- Implement cleanup for deleted accounts
- Support per-account storage isolation

**Technology Stack:**

- AWS S3 SDK for cloud storage
- Presigned URLs for secure access
- Metadata database for tracking

---

## 4. Data Flow Patterns

### 4.1 Authentication Flow

```
User → Login Page → OAuth Portal → Callback Handler → Session Cookie → Authenticated State
```

1. User clicks login button on the application
2. Frontend redirects to Manus OAuth portal
3. User authenticates with credentials
4. OAuth service redirects to `/api/oauth/callback` with authorization code
5. Backend exchanges code for user information
6. Backend creates or updates user record in database
7. Backend issues session cookie with JWT token
8. Frontend reads authenticated state and redirects to dashboard

### 4.2 Account Switching Flow

```
Current Account → Cleanup Phase → Context Switch → New Account Loaded
```

1. User selects different account from account switcher
2. Frontend calls `account.switch` tRPC procedure
3. Backend validates user has access to target account
4. Backend clears current session context (cookies, cache, storage)
5. Backend loads target account's isolated context
6. Frontend clears local state and reloads UI
7. New account's data is displayed

### 4.3 Proxy Configuration Flow

```
Proxy Config → Validation → Per-Account Assignment → Connection Routing
```

1. User creates or modifies proxy configuration
2. Frontend calls `proxy.create` or `proxy.update` tRPC procedure
3. Backend validates proxy connectivity
4. Backend encrypts credentials and stores in database
5. Backend assigns proxy to account
6. Subsequent requests route through configured proxy
7. Proxy connectivity is monitored and logged

### 4.4 File Upload Flow

```
File Selection → Upload to S3 → Metadata Storage → URL Generation → Access
```

1. User selects file through browser file input
2. Frontend validates file size and type
3. Frontend calls `storage.getUploadUrl` to get presigned S3 URL
4. Frontend uploads file directly to S3
5. Frontend calls `storage.saveMetadata` with file information
6. Backend stores file metadata in database
7. Backend generates presigned URL for secure access
8. Frontend displays file with secure URL

---

## 5. Security Architecture

The security architecture is built on multiple layers of protection:

### 5.1 Network Security

- **TLS Encryption:** All communication uses TLS 1.3 with strong cipher suites
- **HSTS:** HTTP Strict Transport Security enforced for all domains
- **CSP:** Content Security Policy prevents injection attacks
- **CORS:** Cross-Origin Resource Sharing configured restrictively

### 5.2 Data Security

- **Encryption at Rest:** Sensitive data encrypted with AES-256-GCM before storage
- **Encryption in Transit:** All data encrypted during transmission
- **Key Management:** Encryption keys stored securely, rotated regularly
- **Field-Level Encryption:** Proxy credentials and sensitive metadata encrypted

### 5.3 Authentication & Authorization

- **OAuth 2.0:** Delegated authentication through Manus OAuth
- **JWT Tokens:** Stateless authentication with signed tokens
- **Session Management:** Secure session cookies with HTTP-only and Secure flags
- **RBAC:** Role-based access control for admin operations
- **Biometric Auth:** Optional biometric authentication for account protection

### 5.4 Anti-Detection

- **User Agent Rotation:** Realistic user agent profiles rotated per request
- **Fingerprint Spoofing:** Canvas, WebGL, and Navigator APIs spoofed
- **Behavior Simulation:** Human-like behavior patterns injected
- **Rate Limiting:** Request throttling per host to avoid detection

---

## 6. Deployment Architecture

### 6.1 Development Environment

- Local Node.js development server with hot module reloading
- Local MySQL database for data persistence
- Service worker disabled for easier debugging
- Verbose logging for troubleshooting

### 6.2 Staging Environment

- Docker container deployment
- Staging MySQL database
- Full PWA support with service workers
- Pre-production security scanning

### 6.3 Production Environment

- Kubernetes deployment (optional)
- Production MySQL database with replication
- CDN for static assets
- Automated backup and disaster recovery
- Monitoring and alerting

### 6.4 Mobile Deployment (APK)

- Trusted Web Activity (TWA) packaging
- Android signing with release keystore
- Play Store distribution
- Automatic updates through web app versioning

---

## 7. Scalability Considerations

### 7.1 Horizontal Scaling

- Stateless backend design enables load balancing
- Session data stored in database, not in-process
- Database connection pooling for efficient resource usage
- S3 for distributed file storage

### 7.2 Vertical Scaling

- Efficient database indexes for query performance
- Caching strategies for frequently accessed data
- Compression for large responses
- Lazy loading for UI components

### 7.3 Database Optimization

- Proper indexing on frequently queried columns
- Query optimization through Drizzle ORM
- Connection pooling to reduce overhead
- Regular maintenance and statistics updates

---

## 8. Performance Targets

| Metric              | Target            | Rationale                          |
| ------------------- | ----------------- | ---------------------------------- |
| Initial Page Load   | < 3 seconds       | Acceptable for web applications    |
| API Response Time   | < 200ms (p95)     | Responsive user experience         |
| Database Query Time | < 50ms (p95)      | Efficient data access              |
| Bundle Size         | < 500KB (gzipped) | Fast downloads on mobile           |
| Lighthouse Score    | > 90              | High performance and accessibility |
| Time to Interactive | < 2 seconds       | Quick user engagement              |

---

## 9. Monitoring & Observability

### 9.1 Logging

- Structured logging with timestamps and context
- Log levels: DEBUG, INFO, WARN, ERROR, CRITICAL
- Centralized log aggregation
- Audit logs for security events

### 9.2 Metrics

- Request latency and throughput
- Error rates and types
- Database query performance
- Resource utilization (CPU, memory, disk)
- User engagement metrics

### 9.3 Tracing

- Distributed tracing for request flows
- Performance profiling for bottlenecks
- Error tracking and reporting
- User session tracking

---

## 10. Disaster Recovery

### 10.1 Backup Strategy

- Daily automated database backups
- Point-in-time recovery capability
- Off-site backup storage
- Regular backup restoration testing

### 10.2 High Availability

- Database replication for redundancy
- Load balancing for service distribution
- Automatic failover mechanisms
- Health checks and monitoring

### 10.3 Incident Response

- Documented incident response procedures
- On-call rotation for critical issues
- Post-incident review process
- Continuous improvement from incidents

---

## 11. Technology Rationale

### Why React?

React provides a modern component model with excellent TypeScript support, a large ecosystem of libraries, and strong community support. The virtual DOM enables efficient rendering, and hooks provide a clean API for state management.

### Why Express?

Express is lightweight, well-established, and has an excellent middleware ecosystem. It provides just enough structure without being opinionated, allowing flexibility in application design.

### Why tRPC?

tRPC provides end-to-end type safety without code generation, reducing the gap between frontend and backend. The type-safe API contracts eliminate a whole class of bugs and improve developer experience.

### Why Drizzle ORM?

Drizzle provides type-safe SQL building with excellent TypeScript support. Unlike other ORMs, it doesn't hide SQL, allowing for optimization when needed while providing safety when desired.

### Why MySQL/TiDB?

MySQL is reliable, scalable, and has excellent transaction support. TiDB provides horizontal scalability and distributed transactions for future growth.

### Why PWA + APK?

Building as a PWA first provides a web-accessible application with offline capabilities. Packaging as an APK through TWA enables native mobile distribution while reusing the same codebase.

---

## 12. Future Considerations

### 12.1 Potential Enhancements

- **Offline-First Architecture:** Enhanced offline support with local database
- **Real-Time Collaboration:** WebSocket support for multi-user features
- **Advanced Analytics:** Detailed usage analytics and insights
- **Machine Learning:** Anomaly detection and fraud prevention
- **Blockchain Integration:** Decentralized identity and trust

### 12.2 Technology Evolution

- **Edge Computing:** Cloudflare Workers for edge processing
- **GraphQL:** Alternative to tRPC for complex queries
- **Microservices:** Service decomposition for independent scaling
- **Serverless:** AWS Lambda for specific workloads

---

## References

[1] React Documentation: https://react.dev/
[2] Express.js Documentation: https://expressjs.com/
[3] tRPC Documentation: https://trpc.io/
[4] Drizzle ORM Documentation: https://orm.drizzle.team/
[5] Tailwind CSS Documentation: https://tailwindcss.com/
[6] PWA Documentation: https://web.dev/progressive-web-apps/
[7] Trusted Web Activity: https://developer.chrome.com/docs/android/trusted-web-activity/
[8] OWASP Security Guidelines: https://owasp.org/

---

**Next Document:** [Feature Specifications](./02-FEATURE-SPECIFICATIONS.md)
