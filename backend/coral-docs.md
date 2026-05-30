# Coral

> Coral is a single SQL interface for APIs, files, and other data sources. It sits between AI agents and data sources: agents write SQL, Coral translates it into API calls or file reads, and returns a single query result. Everything runs locally — your data, credentials, and usage history never leave your machine.

Coral exposes popular data sources (GitHub, Slack, Datadog, Linear, Sentry, Stripe, Notion, and more) as SQL schemas and tables. It ships as a local CLI and MCP stdio server. Agents interact with Coral through SQL rather than individual provider MCPs, reducing tool calls, token traffic, and cross-source stitching.

## Docs

- [Introduction to Coral](https://withcoral.com/docs): Overview, benchmarks, how Coral works, quick links.
- [Installation](https://withcoral.com/docs/getting-started/installation): Install via Homebrew, install script, Windows ZIP, or build from source. Covers upgrade, uninstall, agent skills (`npx skills add withcoral/skills`), and local state directory.
- [Quickstart](https://withcoral.com/docs/getting-started/quickstart): Discover bundled sources, add a source with `coral source add --interactive`, query with `coral sql`.

## Guides

- [Use Coral over MCP](https://withcoral.com/docs/guides/use-coral-over-mcp): Set up the MCP stdio server for Claude Code, Cursor, VS Code, Codex, OpenCode, and Claude Desktop. MCP tools: `sql`, `list_catalog`, `search_catalog`, `describe_table`, `list_columns`. Resources: `coral://guide`, `coral://tables`.
- [Write a custom source spec](https://withcoral.com/docs/guides/write-a-custom-source): Author YAML source specs for file-backed (Parquet, JSONL, JSON, CSV) or HTTP API sources. Covers auth, OAuth, inputs, pagination, search table functions, column naming (`parent__child`), linting, and validation.
- [Observe Coral with OpenTelemetry](https://withcoral.com/docs/guides/observe-with-opentelemetry): Export traces, logs, and metrics over OTLP/HTTP. Configure `[otel]` and `[trace_history]` in `config.toml`. Covers distributed tracing via `CORAL_TRACE_PARENT`.

## Reference

- [CLI reference](https://withcoral.com/docs/reference/cli-reference): Full reference for `coral sql`, `coral source` (discover, list, info, add, lint, test, remove), `coral onboard`, `coral features`, `coral ui`, `coral mcp-stdio`, `coral completion`.
- [Configuration](https://withcoral.com/docs/reference/configuration): `config.toml` structure; `[features]`, `[otel]`, `[trace_history]` sections; runtime feature flags.
- [Bundled sources](https://withcoral.com/docs/reference/bundled-sources): All data sources shipped with Coral — claude, clickup, cloudwatch_logs, cloudwatch_metrics, codex, confluence, datadog, github, gitlab, google_calendar, grafana, incident_io, intercom, jira, launchdarkly, linear, notion, openobserve, pagerduty, posthog, sentry, slack, statusgator, stripe, wandb. Includes per-source credential configuration.
- [Community sources](https://withcoral.com/docs/reference/community-sources): Community-maintained source specs importable via `coral source add --file`.
- [Source spec reference](https://withcoral.com/docs/reference/source-spec-reference): Full YAML schema for source specs — top-level fields, `inputs`, `auth`, `tables`, `columns`, `functions`, HTTP pagination, response parsing.

## Project

- [Roadmap](https://withcoral.com/docs/project/roadmap): What Coral supports today, what is planned, and long-term direction.
- [Security model](https://withcoral.com/docs/project/security): Threat model, local-only trust boundary, secret storage, credential handling.
- [Architecture](https://withcoral.com/docs/project/architecture): Crate structure, gRPC transport, DataFusion integration, request flow.
- [Changelog](https://withcoral.com/docs/project/changelog): Release notes for the Coral CLI.