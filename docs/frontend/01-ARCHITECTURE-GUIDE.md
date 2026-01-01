# Frontend Architecture Guide

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Pre-Development Blueprint

---

## Executive Summary

This document outlines the frontend architecture for the Incog browser application, covering component structure, state management, responsive design patterns, performance optimization, and accessibility requirements. The frontend is built with React 19, Tailwind CSS 4, and TanStack Query for optimal user experience across desktop and mobile platforms.

---

## 1. Component Architecture

### 1.1 Component Hierarchy

```
App
├── ThemeProvider
├── TooltipProvider
├── Router
│   ├── Layout
│   │   ├── Header
│   │   │   ├── Logo
│   │   │   ├── Navigation
│   │   │   └── UserMenu
│   │   ├── Sidebar (optional)
│   │   └── Content
│   │       ├── Home
│   │       ├── AccountManager
│   │       │   ├── AccountList
│   │       │   │   └── AccountCard
│   │       │   └── AccountForm
│   │       ├── ProxyManager
│   │       │   ├── ProxyList
│   │       │   │   └── ProxyCard
│   │       │   └── ProxyForm
│   │       ├── BrowserView
│   │       │   ├── TabBar
│   │       │   │   └── TabItem
│   │       │   ├── URLBar
│   │       │   └── WebViewContainer
│   │       └── Settings
│   │           ├── GeneralSettings
│   │           ├── SecuritySettings
│   │           └── PrivacySettings
│   └── NotFound
└── Toaster
```

### 1.2 Component Organization

**Directory Structure:**

```
client/src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   ├── account/
│   │   ├── AccountList.tsx
│   │   ├── AccountCard.tsx
│   │   ├── AccountForm.tsx
│   │   └── AccountSwitcher.tsx
│   ├── proxy/
│   │   ├── ProxyList.tsx
│   │   ├── ProxyCard.tsx
│   │   ├── ProxyForm.tsx
│   │   └── ProxyTester.tsx
│   ├── browser/
│   │   ├── TabBar.tsx
│   │   ├── TabItem.tsx
│   │   ├── URLBar.tsx
│   │   └── WebViewContainer.tsx
│   └── common/
│       ├── ErrorBoundary.tsx
│       ├── Loading.tsx
│       └── EmptyState.tsx
├── pages/
│   ├── Home.tsx
│   ├── AccountManager.tsx
│   ├── ProxyManager.tsx
│   ├── BrowserView.tsx
│   ├── Settings.tsx
│   └── NotFound.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useAccount.ts
│   ├── useProxy.ts
│   └── useLocalStorage.ts
├── contexts/
│   ├── ThemeContext.tsx
│   ├── AuthContext.tsx
│   └── AccountContext.tsx
├── lib/
│   ├── trpc.ts
│   ├── utils.ts
│   └── constants.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

## 2. State Management

### 2.1 Server State (TanStack Query)

**Server state** is managed using TanStack Query (React Query) for all backend data:

```typescript
// Query example
const { data: accounts, isLoading, error } = trpc.account.list.useQuery();

// Mutation example
const createAccount = trpc.account.create.useMutation({
  onSuccess: () => {
    // Invalidate cache
    utils.account.list.invalidate();
  },
});
```

**Cache Management:**

```typescript
const utils = trpc.useUtils();

// Invalidate specific query
utils.account.list.invalidate();

// Invalidate all account queries
utils.account.invalidate();

// Prefetch data
utils.account.list.prefetch();
```

### 2.2 Client State (React Hooks)

**Client state** is managed using React hooks for UI-specific state:

```typescript
function AccountManager() {
  // UI state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Server state
  const { data: accounts } = trpc.account.list.useQuery();

  // Derived state
  const filteredAccounts = accounts?.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    // JSX
  );
}
```

### 2.3 Context for Global State

**Global state** (authentication, theme) is managed using React Context:

```typescript
// AuthContext.tsx
interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation();

  return (
    <AuthContext.Provider value={{ user: user || null, loading: isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## 3. Page Structure

### 3.1 Home Page

**Purpose:** Landing page with account overview and quick actions.

**Components:**

- Account summary cards
- Recent activity
- Quick action buttons
- Navigation to main features

### 3.2 Account Manager

**Purpose:** Create, edit, delete, and switch between accounts.

**Components:**

- Account list with search/filter
- Account creation form
- Account detail view
- Account deletion confirmation

**State:**

```typescript
interface AccountManagerState {
  accounts: Account[];
  selectedAccountId: string | null;
  isFormOpen: boolean;
  formMode: "create" | "edit";
  searchQuery: string;
}
```

### 3.3 Proxy Manager

**Purpose:** Manage proxy configurations and assignments.

**Components:**

- Proxy list with filtering
- Proxy creation/edit form
- Proxy testing interface
- Account-proxy assignment

**State:**

```typescript
interface ProxyManagerState {
  proxies: ProxyConfig[];
  selectedProxyId: string | null;
  isFormOpen: boolean;
  testingProxyId: string | null;
  testResults: Map<string, ProxyTestResult>;
}
```

### 3.4 Browser View

**Purpose:** Main browsing interface with tabs and URL bar.

**Components:**

- Tab bar with tab management
- URL bar with navigation
- WebView container
- Account/proxy selector
- Incognito mode indicator

**State:**

```typescript
interface BrowserViewState {
  currentAccountId: string;
  tabs: BrowserTab[];
  activeTabId: string | null;
  isIncognito: boolean;
  currentUrl: string;
  isLoading: boolean;
}
```

---

## 4. Responsive Design

### 4.1 Breakpoints

The application uses Tailwind CSS breakpoints:

| Breakpoint | Width  | Device        |
| ---------- | ------ | ------------- |
| `sm`       | 640px  | Small phone   |
| `md`       | 768px  | Tablet        |
| `lg`       | 1024px | Desktop       |
| `xl`       | 1280px | Large desktop |
| `2xl`      | 1536px | Extra large   |

### 4.2 Mobile-First Approach

**Design mobile layout first, then enhance for larger screens:**

```typescript
function AccountList() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts?.map(account => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
}
```

### 4.3 Touch-Friendly Design

**Ensure touch targets are at least 44x44px:**

```typescript
function AccountCard({ account }: { account: Account }) {
  return (
    <button
      className="p-4 rounded-lg border hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      onClick={() => switchAccount(account.id)}
    >
      <h3 className="text-lg font-semibold">{account.name}</h3>
      <p className="text-sm text-gray-600">{account.description}</p>
    </button>
  );
}
```

---

## 5. Performance Optimization

### 5.1 Code Splitting

**Lazy load pages to reduce initial bundle size:**

```typescript
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home'));
const AccountManager = lazy(() => import('./pages/AccountManager'));
const ProxyManager = lazy(() => import('./pages/ProxyManager'));

function Router() {
  return (
    <Suspense fallback={<Loading />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/accounts" component={AccountManager} />
        <Route path="/proxies" component={ProxyManager} />
      </Switch>
    </Suspense>
  );
}
```

### 5.2 Memoization

**Memoize expensive components and callbacks:**

```typescript
const AccountCard = memo(function AccountCard({ account }: { account: Account }) {
  return (
    <div className="p-4 rounded-lg border">
      <h3>{account.name}</h3>
    </div>
  );
});

function AccountList() {
  const handleSwitch = useCallback((accountId: string) => {
    switchAccount(accountId);
  }, []);

  return (
    <div>
      {accounts?.map(account => (
        <AccountCard
          key={account.id}
          account={account}
          onSwitch={handleSwitch}
        />
      ))}
    </div>
  );
}
```

### 5.3 Image Optimization

**Use optimized image formats and lazy loading:**

```typescript
function AccountCard({ account }: { account: Account }) {
  return (
    <div className="p-4">
      <img
        src={account.thumbnail}
        alt={account.name}
        loading="lazy"
        className="w-full h-32 object-cover rounded"
      />
    </div>
  );
}
```

### 5.4 Query Optimization

**Prefetch data for better UX:**

```typescript
function AccountList() {
  const utils = trpc.useUtils();
  const { data: accounts } = trpc.account.list.useQuery();

  const handleMouseEnter = (accountId: string) => {
    // Prefetch account details
    utils.account.get.prefetch({ accountId });
  };

  return (
    <div>
      {accounts?.map(account => (
        <div key={account.id} onMouseEnter={() => handleMouseEnter(account.id)}>
          {account.name}
        </div>
      ))}
    </div>
  );
}
```

---

## 6. Accessibility

### 6.1 ARIA Labels

**Add semantic HTML and ARIA labels:**

```typescript
function AccountSwitcher() {
  return (
    <select
      aria-label="Select account"
      onChange={(e) => switchAccount(e.target.value)}
    >
      <option value="">Select an account</option>
      {accounts?.map(account => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </select>
  );
}
```

### 6.2 Keyboard Navigation

**Support keyboard navigation for all interactive elements:**

```typescript
function AccountCard({ account }: { account: Account }) {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      switchAccount(account.id);
    }
  };

  return (
    <button
      className={`p-4 rounded-lg border ${isFocused ? 'ring-2 ring-primary' : ''}`}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      onClick={() => switchAccount(account.id)}
    >
      {account.name}
    </button>
  );
}
```

### 6.3 Color Contrast

**Ensure sufficient color contrast for readability:**

```css
/* Good contrast (WCAG AA)
- Text: #000000 on #FFFFFF (21:1)
- Text: #333333 on #FFFFFF (12.6:1)
- Text: #666666 on #FFFFFF (7:1)
*/

.text-primary {
  @apply text-blue-600; /* 7.5:1 on white */
}

.text-secondary {
  @apply text-gray-600; /* 7:1 on white */
}
```

---

## 7. Error Handling

### 7.1 Error Boundaries

**Catch React errors and display fallback UI:**

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="text-red-800 font-semibold">Something went wrong</h2>
          <p className="text-red-700">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 7.2 Async Error Handling

**Handle errors in async operations:**

```typescript
function AccountForm() {
  const [error, setError] = useState<string | null>(null);

  const createAccount = trpc.account.create.useMutation({
    onError: (error) => {
      setError(error.message);
    },
    onSuccess: () => {
      setError(null);
      // Show success message
    },
  });

  return (
    <form>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}
      {/* Form fields */}
    </form>
  );
}
```

---

## 8. Loading States

### 8.1 Skeleton Loading

**Show skeleton placeholders while loading:**

```typescript
function AccountListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}

function AccountList() {
  const { data: accounts, isLoading } = trpc.account.list.useQuery();

  if (isLoading) return <AccountListSkeleton />;

  return (
    <div>
      {accounts?.map(account => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
}
```

### 8.2 Progress Indicators

**Show progress for long-running operations:**

```typescript
function ProxyTester({ proxyId }: { proxyId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const testProxy = trpc.proxy.test.useMutation({
    onMutate: () => {
      setIsLoading(true);
      setProgress(0);
    },
    onSuccess: () => {
      setProgress(100);
      setIsLoading(false);
    },
  });

  return (
    <div>
      <button
        onClick={() => testProxy.mutate({ proxyConfigId: proxyId })}
        disabled={isLoading}
      >
        {isLoading ? 'Testing...' : 'Test Proxy'}
      </button>
      {isLoading && (
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}
```

---

## 9. Styling & Theming

### 9.1 Design Tokens

**Use consistent design tokens from Tailwind CSS:**

```css
/* client/src/index.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.6%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --accent: 0 84.2% 60.2%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.6%;
  }

  .dark {
    --background: 0 0% 3.6%;
    --foreground: 0 0% 98.2%;
    /* ... dark mode colors ... */
  }
}
```

### 9.2 Theme Switching

**Support light and dark themes:**

```typescript
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

---

## 10. Testing

### 10.1 Component Testing

**Test components with Vitest and React Testing Library:**

```typescript
import { render, screen } from '@testing-library/react';
import { AccountCard } from './AccountCard';

describe('AccountCard', () => {
  it('renders account name', () => {
    const account = {
      id: '1',
      name: 'Test Account',
      description: 'Test description',
    };

    render(<AccountCard account={account} />);

    expect(screen.getByText('Test Account')).toBeInTheDocument();
  });

  it('calls onSwitch when clicked', () => {
    const onSwitch = vi.fn();
    const account = { id: '1', name: 'Test Account' };

    render(<AccountCard account={account} onSwitch={onSwitch} />);

    screen.getByRole('button').click();

    expect(onSwitch).toHaveBeenCalledWith('1');
  });
});
```

---

## References

[1] React Documentation: https://react.dev/
[2] Tailwind CSS: https://tailwindcss.com/
[3] TanStack Query: https://tanstack.com/query/latest
[4] Web Accessibility Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
[5] React Testing Library: https://testing-library.com/react

---

**Next Document:** [Development Guardrails](../deployment/01-DEVELOPMENT-GUARDRAILS.md)
