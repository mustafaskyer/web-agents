# @webmcp-agents/tools

## 0.2.0

### Minor Changes

- [#1](https://github.com/webmcp-agents/webmcp-agents/pull/1) [`e02b657`](https://github.com/webmcp-agents/webmcp-agents/commit/e02b657b080039e109da16431b55374af4952624) Thanks [@mustafaskyer](https://github.com/mustafaskyer)! - New package: common WebMCP tools, ready-made. `getTime()`, `getLocation()`, `getPage()`, `goTo({ pages })`, `goBack()`, `scrollTo()` and `setTheme({ get?, set? })` each return a `defineWebTool` tool (`get_time`, `get_location`, `get_page`, `go_to`, `go_back`, `scroll_to`, `set_theme`) to put in your catalog. Framework-free, SSR-safe and tree-shakeable: `go_to` clicks the page's own link (so any client router handles it) and falls back to `location.assign`; `set_theme` presses the site's theme switch, else calls `set`; `get_location` needs no lookup service (pass `lookup` for city, region and country). Every factory takes `{ id?, description? }`.

### Patch Changes

- Updated dependencies [[`e02b657`](https://github.com/webmcp-agents/webmcp-agents/commit/e02b657b080039e109da16431b55374af4952624), [`d5126c6`](https://github.com/webmcp-agents/webmcp-agents/commit/d5126c67cab8360b488dd5ba71250dab529facf1), [`e02b657`](https://github.com/webmcp-agents/webmcp-agents/commit/e02b657b080039e109da16431b55374af4952624), [`2c38778`](https://github.com/webmcp-agents/webmcp-agents/commit/2c38778dbc9d053ce1f3ec7506246cd70946c7fb), [`da60d2d`](https://github.com/webmcp-agents/webmcp-agents/commit/da60d2d7db94abfc7b07773597f9d7f93aeb46fd), [`0a20fa6`](https://github.com/webmcp-agents/webmcp-agents/commit/0a20fa6c9194b3faacafc10a91d5b91c371fdc2a), [`e02b657`](https://github.com/webmcp-agents/webmcp-agents/commit/e02b657b080039e109da16431b55374af4952624), [`27088fe`](https://github.com/webmcp-agents/webmcp-agents/commit/27088feef01c455889e391f689c8f2be9eeecbcb), [`2c38778`](https://github.com/webmcp-agents/webmcp-agents/commit/2c38778dbc9d053ce1f3ec7506246cd70946c7fb), [`e02b657`](https://github.com/webmcp-agents/webmcp-agents/commit/e02b657b080039e109da16431b55374af4952624)]:
  - @webmcp-agents/core@0.2.0
