# Data Fetching

No.JS makes HTTP requests declarative — just add attributes to HTML elements.

## Base URL

Set once on any ancestor element. All descendant `get`, `post`, etc. resolve relative URLs against it.

```html
<body base="https://api.myapp.com/v1">
  <div get="/users">...</div>        <!-- → https://api.myapp.com/v1/users -->
  <div get="/posts">...</div>        <!-- → https://api.myapp.com/v1/posts -->
</body>
```

Override for specific sections:

```html
<div base="https://cms.myapp.com/api">
  <div get="/articles">...</div>     <!-- → https://cms.myapp.com/api/articles -->
</div>
```

Absolute URLs skip base resolution:

```html
<div get="https://other-api.com/data">...</div>
```

### Programmatic Configuration

```html
<script>
  NoJS.config({
    baseApiUrl: 'https://api.myapp.com/v1',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token'),
      'Content-Type': 'application/json'
    },
    timeout: 10000,
    retries: 2,
    retryDelay: 1000
  });
</script>
```

### Per-Request Headers

```html
<div get="/me"
     headers='{"Authorization": "Bearer abc123"}'
     as="user">
</div>
```

---

## `get` — Fetch and Render Data

```html
<div get="/users" as="users">
  <!-- `users` is now available in this scope -->
</div>
```

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `get` | `string` | URL to fetch (GET request) |
| `as` | `string` | Name to assign the response in the context. Default: `"data"` |
| `loading` | `string` | Template ID to show while loading (e.g. `"#skeleton"`) |
| `error` | `string` | Template ID to show on fetch error (e.g. `"#errorTpl"`) |
| `empty` | `string` | Template ID to show when response is empty array/null |
| `refresh` | `number` | Auto-refresh interval in ms (polling) |
| `cached` | `boolean\|string` | Cache responses. `cached` = memory, `cached="local"` = localStorage, `cached="session"` = sessionStorage |
| `into` | `string` | Write response to a named global store |
| `debounce` | `number` | Debounce in ms (useful with reactive URLs) |
| `headers` | `string` | JSON string of additional headers |
| `params` | `string` | Expression that resolves to query params object |
| `retry` | `number` | Override global retry count for this request |
| `retry-delay` | `number` | Override global retry delay in ms (default: 1000) |
| `skeleton` | `string` | ID (without `#`) of an existing DOM element to hide while loading and restore after response. Use for CLS prevention. Element must start **visible** in HTML — No.JS controls visibility via inline `display` style. |

### Full Example

```html
<div get="/users"
     as="users"
     loading="#usersSkeleton"
     error="#usersError"
     empty="#noUsers"
     refresh="30000"
     cached>

  <div each="user in users" template="userCard"></div>

</div>

<template id="usersSkeleton">
  <div class="skeleton-pulse">Loading users...</div>
</template>

<template id="usersError" var="err">
  <div class="error">Failed to load: <span bind="err.message"></span></div>
</template>

<template id="noUsers">
  <p>No users found.</p>
</template>
```

### Reactive URLs

URLs that reference state variables re-fetch automatically when those values change:

```html
<div state="{ page: 1, search: '' }">
  <input type="text" bind-value="search" on:input="search = $event.target.value" />

  <div get="/users?page={page}&q={search}"
       as="results"
       debounce="300">
    ...
  </div>
</div>
```

---

## `post`, `put`, `patch`, `delete` — Mutating Requests

Used on forms or triggered via `call`.

> **Tip:** The `call` directive now supports the same attributes as form-based HTTP directives — including `loading`, `headers`, `redirect`, and `body`. See [Actions & Refs → `call`](actions-refs.md) for full details.

### Form Submission

```html
<form post="/login"
      success="#loginSuccess"
      error="#loginError"
      loading="#loginLoading">
  <input type="text" name="email" />
  <input type="password" name="password" />
  <button type="submit">Login</button>
</form>

<template id="loginSuccess" var="result">
  <p>Welcome, <span bind="result.user.name"></span>!</p>
</template>

<template id="loginError" var="err">
  <p class="error" bind="err.message"></p>
</template>
```

### PUT / PATCH / DELETE

```html
<form put="/users/{user.id}"
      body='{"name": "{user.name}", "role": "{selectedRole}"}'
      success="#updateSuccess">
  ...
</form>

<button delete="/users/{user.id}"
        confirm="Are you sure?"
        success="#deleteSuccess"
        error="#deleteError">
  Delete User
</button>
```

### Mutation Attributes

| Attribute | Description |
|-----------|-------------|
| `post`, `put`, `patch`, `delete` | URL for the request |
| `body` | Request body (JSON string with interpolation). For forms, auto-serializes fields |
| `success` | Template ID to render on success. Receives response as `var` |
| `error` | Template ID to render on error. Receives error as `var` |
| `loading` | Template ID to show during request |
| `confirm` | Show browser `confirm()` dialog before sending |
| `redirect` | URL to navigate to on success (SPA route) |
| `then` | Expression to execute on success (e.g. `"users.push(result)"`) |
| `into` | Write response to a named global store |
| `cached` | Cache responses (memory/local/session) |
| `retry` | Override global retry count for this request |
| `retry-delay` | Override global retry delay in ms (default: 1000) |

### Request Lifecycle

```
[idle] → [loading] → [success | error]
                         ↓         ↓
                    render tpl   render tpl
                    exec `then`  log to console
                    `redirect`
```

---

## Skeleton Placeholders (`skeleton=`)

The `skeleton=` attribute keeps a pre-rendered placeholder visible during a request, preventing Cumulative Layout Shift (CLS). Unlike `loading=` (which clones a template via JS), the skeleton already exists in the DOM.

```html
<!-- Skeleton starts visible (no display:none in CSS) -->
<div id="product-skeleton" class="skeleton-card">
  <div class="skeleton-line"></div>
  <div class="skeleton-line short"></div>
</div>

<!-- skeleton= points to the element's id (without #) -->
<div get="/api/products/42" as="product" skeleton="product-skeleton">
  <h1 bind="product.name"></h1>
  <p bind="product.description"></p>
</div>
```

The skeleton is hidden when: response arrives (success), cached response used, empty response (before `empty=` template), or error (before `error=` template).

**`skeleton=` vs `loading=`:**

| | `skeleton=` | `loading=` |
|---|---|---|
| Content | Existing DOM element | Template cloned by JS |
| CLS impact | None — space reserved | May cause layout shift |
| SSG-friendly | Yes | No |

---

## Automatic Resource Hints

No.JS automatically injects `<link>` resource hints for performance optimization:

| Hint type | Trigger | Benefit |
|---|---|---|
| `preload` | Static `get=` URL (no `{interpolation}`) | Starts API request before JS renders the component |
| `preconnect` | Cross-origin `get=` URL | Eliminates DNS + TLS round-trip for external APIs |
| `prefetch` | `<template route src="...">` | Loads route templates in the background after first paint |

All hints are **deduplicated** — no duplicate is added if the same URL already has a hint in `<head>`.

Dynamic URLs containing `{interpolation}` are skipped (value not known at init time).

**Build-time injection** (recommended for LCP — hints fire before JavaScript executes):

```sh
node scripts/inject-resource-hints.js "dist/**/*.html"
```

```json
// package.json
{ "scripts": { "build": "your-bundler && node scripts/inject-resource-hints.js" } }
```

**`crossorigin` note:** All auto-injected hints use `crossorigin="anonymous"`. For APIs that require cookies or an `Authorization` header, write the hint manually with `crossorigin="use-credentials"`.

---

**Next:** [Data Binding →](data-binding.md)
