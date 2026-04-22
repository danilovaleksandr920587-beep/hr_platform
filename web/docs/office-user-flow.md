# Office User Flow

## Happy Path

1. User opens `"/"` and navigates to `"/login"` or `"/office"`.
2. User signs in or signs up on `"/login"`.
3. Server sets auth cookie and user is redirected to `next` (default `"/office"`).
4. User sees personal dashboard with:
   - resume status,
   - salary hints,
   - saved vacancies count,
   - saved knowledge articles count.
5. User saves vacancies/articles from their detail pages.
6. Returning to `"/office"` shows synchronized saved counters.

## Error Paths

- Invalid credentials -> login page shows explicit error.
- Missing/expired session -> middleware redirects `"/office*"` to `"/login?next=/office"`.
- Password reset requested -> user is guided to token flow.
- Invalid/expired reset token -> reset page shows actionable error and retry hint.
- Slow auth response -> login form exposes timeout/fallback instead of indefinite loading.
