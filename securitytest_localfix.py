#!/usr/bin/env python3
"""
Moudel AI - Safe Security & Load Assessment
===========================================

This is a defensive, non-destructive assessment helper for systems you own or
are explicitly authorized to test.

It performs:
  * Basic HTTPS/TLS and HTTP security-header checks
  * CORS allow-list checks (including an untrusted Origin probe)
  * Checks for common accidentally exposed files/endpoints
  * Safe HTTP-method/OPTIONS observations
  * Optional dependency-audit command execution (npm audit / pip-audit)
  * Controlled GET-only baseline, ramp, spike, soak, breakpoint and mixed load profiles
  * A coverage report identifying checks that require manual/authorized testing

It intentionally does NOT:
  * Attempt SSRF against cloud metadata/internal IPs
  * Exploit IDOR, privilege escalation, SQL/NoSQL injection, XSS, SSTI,
    command injection, XXE, path traversal, JWT weaknesses, CSRF bypasses,
    file-upload exploits, or race conditions
  * Send PUT/PATCH/DELETE requests to application resources
  * perform destructive stress/breakpoint tests, login storms, webhook floods,
    database-pool exhaustion, WebSocket floods, or multi-region traffic floods

Those tests need endpoint-specific test accounts, staging infrastructure,
known-safe test data, explicit rate limits, and often human review.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import platform
import shutil
import socket
import ssl
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, urljoin

try:
    import requests
except ImportError:
    print("Missing dependency: requests. Install with: python -m pip install requests")
    raise SystemExit(2)


USER_AGENT = "Moudel-Security-Assessment/1.0 (authorized defensive testing)"
DEFAULT_BASE = "https://www.moudelai.com"
DEFAULT_API = "https://moudel-ai-api.onrender.com"
COMMON_EXPOSED_PATHS = [
    "/.env",
    "/.git/HEAD",
    "/.git/config",
    "/.DS_Store",
    "/backup.zip",
    "/backup.sql",
    "/dump.sql",
    "/database.sql",
    "/phpinfo.php",
    "/server-status",
    "/actuator",
    "/actuator/env",
    "/debug",
    "/openapi.json",
    "/docs",
    "/redoc",
]
SECURITY_HEADERS = {
    "strict-transport-security": "HSTS",
    "content-security-policy": "CSP",
    "x-content-type-options": "X-Content-Type-Options",
    "referrer-policy": "Referrer-Policy",
    "permissions-policy": "Permissions-Policy",
    "x-frame-options": "X-Frame-Options (legacy; CSP frame-ancestors is preferred)",
}
MANUAL_TESTS = {
    "A01 Broken Access Control": [
        "IDOR: create two test users; attempt cross-user access to each other's paper, collection, file and chat IDs.",
        "Horizontal/vertical privilege escalation: verify every admin and user route enforces server-side role checks.",
        "SSRF: review every server-side URL fetch/import feature; use a controlled callback server in staging. Never probe cloud metadata on production.",
        "Forced browsing: enumerate documented routes and verify unauthenticated access is denied where required.",
        "Path traversal: test file-download handlers using harmless traversal canaries in staging; verify canonical-path containment.",
        "HTTP method tampering: verify authorization is identical across GET/POST/PUT/PATCH/DELETE/HEAD; do not issue destructive methods to production data.",
        "CSRF: for cookie-authenticated state-changing routes, verify SameSite, origin checks and CSRF tokens where applicable.",
    ],
    "A02 Security Misconfiguration": [
        "Subdomain takeover: review all DNS records and confirm each CNAME target is actively claimed; do not claim third-party resources.",
        "Cloud storage: inspect Supabase Storage bucket policies for unintended public read/write and test with separate user accounts.",
        "Open ports: run an approved port scan against your own hosting provider's permitted targets; shared Render/Vercel IPs may be multi-tenant.",
        "XXE: inspect XML parsers and disable external entities/DTD processing; only test a dedicated staging endpoint.",
        "Review deployment settings, debug flags, directory listing and admin/debug routes.",
    ],
    "A03 Software Supply Chain Failures": [
        "Run npm audit (frontend) and pip-audit (backend); review and remediate findings rather than blindly applying force fixes.",
        "Review lockfiles, dependency provenance, abandoned packages and transitive dependencies.",
        "Check CI/CD logs and build artifacts for secrets; rotate any exposed credentials.",
        "Review third-party scripts and analytics loading/consent behavior.",
        "SRI is relevant to externally hosted static scripts/styles; prefer pinned dependencies and self-hosting where practical.",
    ],
    "A04 Cryptographic Failures": [
        "Verify password storage is delegated to Supabase Auth and no password is logged or stored by Moudel.",
        "Inspect JWT issuer, audience, signature algorithm, expiry and key rotation on the backend.",
        "Verify access/refresh tokens never appear in URLs, logs, analytics or error reports.",
        "Verify authenticated/private responses use suitable Cache-Control directives (often no-store).",
        "Review TLS configuration at the actual edge providers; this script only observes the negotiated connection.",
    ],
    "A05 Injection": [
        "Perform parameterized-query review for SQL; review any Mongo/JSON query construction for operator injection.",
        "Test reflected/stored/DOM XSS with harmless canaries in staging and inspect output encoding/CSP.",
        "Review subprocess/shell usage; avoid shell=True with user-controlled values.",
        "Review template rendering and disable unsafe evaluation.",
        "For AI/RAG: test prompt injection using a controlled test corpus; ensure retrieved text is treated as untrusted data and tools enforce authorization independently.",
        "Review header construction for CRLF injection and validate/encode user-controlled header values.",
    ],
    "A06 Insecure Design & Business Logic": [
        "Test concurrent duplicate actions with isolated test records and idempotency keys.",
        "Test multi-step flows by skipping steps and replaying requests using test accounts.",
        "Reject unexpected/privileged fields (e.g. is_admin, owner_id) through explicit request schemas and server-side ownership assignment.",
        "GraphQL-specific checks apply only if GraphQL is deployed; disable production introspection if not needed and bound query depth/complexity.",
    ],
    "A07 Authentication & Session Failures": [
        "Verify rate limits on login, signup, password reset and verification resend; test only with test accounts.",
        "Use generic authentication/reset responses to reduce account enumeration.",
        "Review MFA enforcement for privileged accounts if supported.",
        "Validate JWT signature/algorithm/issuer/audience/expiry; reject none, wrong-key and expired tokens.",
        "If OAuth is used, validate redirect_uri and state; otherwise mark not applicable.",
        "Verify cookies use Secure, HttpOnly and appropriate SameSite; verify logout/revocation semantics.",
    ],
    "A08 Software or Data Integrity Failures": [
        "For uploads: allow-list file types, inspect content signatures, enforce size limits, rename files, store outside executable web roots and scan where appropriate.",
        "Test SVG/HTML/polyglot upload handling in staging; serve user files with safe content types and disposition.",
        "Review JSON parsing and object merging for prototype-pollution patterns; avoid unsafe deserialization.",
    ],
    "A09 Security Logging & Alerting": [
        "Verify failed logins, authorization failures, account deletion, role changes and suspicious rate-limit events are logged.",
        "Never log passwords, full access tokens, refresh tokens or sensitive document contents.",
        "Confirm logs are access-controlled, retained appropriately and alerts reach an owner.",
    ],
    "A10 Mishandling of Exceptional Conditions": [
        "In staging, force dependency/database timeouts and verify protected routes fail closed.",
        "Trigger safe malformed-input and 4xx/5xx cases; ensure stack traces, SQL, filesystem paths and secrets are not returned.",
        "Review exception handlers so errors never turn authorization checks into allow decisions.",
    ],
}


@dataclass
class Finding:
    severity: str
    check: str
    target: str
    result: str
    evidence: str = ""


FINDINGS: list[Finding] = []


def add(severity: str, check: str, target: str, result: str, evidence: str = "") -> None:
    FINDINGS.append(Finding(severity, check, target, result, evidence[:1200]))


def normalized_origin(url: str) -> str:
    p = urlparse(url)
    return f"{p.scheme}://{p.netloc}"


def request(session: requests.Session, method: str, url: str, **kwargs: Any) -> requests.Response:
    kwargs.setdefault("timeout", 12)
    kwargs.setdefault("allow_redirects", False)
    return session.request(method, url, **kwargs)


def check_tls(url: str) -> None:
    parsed = urlparse(url)
    host = parsed.hostname
    if not host:
        add("ERROR", "TLS", url, "Invalid URL")
        return
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    if parsed.scheme != "https":
        add("HIGH", "HTTPS", url, "Target URL is not HTTPS")
        return
    try:
        context = ssl.create_default_context()
        with socket.create_connection((host, port), timeout=8) as sock:
            with context.wrap_socket(sock, server_hostname=host) as tls:
                cert = tls.getpeercert()
                add("INFO", "TLS", url, f"Negotiated {tls.version()} / {tls.cipher()[0]}; certificate subject={cert.get('subject', [])}")
                if tls.version() not in ("TLSv1.2", "TLSv1.3"):
                    add("MEDIUM", "TLS protocol", url, f"Unexpected negotiated protocol: {tls.version()}")
    except Exception as exc:
        add("HIGH", "TLS", url, f"TLS connection failed: {exc}")


def check_headers(session: requests.Session, url: str) -> None:
    try:
        response = request(session, "GET", url, headers={"User-Agent": USER_AGENT})
    except requests.RequestException as exc:
        add("ERROR", "HTTP reachability", url, str(exc))
        return

    add("INFO", "HTTP reachability", url, f"HTTP {response.status_code}")
    headers = {k.lower(): v for k, v in response.headers.items()}
    for key, label in SECURITY_HEADERS.items():
        value = headers.get(key)
        if value:
            add("INFO", f"Header: {label}", url, f"Present: {value[:400]}")
        else:
            severity = "MEDIUM" if key in ("strict-transport-security", "content-security-policy", "x-content-type-options") else "LOW"
            add(severity, f"Header: {label}", url, "Missing; assess whether it is applicable and configure at the edge/application.")

    if response.url.startswith("http://"):
        add("HIGH", "HTTPS redirect", url, f"Request ended at non-HTTPS URL: {response.url}")
    cache_control = headers.get("cache-control", "")
    if any(word in url.lower() for word in ("/account", "/settings", "/profile")) and "no-store" not in cache_control.lower():
        add("MEDIUM", "Sensitive page caching", url, f"Cache-Control does not include no-store: {cache_control or '(missing)'}")


def check_cors(session: requests.Session, url: str, allowed_origins: list[str]) -> None:
    test_origins = allowed_origins + ["https://cors-probe.invalid"]
    for origin in test_origins:
        try:
            response = request(
                session,
                "OPTIONS",
                url,
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "authorization,content-type",
                    "User-Agent": USER_AGENT,
                },
            )
            allow_origin = response.headers.get("Access-Control-Allow-Origin", "")
            allow_credentials = response.headers.get("Access-Control-Allow-Credentials", "")
            if origin.endswith(".invalid"):
                if allow_origin == "*" or allow_origin == origin:
                    add("HIGH", "CORS untrusted origin", url, f"Untrusted Origin was allowed: ACAO={allow_origin!r}, credentials={allow_credentials!r}")
                else:
                    add("INFO", "CORS untrusted origin", url, f"Untrusted Origin not allowed (HTTP {response.status_code}, ACAO={allow_origin or '(absent)'})")
            else:
                if allow_origin == origin or allow_origin == "*":
                    add("INFO", "CORS trusted origin", url, f"{origin} allowed (HTTP {response.status_code}); credentials={allow_credentials or '(absent)'}")
                else:
                    add("MEDIUM", "CORS trusted origin", url, f"{origin} not explicitly allowed (HTTP {response.status_code}, ACAO={allow_origin or '(absent)'})")
            if allow_origin == "*" and allow_credentials.lower() == "true":
                add("HIGH", "CORS wildcard with credentials", url, "Wildcard ACAO and credentials=true is an invalid/unsafe configuration.")
        except requests.RequestException as exc:
            add("MEDIUM", "CORS probe", url, f"Could not complete OPTIONS request: {exc}")


def check_exposed_paths(session: requests.Session, base_url: str) -> None:
    for path in COMMON_EXPOSED_PATHS:
        target = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
        try:
            response = request(session, "GET", target, headers={"User-Agent": USER_AGENT})
            # A 200 is only a signal; inspect content and confirm manually.
            if response.status_code == 200:
                sample = response.text[:180].replace("\n", " ")
                content_type = response.headers.get("Content-Type", "")
                if path in ("/.env", "/.git/HEAD", "/.git/config", "/.DS_Store", "/backup.zip", "/backup.sql", "/dump.sql", "/database.sql"):
                    add("HIGH", "Potential exposed sensitive file", target, f"HTTP 200; Content-Type={content_type}; sample={sample!r}")
                else:
                    add("INFO", "Common endpoint reachable", target, f"HTTP 200; Content-Type={content_type}; review whether public exposure is intended.")
            elif response.status_code in (401, 403, 404, 405):
                add("INFO", "Exposed-path check", target, f"Not publicly accessible (HTTP {response.status_code})")
            else:
                add("LOW", "Exposed-path check", target, f"Unexpected HTTP {response.status_code}")
        except requests.RequestException as exc:
            add("LOW", "Exposed-path check", target, f"Request failed: {exc}")


def check_methods(session: requests.Session, url: str) -> None:
    try:
        response = request(session, "OPTIONS", url, headers={"User-Agent": USER_AGENT})
        allow = response.headers.get("Allow", "")
        cors_methods = response.headers.get("Access-Control-Allow-Methods", "")
        add("INFO", "HTTP methods", url, f"OPTIONS HTTP {response.status_code}; Allow={allow or '(not supplied)'}; CORS methods={cors_methods or '(not supplied)'}")
        risky = [m for m in ("TRACE", "CONNECT") if m in (allow + "," + cors_methods).upper()]
        if risky:
            add("MEDIUM", "Potentially unnecessary HTTP methods", url, f"Advertised: {', '.join(risky)}")
    except requests.RequestException as exc:
        add("LOW", "HTTP methods", url, str(exc))


def check_error_disclosure(session: requests.Session, base_url: str) -> None:
    # A deliberately nonexistent, harmless route. No exploit payloads.
    target = urljoin(base_url.rstrip("/") + "/", "__security_assessment_nonexistent_route__")
    try:
        response = request(session, "GET", target, headers={"User-Agent": USER_AGENT})
        body = response.text[:5000].lower()
        markers = ["traceback (most recent call last)", "sqlalchemy", "psycopg", "asyncpg", "file \"/", "stack trace"]
        found = [m for m in markers if m in body]
        if found:
            add("MEDIUM", "Verbose error disclosure", target, f"Potential framework/stack details in response: {found}")
        else:
            add("INFO", "Verbose error disclosure", target, f"No common stack-trace markers found (HTTP {response.status_code}); this is not proof of safe error handling.")
    except requests.RequestException as exc:
        add("LOW", "Verbose error disclosure", target, str(exc))


def run_dependency_audits(frontend_dir: str | None, backend_dir: str | None) -> None:
    def run(cmd: list[str], cwd: str, label: str) -> None:
        if not Path(cwd).exists():
            add("LOW", label, cwd, "Directory not found; skipped.")
            return
        try:
            result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=180)
            output = (result.stdout + "\n" + result.stderr).strip()
            severity = "INFO" if result.returncode == 0 else "MEDIUM"
            add(severity, label, cwd, f"Exit code {result.returncode}. Output:\n{output[-3500:]}")
        except FileNotFoundError:
            add("LOW", label, cwd, f"Tool not installed: {cmd[0]}")
        except subprocess.TimeoutExpired:
            add("LOW", label, cwd, "Audit command timed out.")

    if frontend_dir:
        run(["npm", "audit", "--omit=dev", "--audit-level=moderate"], frontend_dir, "npm dependency audit")
    if backend_dir:
        run([sys.executable, "-m", "pip_audit"], backend_dir, "pip-audit dependency audit")


def safe_load_test(
    urls: list[str],
    users: int,
    duration: int,
    rps: float,
    scenario: str = "baseline",
    threshold: float = 0.05,
) -> dict[str, Any]:
    """
    Controlled GET-only scenarios: baseline, ramp, spike, soak, breakpoint, mixed.
    Hard caps: 20 workers, 5 global requests/second, 300 seconds.
    No authentication, writes, uploads, or destructive actions.
    """
    import threading

    users = max(1, min(users, 20))
    duration = max(5, min(duration, 300))
    rps = max(0.2, min(rps, 5.0))
    stop_at = time.monotonic() + duration
    started = time.monotonic()
    results: list[dict[str, Any]] = []
    submitted = 0
    stage_stats: list[dict[str, Any]] = []

    def one_get(url: str) -> dict[str, Any]:
        begin = time.perf_counter()
        try:
            response = requests.get(
                url, timeout=15,
                headers={"User-Agent": USER_AGENT},
                allow_redirects=True,
            )
            return {
                "url": url, "status": response.status_code,
                "ms": (time.perf_counter() - begin) * 1000,
                "bytes": len(response.content),
            }
        except requests.RequestException as exc:
            return {
                "url": url, "status": "ERROR",
                "ms": (time.perf_counter() - begin) * 1000,
                "error": str(exc),
            }

    def current_rate(elapsed: float) -> float:
        if scenario == "ramp":
            return max(0.2, rps * (0.2 + 0.8 * min(1.0, elapsed / duration)))
        if scenario == "spike":
            return rps * (0.2 if elapsed < min(5, duration * 0.15) else 1.0)
        if scenario == "breakpoint":
            step_duration = max(5, duration / 5)
            return min(rps, rps * (0.2 + 0.2 * int(elapsed / step_duration)))
        return rps

    def select_url(index: int) -> str:
        # Approximate browsing/search split for GET-only mixed workload.
        if scenario == "mixed" and len(urls) > 1:
            return urls[0] if index % 10 < 7 else urls[1]
        return urls[index % len(urls)]

    with concurrent.futures.ThreadPoolExecutor(max_workers=users) as pool:
        pending = set()
        next_submit = time.monotonic()
        stage_started = time.monotonic()
        stage_count = stage_errors = 0
        stage_latencies: list[float] = []
        stage_id = 0
        stop_early = False

        while (time.monotonic() < stop_at and not stop_early) or pending:
            now = time.monotonic()
            elapsed = now - started
            if now < stop_at and not stop_early and now >= next_submit:
                rate = max(0.2, current_rate(elapsed))
                pending.add(pool.submit(one_get, select_url(submitted)))
                submitted += 1
                next_submit = now + 1.0 / rate

            done = {f for f in pending if f.done()}
            for future in done:
                pending.remove(future)
                item = future.result()
                results.append(item)
                stage_count += 1
                if item["status"] == "ERROR" or (
                    isinstance(item["status"], int) and item["status"] >= 500
                ):
                    stage_errors += 1
                stage_latencies.append(float(item.get("ms", 0)))

            if scenario == "breakpoint" and now - stage_started >= 10:
                rate = stage_errors / max(1, stage_count)
                stage_stats.append({
                    "stage": stage_id,
                    "requests": stage_count,
                    "error_rate": round(rate, 4),
                    "mean_latency_ms": round(sum(stage_latencies) / len(stage_latencies), 2) if stage_latencies else None,
                })
                if stage_count >= 5 and rate > threshold:
                    stop_early = True
                stage_id += 1
                stage_started = now
                stage_count = stage_errors = 0
                stage_latencies = []

            if now >= stop_at and not pending:
                break
            time.sleep(0.005)

    latencies = sorted(float(x["ms"]) for x in results if isinstance(x.get("ms"), (int, float)))
    status_counts: dict[str, int] = {}
    for item in results:
        key = str(item.get("status"))
        status_counts[key] = status_counts.get(key, 0) + 1
    errors = sum(1 for x in results if x.get("status") == "ERROR" or (
        isinstance(x.get("status"), int) and x["status"] >= 500
    ))

    def pct(value: float) -> float | None:
        if not latencies:
            return None
        return round(latencies[min(len(latencies)-1, round((value / 100) * (len(latencies)-1)))], 2)

    return {
        "scenario": scenario,
        "duration_seconds": duration,
        "workers_max": users,
        "global_rps_max": rps,
        "requests_submitted": submitted,
        "requests_completed": len(results),
        "status_counts": status_counts,
        "error_rate": round(errors / max(1, len(results)), 4),
        "latency_ms": {
            "min": round(latencies[0], 2) if latencies else None,
            "median": pct(50), "p95": pct(95), "p99": pct(99),
            "max": round(latencies[-1], 2) if latencies else None,
        },
        "breakpoint_stages": stage_stats,
        "errors_sample": [x for x in results if x.get("status") == "ERROR"][:20],
        "note": "GET-only low-rate approximation, not a distributed capacity test or full validation of stateful user journeys.",
    }


def print_report(targets: list[str], output: str | None, load_result: dict[str, Any] | None) -> None:
    print("\n=== MO UDEL AI SECURITY ASSESSMENT ===")
    print(f"Generated: {datetime.now(timezone.utc).isoformat()}")
    print(f"Python: {platform.python_version()} | OS: {platform.platform()}")
    print(f"Targets: {', '.join(targets)}")
    counts: dict[str, int] = {}
    for finding in FINDINGS:
        counts[finding.severity] = counts.get(finding.severity, 0) + 1
    print("\nFinding counts:", json.dumps(counts, sort_keys=True))
    for finding in FINDINGS:
        print(f"\n[{finding.severity}] {finding.check} - {finding.target}")
        print(f"  {finding.result}")
        if finding.evidence:
            print(f"  Evidence: {finding.evidence}")

    report: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "targets": targets,
        "findings": [asdict(f) for f in FINDINGS],
        "manual_tests_required": MANUAL_TESTS,
        "load_test": load_result,
        "limitations": [
            "A clean result does not mean the application is secure.",
            "This script does not exploit authorization, injection, SSRF, file upload, race conditions or authentication workflows.",
            "Only run active tests against assets you own or are explicitly authorized to assess.",
        ],
    }
    if output:
        Path(output).write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nJSON report written to: {output}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Safe Moudel AI security and GET-load assessment.")
    parser.add_argument("--web", default=DEFAULT_BASE, help=f"Frontend base URL (default: {DEFAULT_BASE})")
    parser.add_argument("--api", default=DEFAULT_API, help=f"API base URL (default: {DEFAULT_API})")
    parser.add_argument("--allowed-origin", action="append", default=[], help="Expected trusted CORS origin; repeat as needed.")
    parser.add_argument("--skip-paths", action="store_true", help="Skip common exposed-path checks.")
    parser.add_argument("--frontend-dir", help="Frontend directory; runs npm audit --omit=dev.")
    parser.add_argument("--backend-dir", help="Backend directory; runs pip-audit (install pip-audit first).")
    parser.add_argument("--load", action="store_true", help="Run a controlled GET-only load scenario.")
    parser.add_argument("--scenario", choices=["baseline", "ramp", "spike", "soak", "breakpoint", "mixed"], default="baseline", help="GET-only load profile.")
    parser.add_argument("--load-url", action="append", default=[], help="Exact GET URL for load test; repeat. Must be yours/authorized.")
    parser.add_argument("--workers", type=int, default=5, help="Load-test workers, capped at 20.")
    parser.add_argument("--duration", type=int, default=30, help="Load duration seconds, capped at 300.")
    parser.add_argument("--rps", type=float, default=1.0, help="Global requests/second, capped at 5.")
    parser.add_argument("--error-threshold", type=float, default=0.05, help="Breakpoint stop threshold (default 5 percent).")
    parser.add_argument("--output", default="security-report.json", help="JSON report output path.")
    args = parser.parse_args()

    targets = [args.web.rstrip("/"), args.api.rstrip("/")]
    allowed = args.allowed_origin or [normalized_origin(args.web)]
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    for target in targets:
        check_tls(target)
        check_headers(session, target)
        check_methods(session, target)

    # Probe the API root and a known public read-only search route.
    search_url = args.api.rstrip("/") + "/api/v1/search/papers?page=1&limit=1"
    check_cors(session, search_url, allowed)
    check_error_disclosure(session, args.api)

    if not args.skip_paths:
        check_exposed_paths(session, args.web)

    if args.frontend_dir or args.backend_dir:
        run_dependency_audits(args.frontend_dir, args.backend_dir)

    load_result = None
    if args.load:
        load_urls = args.load_url or [search_url, args.web.rstrip("/") + "/"]
        for url in load_urls:
            parsed = urlparse(url)
            # Plain HTTP is permitted only for loopback development targets.
            # Non-local targets must use HTTPS.
            is_loopback = parsed.hostname in {"localhost", "127.0.0.1", "::1"}
            if parsed.scheme != "https" and not (parsed.scheme == "http" and is_loopback):
                parser.error(f"Load-test URL must use HTTPS unless it targets localhost/loopback: {url}")
            if parsed.hostname not in {urlparse(args.web).hostname, urlparse(args.api).hostname}:
                parser.error(f"Load-test URL host must match --web or --api host: {url}")
        print("\nStarting conservative GET-only load test...")
        print(f"Scenario={args.scenario}; URLs={load_urls}; workers={args.workers}; duration={args.duration}s; global RPS={args.rps}")
        load_result = safe_load_test(
            load_urls, args.workers, args.duration, args.rps,
            scenario=args.scenario,
            threshold=max(0.01, min(args.error_threshold, 0.5)),
        )

    print_report(targets, args.output, load_result)
    print("\nManual coverage checklist:")
    for category, tasks in MANUAL_TESTS.items():
        print(f"\n{category}")
        for task in tasks:
            print(f"  - {task}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
