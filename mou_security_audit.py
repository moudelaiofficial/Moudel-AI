#!/usr/bin/env python3
"""
Moudel AI - consolidated authorized security screening
Python 3.10+
Install: pip install aiohttp
Run:     python mou_security_audit.py --own-target

This is a defensive screening tool, NOT a full penetration test or OWASP
certification. Run only against systems you own or are authorized to test.
Defaults are deliberately bounded and non-destructive. Load testing is opt-in.
"""
import argparse
import asyncio
import json
import os
import random
import re
import statistics
import string
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import aiohttp

SECURITY_HEADERS = {
    "strict-transport-security": ("HSTS", "Configure HSTS only after HTTPS is working in production."),
    "content-security-policy": ("CSP", "Define a CSP matching the deployed frontend; begin in Report-Only mode."),
    "x-content-type-options": ("X-Content-Type-Options", "Set X-Content-Type-Options: nosniff."),
    "referrer-policy": ("Referrer-Policy", "Set a restrictive Referrer-Policy, e.g. strict-origin-when-cross-origin."),
    "permissions-policy": ("Permissions-Policy", "Disable browser features the application does not use."),
}
COMMON_PATHS = [
    "/openapi.json", "/docs", "/redoc", "/health", "/health/live",
    "/health/ready", "/.env", "/.git/config", "/debug", "/metrics", "/admin",
]
SQL_ERROR_RE = re.compile(
    r"sql syntax|sqlite error|postgresql.*error|psycopg|mysql.*syntax|"
    r"sqlalchemy.*exception|unterminated quoted string|syntax error at or near", re.I
)
SENSITIVE_MARKERS = ("-----BEGIN", "DATABASE_URL=", "SUPABASE_SERVICE_ROLE", "SECRET_KEY=")


class Audit:
    def __init__(self, args):
        self.a = args
        self.base = args.base_url.rstrip("/") + "/"
        parsed = urlparse(self.base)
        self.origin = f"{parsed.scheme}://{parsed.netloc}"
        self.findings = []
        self.results = []
        self.sem = asyncio.Semaphore(args.max_connections)
        self.timeout = aiohttp.ClientTimeout(total=args.timeout)
        self.started = datetime.now(timezone.utc).isoformat()

    def url(self, path=""):
        return urljoin(self.base, path.lstrip("/"))

    def add(self, category, severity, title, detail, recommendation, evidence=""):
        self.findings.append({
            "category": category, "severity": severity, "title": title,
            "detail": detail, "recommendation": recommendation,
            "evidence": str(evidence)[:400]
        })
        print(f"[{severity}] {title}: {detail}")

    async def request(self, session, method, url, **kwargs):
        async with self.sem:
            start = time.perf_counter()
            try:
                async with session.request(method, url, allow_redirects=False, **kwargs) as r:
                    body = await r.text(errors="replace")
                    return r.status, {k.lower(): v for k, v in r.headers.items()}, body, (time.perf_counter()-start)*1000
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                return 0, {}, str(exc), (time.perf_counter()-start)*1000

    async def check_baseline(self, s):
        print("\n== 1. HTTPS, response headers and cookies ==")
        status, headers, _, _ = await self.request(s, "GET", self.base)
        self.results.append({"test": "baseline", "http_status": status})
        if status == 0:
            self.add("A05/A09", "HIGH", "Target unreachable", headers,
                     "Start the API and verify --base-url.")
            return False

        parsed = urlparse(self.base)
        if parsed.scheme != "https" and parsed.hostname not in ("localhost", "127.0.0.1", "::1"):
            self.add("A02", "HIGH", "HTTPS not enabled", "Non-local target uses HTTP.",
                     "Deploy behind HTTPS and redirect HTTP to HTTPS.")

        for key, (label, advice) in SECURITY_HEADERS.items():
            if key not in headers:
                # HSTS is expected only on HTTPS; local HTTP is intentionally exempt.
                if key == "strict-transport-security" and parsed.scheme != "https":
                    self.results.append({"test": "header:HSTS", "status": "SKIPPED",
                                         "reason": "Target is HTTP; verify on HTTPS production host."})
                else:
                    self.add("A05", "LOW", f"Missing {label}", f"No {key} response header.", advice)
            else:
                self.results.append({"test": f"header:{label}", "status": "PRESENT"})

        if "server" in headers or "x-powered-by" in headers:
            self.add("A05", "INFO", "Server technology disclosure",
                     f"Server={headers.get('server','')}; X-Powered-By={headers.get('x-powered-by','')}",
                     "Remove unnecessary framework/version disclosure where practical.")

        cookie = headers.get("set-cookie", "").lower()
        if cookie:
            for flag in ("httponly", "secure", "samesite"):
                if flag not in cookie:
                    self.add("A07", "LOW" if flag == "samesite" else "MEDIUM",
                             f"Cookie missing {flag}", "Set-Cookie lacks this attribute.",
                             f"Set the {flag} attribute where appropriate.")
        return True

    async def check_cors(self, s):
        print("\n== 2. CORS policy ==")
        evil = "https://moudel-audit-invalid.example"
        status, h, _, _ = await self.request(
            s, "OPTIONS", self.base,
            headers={"Origin": evil, "Access-Control-Request-Method": "GET",
                     "Access-Control-Request-Headers": "authorization,content-type"}
        )
        origin = h.get("access-control-allow-origin", "")
        creds = h.get("access-control-allow-credentials", "").lower()
        if origin == evil:
            self.add("A05", "HIGH", "Untrusted CORS origin reflected",
                     f"Untrusted origin accepted (HTTP {status}).",
                     "Allow only exact trusted frontend origins.")
        elif origin == "*" and creds == "true":
            self.add("A05", "HIGH", "Wildcard CORS with credentials",
                     "Wildcard origin and credentials were both observed.",
                     "Use an explicit origin allowlist.")
        else:
            self.results.append({"test": "cors_untrusted_origin", "status": "NO_REFLECTION_OBSERVED",
                                 "http_status": status, "allow_origin": origin or None})

    async def check_paths(self, s):
        print("\n== 3. Common exposed paths ==")
        for path in COMMON_PATHS:
            status, _, body, _ = await self.request(s, "GET", self.url(path))
            if status in (200, 206):
                if path in ("/.env", "/.git/config"):
                    secret_hint = any(x in body for x in SENSITIVE_MARKERS)
                    self.add("A01/A05", "CRITICAL" if secret_hint else "HIGH",
                             "Potential sensitive file exposure",
                             f"{path} returned HTTP {status}; secret marker={secret_hint}.",
                             "Block dotfiles/config paths; rotate any exposed credentials.", body[:150])
                elif path in ("/docs", "/redoc", "/openapi.json", "/metrics", "/debug", "/admin"):
                    self.add("A05", "INFO", "Operational endpoint reachable",
                             f"{path} returned HTTP {status}.",
                             "Decide whether this endpoint should be public; restrict internal endpoints.")
            self.results.append({"test": f"path:{path}", "http_status": status})

    async def check_auth(self, s):
        print("\n== 4. Unauthenticated protected-route screening ==")
        paths = [p.strip() for p in self.a.protected_paths.split(",") if p.strip()]
        for path in paths:
            status, _, body, _ = await self.request(s, "GET", self.url(path),
                                                     headers={"Authorization": ""})
            self.results.append({"test": f"unauthenticated:{path}", "http_status": status})
            if status in (200, 206):
                self.add("A01/A07", "MEDIUM", "Protected route returned success without token",
                         f"{path} returned HTTP {status}.",
                         "Confirm the route is meant to be private and enforce authentication/ownership.")
        if not paths:
            self.results.append({"test": "unauthenticated_routes", "status": "SKIPPED",
                                 "reason": "No protected paths configured."})

    async def check_injection(self, s):
        print("\n== 5. Low-impact search SQLi and reflected-XSS probes ==")
        if not self.a.search_path:
            self.results.append({"test": "sqli_xss", "status": "SKIPPED",
                                 "reason": "Set --search-path and --search-param to the actual read-only search route."})
            return
        param = self.a.search_param
        for payload in ["'", '"', "')", "' OR '1'='1"]:
            status, _, body, _ = await self.request(
                s, "GET", self.url(self.a.search_path), params={param: payload}
            )
            match = SQL_ERROR_RE.search(body)
            if match:
                self.add("A03", "HIGH", "Database error disclosure candidate",
                         f"Quote probe returned HTTP {status} and SQL-like error text.",
                         "Use parameterized queries and generic client-facing errors.", match.group(0))
        marker = "moudelxss" + "".join(random.choice(string.ascii_lowercase) for _ in range(8))
        probe = marker + "<script>alert(1)</script>"
        status, _, body, _ = await self.request(
            s, "GET", self.url(self.a.search_path), params={param: probe}
        )
        if probe in body:
            self.add("A03", "MEDIUM", "Reflected XSS candidate",
                     f"Unique HTML probe reflected verbatim (HTTP {status}).",
                     "Contextually encode output and avoid unsafe HTML rendering.", probe)
        else:
            self.results.append({"test": "reflected_xss_probe", "status": "NO_VERBATIM_REFLECTION",
                                 "http_status": status})

    async def check_idor(self, s):
        print("\n== 6. Two-account IDOR/BOLA read-only test ==")
        a = self.a
        if not all([a.token_a, a.token_b, a.idor_path_a, a.idor_path_b]):
            self.results.append({"test": "two_account_idor", "status": "SKIPPED",
                                 "reason": "Set MOUDEL_TEST_TOKEN_A/B and MOUDEL_IDOR_PATH_A/B environment variables."})
            print("Skipped: two test-account tokens and their harmless resource paths are required.")
            return
        for label, token, path in [
            ("account_B_reads_account_A_resource", a.token_b, a.idor_path_a),
            ("account_A_reads_account_B_resource", a.token_a, a.idor_path_b),
        ]:
            status, _, body, _ = await self.request(
                s, "GET", self.url(path), headers={"Authorization": f"Bearer {token}"}
            )
            self.results.append({"test": label, "http_status": status, "response_bytes": len(body)})
            if status in (200, 206):
                self.add("A01", "HIGH", "Possible cross-account IDOR/BOLA",
                         f"{label} returned HTTP {status}; response body intentionally omitted.",
                         "Verify ownership checks for every object read, update and delete.")

    async def check_rate_limit(self, s):
        print("\n== 7. Gentle rate-limit screening ==")
        if not self.a.rate_path:
            self.results.append({"test": "rate_limit", "status": "SKIPPED",
                                 "reason": "Set --rate-path to a safe GET endpoint."})
            return
        statuses = []
        for _ in range(min(self.a.rate_requests, 30)):
            status, _, _, _ = await self.request(s, "GET", self.url(self.a.rate_path))
            statuses.append(status)
            if status == 429:
                self.results.append({"test": "rate_limit", "status": "429_OBSERVED",
                                     "requests_until_429": len(statuses)})
                return
            await asyncio.sleep(0.1)
        self.results.append({"test": "rate_limit", "status": "NO_429_IN_GENTLE_PROBE",
                             "requests_sent": len(statuses), "http_statuses": dict(Counter(statuses))})
        self.add("A04", "INFO", "No rate limit observed in gentle probe",
                 f"{len(statuses)} sequential requests did not receive HTTP 429; this does not prove rate limiting is absent.",
                 "Verify configured limits independently, especially login, reset, search and expensive routes.")

    async def check_load(self, s):
        if not self.a.load_test:
            self.results.append({"test": "bounded_load_test", "status": "SKIPPED",
                                 "reason": "Opt in with --load-test; do not run on production without approval."})
            return
        print("\n== 8. Bounded concurrency test ==")
        workers = min(max(1, self.a.concurrency), 20)
        seconds = min(max(5, self.a.duration), 30)
        stop = time.monotonic() + seconds
        latencies, codes = [], Counter()

        async def worker():
            while time.monotonic() < stop:
                status, _, _, ms = await self.request(s, "GET", self.url(self.a.load_path))
                codes[status] += 1
                if status:
                    latencies.append(ms)
                await asyncio.sleep(0.02)

        await asyncio.gather(*(worker() for _ in range(workers)))
        ordered = sorted(latencies)
        load = {
            "path": self.a.load_path, "workers": workers, "duration_seconds": seconds,
            "requests": sum(codes.values()),
            "requests_per_second": round(sum(codes.values()) / seconds, 2),
            "status_counts": dict(codes),
            "latency_ms": {
                "median": round(statistics.median(ordered), 2) if ordered else None,
                "p95": round(ordered[int(.95 * (len(ordered)-1))], 2) if ordered else None,
                "max": round(max(ordered), 2) if ordered else None,
            },
        }
        self.results.append({"test": "bounded_load_test", "result": load})
        failures = sum(v for k, v in codes.items() if k == 0 or k >= 500)
        if failures:
            self.add("A04", "MEDIUM", "Errors under concurrency",
                     f"{failures} network/5xx responses at {workers} workers.",
                     "Inspect application logs, DB pool size, upstream timeouts and resource usage.")

    async def run(self):
        headers = {"User-Agent": "MoudelAI-Authorized-Security-Screen/2.0", "Accept": "*/*"}
        if self.a.token:
            headers["Authorization"] = f"Bearer {self.a.token}"
        connector = aiohttp.TCPConnector(limit=self.a.max_connections)
        async with aiohttp.ClientSession(timeout=self.timeout, connector=connector,
                                         headers=headers) as session:
            reachable = await self.check_baseline(session)
            if reachable:
                await self.check_cors(session)
                await self.check_paths(session)
                await self.check_auth(session)
                await self.check_injection(session)
                await self.check_idor(session)
                await self.check_rate_limit(session)
                await self.check_load(session)

        counts = Counter(f["severity"] for f in self.findings)
        report = {
            "tool": "Moudel AI consolidated authorized security screening",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "target": self.origin,
            "scope": "Automated, non-destructive screening only. Not a full OWASP Top 10 audit, penetration test, or certification.",
            "limitations": [
                "No automated scanner can prove absence of vulnerabilities.",
                "IDOR test requires two isolated test accounts and user-owned resource paths.",
                "SQLi/XSS checks are low-impact indicators, not exploit validation.",
                "Load test measures only the selected endpoint and does not establish maximum concurrent users.",
                "CSRF, SSRF, stored XSS, business-logic flaws, dependency scanning, secret-history scanning and full RLS testing require separate validation."
            ],
            "findings": self.findings,
            "additional_results": self.results,
            "severity_counts": {k: counts.get(k, 0) for k in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO")},
            "tests_executed": len(self.results),
        }
        out = Path(self.a.report).resolve()
        out.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nJSON report saved: {out}")
        print("Severity counts:", json.dumps(report["severity_counts"]))
        print("Review SKIPPED checks and manually validate every finding.")


def parse_args():
    p = argparse.ArgumentParser(description="Moudel AI authorized security screening")
    p.add_argument("--base-url", default="http://127.0.0.1:8000")
    p.add_argument("--own-target", action="store_true", help="Confirm you own or are authorized to test this target.")
    p.add_argument("--report", default="moudel_security_report.json")
    p.add_argument("--timeout", type=float, default=8)
    p.add_argument("--max-connections", type=int, default=10)
    p.add_argument("--token", default=os.getenv("MOUDEL_TEST_TOKEN", ""))
    p.add_argument("--protected-paths", default="/api/v1/collections,/api/v1/library")
    p.add_argument("--search-path", default="/api/v1/search/papers",
                   help="Actual read-only search endpoint; set empty string to skip.")
    p.add_argument("--search-param", default="query",
                   help="Must match the actual FastAPI query parameter name.")
    p.add_argument("--rate-path", default="/health/live",
                   help="Safe GET route; choose an endpoint where rate limiting is expected.")
    p.add_argument("--rate-requests", type=int, default=15)
    p.add_argument("--load-test", action="store_true")
    p.add_argument("--load-path", default="/health/live")
    p.add_argument("--concurrency", type=int, default=5)
    p.add_argument("--duration", type=int, default=10)
    p.add_argument("--token-a", default=os.getenv("MOUDEL_TEST_TOKEN_A", ""))
    p.add_argument("--token-b", default=os.getenv("MOUDEL_TEST_TOKEN_B", ""))
    p.add_argument("--idor-path-a", default=os.getenv("MOUDEL_IDOR_PATH_A", ""))
    p.add_argument("--idor-path-b", default=os.getenv("MOUDEL_IDOR_PATH_B", ""))
    a = p.parse_args()
    if not a.own_target:
        p.error("Refusing to run without --own-target.")
    u = urlparse(a.base_url)
    if u.scheme not in ("http", "https") or not u.netloc:
        p.error("Invalid --base-url.")
    if not 1 <= a.max_connections <= 20:
        p.error("--max-connections must be 1..20.")
    if a.rate_requests < 1:
        p.error("--rate-requests must be positive.")
    return a


if __name__ == "__main__":
    try:
        asyncio.run(Audit(parse_args()).run())
    except KeyboardInterrupt:
        print("\nStopped by user.")
