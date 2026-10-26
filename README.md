# Cinematic Birthday Surprise

A lightweight, password-protected birthday experience for Cloudflare Pages. The public site contains only the countdown, visuals, and UI. The private letter is returned by a Pages Function only after the server-side reveal time and password checks succeed.

## Files

- `index.html`, `styles.css`, `script.js` — public experience.
- `assets/photos/` — safe SVG placeholders for three Polaroids.
- `functions/api/unlock.js` — Cloudflare Pages Function for reveal checks, password validation, a short-lived HttpOnly session cookie, and optional KV rate limiting/letter storage.

## Required Cloudflare setup

1. In Cloudflare, create a Pages project connected to this repository. Use the `main` branch, leave the build command empty, and use the repository root (`.`) as the output directory.
2. In **Settings → Variables and Secrets**, add an encrypted secret named `BIRTHDAY_PASSWORD`. Never commit its value or put it in frontend files.
3. Create a KV namespace, for example `birthday-surprise-letters`.
4. Add a Pages KV binding named `BIRTHDAY_KV` pointing to that namespace. The binding name must match the JavaScript exactly.
5. Deploy once, then add the private letter to KV under the key `birthday-letter`. The value must be JSON like:

```json
{"heading":"[Your heading]","recipient":"[Recipient name]","body":"Paragraph one.\n\nParagraph two.","signoff":"[Your sign-off]"}
```

Use the Cloudflare dashboard KV value editor or Wrangler. Do not put this JSON in the repository. If the letter contains quotes, escape them as valid JSON. A plain text value also works, but will use default metadata.

The Function can operate without KV for password checks, but KV is required for the private letter and recommended for rate limiting.

## Photos

Replace `assets/photos/photo-1.svg`, `photo-2.svg`, and `photo-3.svg` with your own JPG, PNG, or WebP files. If you change the filenames, update the three `img src` values in `index.html`. Keep the images tasteful and avoid placing private letter text in public assets.

## Reveal time

The production timestamp is intentionally duplicated in `script.js` (public countdown) and `functions/api/unlock.js` (authoritative server check):

`2026-10-28T00:01:00+05:30`

If you change it, update both locations. The Function uses its own server clock; changing the browser clock cannot unlock the letter early. The browser timestamp is only for display and does not provide authorization.

## Safe testing before the birthday

Use a Cloudflare Pages Preview deployment or a separate test branch/KV namespace. Temporarily change the timestamp in **both** files to a time a few minutes in the future, set a test `BIRTHDAY_PASSWORD` in the Preview environment, and add only non-sensitive test letter JSON to the Preview KV namespace. Test the countdown, invalid password, valid password, envelope, and letter request. Then restore the production timestamp in both files and redeploy production. Do not test by placing the real letter or password in source code.

To verify early protection, inspect the browser Network panel: before the reveal, `/api/unlock` must return an error and must never return the letter body. A user can view public HTML/CSS/JS, so privacy depends on keeping the letter and password in Cloudflare configuration rather than the repository.

## Accessibility and behavior

The page uses semantic headings, labelled controls, an `aria-live` countdown/status, keyboard-operable buttons, visible focus through native controls, responsive layouts, and `prefers-reduced-motion` rules. The reveal works for an already-open tab because the countdown is checked every second, and for later visitors because the server evaluates the current time on every protected request.

## Troubleshooting

- **Function 404:** confirm the file is exactly `functions/api/unlock.js`, Pages Functions are enabled for the project, and the deployment completed.
- **Site says not configured:** add the encrypted `BIRTHDAY_PASSWORD` to the correct Production or Preview environment and redeploy.
- **Letter unavailable:** confirm the KV binding is named `BIRTHDAY_KV`, the key is exactly `birthday-letter`, and the value is valid JSON.
- **Password works but letter does not:** clear the site cookie, confirm HTTPS is enabled, and check that the request is sent to `/api/unlock` on the same Pages domain.
- **Photos missing:** check case-sensitive filenames and paths under `assets/photos/`.
- **Countdown differs slightly:** the client estimates server offset from the status endpoint; the Function remains authoritative for access.

## Manual actions still required

You must provide the real photos, create the Cloudflare Pages project, create/bind KV, set the encrypted password secret, and enter the real letter in KV. None of those private values are included here.
