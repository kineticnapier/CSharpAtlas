# Cloudflare Pages

CSharpAtlas can be deployed as a fully static Cloudflare Pages site. ASP.NET Core is not required in production.

## Pages settings

- Production branch: `main`
- Build command: `bash scripts/build-pages.sh`
- Build output directory: `src/CSharpAtlas.Web/wwwroot`

The build script copies the article JSON files from `src/CSharpAtlas.Web/content` into the static output directory. The browser loads and searches those files directly.

Git-connected Pages projects automatically create preview deployments for pull requests and non-production branches.

## Local static preview

Run the build script and serve `src/CSharpAtlas.Web/wwwroot` with any static HTTP server. Do not open `index.html` directly with `file://`, because the browser needs to fetch the JSON article files.

The ASP.NET Core project may still be used as a local development host, but the site itself no longer depends on `/api/items`.
