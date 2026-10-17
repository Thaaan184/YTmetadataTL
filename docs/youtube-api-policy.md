# YouTube Data API v3 Integration Policy & Quota Specification

> **Specification ID:** YT-API-POLICY  
> **Last Updated:** October 17, 2026  
> **Applicable Phase:** Phase 6 (Official YouTube API Integration)

---

## 1. Endpoints & Scopes

### 1.1 Scope Definition
- `https://www.googleapis.com/auth/youtube.force-ssl`
  - Required for:
    - Managing captions (`captions.list`, `captions.insert`, `captions.update`).
    - Updating localized video metadata (`videos.list`, `videos.update`).
- Least privilege justification: YouTube Data API v3 does not offer a separate fine-grained scope for captions only and localizations only without `youtube.force-ssl`.

### 1.2 Official Endpoints Used
| Operation | Method | Endpoint | Quota Cost | Purpose |
|---|---|---|:---:|---|
| Fetch Video Metadata | GET | `https://www.googleapis.com/youtube/v3/videos?part=snippet,localizations&id={id}` | 1 unit | Read original title, description, category, and existing localizations. |
| Update Localized Metadata | PUT | `https://www.googleapis.com/youtube/v3/videos?part=snippet,localizations` | 50 units | Write translated title and description into `localizations[targetLocale]`. |
| List Captions | GET | `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId={id}` | 50 units | Check if target language caption track already exists. |
| Upload / Insert Caption Track | POST | `https://www.googleapis.com/upload/youtube/v3/captions?part=snippet&uploadType=multipart` | 400 units | Upload translated `.srt` or `.vtt` file directly to video track. |
| Update Caption Track | PUT | `https://www.googleapis.com/upload/youtube/v3/captions?part=snippet&uploadType=multipart` | 450 units | Replace existing subtitle track content. |

---

## 2. Quota Management & Warnings

- **Default Daily Quota:** 10,000 units per Google Cloud Project.
- **Estimated Costs Per Localization:**
  - 1 Metadata Localization: 51 units (1 read + 50 write).
  - 1 Subtitle Upload: 450 units (50 list + 400 insert).
  - 10 Subtitle Languages: ~4,500 units (45% of daily default quota).
- **Client Safeguard:**
  - UI displays estimated quota usage prior to firing requests.
  - UI surfaces `403 quotaExceeded` error distinctly and recommends manual export fallback.

---

## 3. Read-Modify-Write Safety Rules

1. **Non-Destructive Metadata Update:**
   - Always fetch `videos.list(part='snippet,localizations')` first.
   - Retain `snippet.title`, `snippet.description`, `snippet.categoryId`, `snippet.tags`, and all existing entries in `localizations`.
   - Mutate only `localizations[targetLocale] = { title, description }`.
2. **Explicit Confirmation Gate:**
   - Never write to YouTube without displaying a preview diff to the user.
   - User must click "Publish to YouTube" button.

---

## 4. Credential & Token Protection

- Client Secret is **never** required (uses OAuth 2.0 PKCE / Implicit flow with Chrome redirect URL).
- Access tokens are stored exclusively in memory (`sessionStorage` or volatile in-memory variable).
- Redaction utilities strip `Authorization: Bearer ...` and access tokens from network logs and UI error banners.
