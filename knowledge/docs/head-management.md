# Head Management

No.JS provides four reactive directives and four route attributes for updating `<head>` elements.

---

## Body Directives (non-routing pages)

Place on `<div hidden>` elements in the page body. Reactive — re-apply whenever surrounding state changes. Use for product pages, landing pages, and any page without a SPA router.

> For SPA routing use `page-title`, `page-description`, `page-canonical`, and `page-jsonld` as attributes on `<template route>` — see [Route Head Attributes](#route-head-attributes) below.

```html
<div hidden page-title="product.name + ' | My Store'"></div>
<div hidden page-description="product.description"></div>
<div hidden page-canonical="'/products/' + product.slug"></div>
<div hidden page-jsonld>
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "{product.name}",
    "offers": { "@type": "Offer", "price": "{product.price}", "priceCurrency": "USD" }
  }
</div>
```

### `page-title`

Updates `document.title`.

- Value: No.JS expression. Use single-quoted strings: `page-title="'About Us | Site'"`
- Priority 20 (same as `bind`, `show`, etc.)

### `page-description`

Creates or updates `<meta name="description" content="...">` in `<head>`.

- If the tag already exists (e.g. set server-side), it is updated in place.

### `page-canonical`

Creates or updates `<link rel="canonical" href="...">` in `<head>`.

- Value: expression evaluating to a URL string.

### `page-jsonld`

Creates or updates `<script type="application/ld+json" data-nojs>` in `<head>`.

- The JSON-LD template is written as the **element body**, not as the attribute value.
- Use `{expression}` placeholders for dynamic values. Structural JSON braces are not interpolated — only `{variable}` patterns matching a state key are.
- The `data-nojs` marker distinguishes the managed tag from any hand-written JSON-LD blocks.

---

## Route Head Attributes

Declarative head management on `<template route>` elements. Updated once on each navigation. Expressions have access to `$route` and `$store`.

```html
<!-- Static title -->
<template route="/about" page-title="'About Us | My Store'">
  <h1>About</h1>
</template>

<!-- Dynamic from route params and store -->
<template route="/products/:id"
          page-title="'Product ' + $route.params.id + ' | Store'"
          page-description="'View product detail'"
          page-canonical="'/products/' + $route.params.id"
          page-jsonld='{"@type":"Product","name":"{$route.params.id}"}'>
  <h1>Product Detail</h1>
</template>

<template route="/account" page-title="$store.user.name + ' — My Account'">
  <h1>Account</h1>
</template>
```

| Attribute | Description |
|-----------|-------------|
| `page-title` | Sets `document.title` |
| `page-description` | Creates/updates `<meta name="description">` |
| `page-canonical` | Creates/updates `<link rel="canonical">` |
| `page-jsonld` | Creates/updates `<script type="application/ld+json" data-nojs>`. Supports `{placeholder}` interpolation. |

**Notes:**
- Evaluated **once per navigation** — not continuously reactive
- `$store` changes after navigation do not re-update the title
- Default outlet only — secondary outlets do not trigger head updates
- String literals require single quotes inside the HTML attribute: `page-title="'My Title'"` ✅

---

## SSG & Pre-Rendering

For multi-page SSG sites, `<title>` and `<meta>` are rendered by the server template — no client-side directive needed. For SPAs with a router, use route head attributes.

```html
<!-- Eleventy / Nunjucks — server renders the <head> -->
<!DOCTYPE html>
<html>
<head>
  <title>{{ product.name }} | My Store</title>
  <meta name="description" content="{{ product.description }}">
</head>
<body>
  <div id="app" state='{{ product | dump }}'>
    <!-- No.JS enriches the pre-rendered page with interactivity -->
    <button post="/api/cart/add" body='{"id":"{{ product.id }}"}'>Add to cart</button>
  </div>
</body>
</html>
```

---

**Next:** [Data Fetching →](data-fetching.md)
