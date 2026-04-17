### Clean Web Page Extraction (`/skill:defuddle`)

When the user gives you a URL to a standard web page (article, docs, blog post) and you need its content, **prefer the `defuddle` skill over `WebFetch`** — it strips navigation/ads/cruft and saves tokens. Skip for URLs ending in `.md` (already clean) and for dynamic pages where you actually need `browser-tools`.
