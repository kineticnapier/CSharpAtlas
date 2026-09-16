#!/usr/bin/env bash
set -euo pipefail

WEB_ROOT="src/CSharpAtlas.Web/wwwroot"
CONTENT_SOURCE="src/CSharpAtlas.Web/content"
CONTENT_TARGET="$WEB_ROOT/content"

rm -rf "$CONTENT_TARGET"
mkdir -p "$CONTENT_TARGET"
cp "$CONTENT_SOURCE"/*.json "$CONTENT_TARGET"/

printf 'CSharpAtlas static site prepared in %s\n' "$WEB_ROOT"
