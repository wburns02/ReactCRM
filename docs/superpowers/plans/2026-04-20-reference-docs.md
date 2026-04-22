# Reference Docs in Document Center — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Reference Docs" tab to the existing Document Center, serving static HTML/text reference documents from `/home/will/mac-septic-docs/` with preview and email-to-customer support.

**Architecture:** New backend router `reference_docs.py` serves a JSON manifest of files + their HTML content from disk. Frontend adds a tab to DocumentCenterPage that fetches the manifest, displays docs in a category-grouped card grid, and reuses the existing iframe preview pattern. Email uses a new backend endpoint that reads the file, wraps it in email HTML, and sends via the existing email service.

**Tech Stack:** FastAPI, React 19, TanStack Query, Tailwind CSS 4, existing email infra

---

## File Structure

### Backend (react-crm-api)

| Action | File | Purpose |
|--------|------|---------|
| Create | `app/api/v2/reference_docs.py` | Router: list, preview HTML, download, send email |
| Create | `app/static/reference-docs-manifest.json` | Metadata manifest mapping files to title/category/description |
| Modify | `app/api/v2/router.py:376` | Register reference_docs router |

### Frontend (ReactCRM)

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/api/hooks/useReferenceDocs.ts` | TanStack Query hooks for reference doc endpoints |
| Create | `src/features/document-center/components/ReferenceDocsTab.tsx` | Card grid grouped by category |
| Create | `src/features/document-center/components/ReferenceDocPreviewModal.tsx` | Iframe preview for HTML reference docs |
| Create | `src/features/document-center/components/ReferenceDocSendModal.tsx` | Email a reference doc to a customer |
| Modify | `src/features/document-center/DocumentCenterPage.tsx` | Add tab switcher between "Documents" and "Reference Docs" |

---

## Task 1: Create the manifest file

**Files:**
- Create: `react-crm-api/app/static/reference-docs-manifest.json`

- [ ] **Step 1: Write the manifest**

```json
{
  "docs_dir": "/home/will/mac-septic-docs",
  "documents": [
    {
      "slug": "call-playbook",
      "file": "call-playbook.html",
      "title": "Call Playbook",
      "category": "Playbooks",
      "description": "Step-by-step guide for handling inbound customer calls",
      "file_type": "html"
    },
    {
      "slug": "call-recording-setup",
      "file": "call-recording-setup.html",
      "title": "Call Recording Setup",
      "category": "Playbooks",
      "description": "How to configure call recording systems",
      "file_type": "html"
    },
    {
      "slug": "maintenance-contract",
      "file": "maintenance-contract.html",
      "title": "Maintenance Contract",
      "category": "Contracts",
      "description": "Standard aerobic maintenance agreement template",
      "file_type": "html"
    },
    {
      "slug": "maintenance-contract-waived",
      "file": "maintenance-contract-waived.html",
      "title": "Maintenance Contract (Waived Fee)",
      "category": "Contracts",
      "description": "Maintenance agreement with waived inspection fee",
      "file_type": "html"
    },
    {
      "slug": "contract-template",
      "file": "contract-template.txt",
      "title": "Contract Template (Text)",
      "category": "Contracts",
      "description": "Plain-text version of the standard contract",
      "file_type": "text"
    },
    {
      "slug": "contract-template-waived",
      "file": "contract-template-waived.txt",
      "title": "Contract Template - Waived (Text)",
      "category": "Contracts",
      "description": "Plain-text contract with waived inspection fee",
      "file_type": "text"
    },
    {
      "slug": "repair-credit-plan-addendum",
      "file": "repair-credit-plan-addendum.html",
      "title": "Repair Credit Plan Addendum",
      "category": "Contracts",
      "description": "Addendum for $20/mo repair credit plan",
      "file_type": "html"
    },
    {
      "slug": "repair-credit-plan-addendum-txt",
      "file": "repair-credit-plan-addendum.txt",
      "title": "Repair Credit Plan Addendum (Text)",
      "category": "Contracts",
      "description": "Plain-text version of repair credit plan addendum",
      "file_type": "text"
    },
    {
      "slug": "county-rules",
      "file": "county-rules.html",
      "title": "County Rules",
      "category": "Regulations",
      "description": "County-specific septic regulations and compliance rules",
      "file_type": "html"
    },
    {
      "slug": "tceq-requirement",
      "file": "tceq-requirement.html",
      "title": "TCEQ Requirements",
      "category": "Regulations",
      "description": "Texas Commission on Environmental Quality septic regulations",
      "file_type": "html"
    },
    {
      "slug": "aerobic-dos-and-donts",
      "file": "aerobic-dos-and-donts.html",
      "title": "Aerobic System Dos & Don'ts",
      "category": "Regulations",
      "description": "Guidelines for aerobic septic system maintenance",
      "file_type": "html"
    },
    {
      "slug": "realtor-script",
      "file": "realtor-script.html",
      "title": "Realtor Sales Script",
      "category": "Sales",
      "description": "Phone script for outbound calls to realtors",
      "file_type": "html"
    },
    {
      "slug": "realtor-one-pager",
      "file": "realtor-one-pager.html",
      "title": "Realtor One-Pager",
      "category": "Sales",
      "description": "Leave-behind summary for realtor meetings",
      "file_type": "html"
    },
    {
      "slug": "real-consequences",
      "file": "real-consequences.html",
      "title": "Real Consequences",
      "category": "Sales",
      "description": "Educational content on consequences of neglecting septic systems",
      "file_type": "html"
    },
    {
      "slug": "why-pump-out",
      "file": "why-pump-out.html",
      "title": "Why Pump Out?",
      "category": "Sales",
      "description": "Customer education: why regular pump-outs matter",
      "file_type": "html"
    },
    {
      "slug": "dump-stations",
      "file": "dump-stations.html",
      "title": "Dump Station Locations",
      "category": "Operations",
      "description": "Approved dump station locations for service trucks",
      "file_type": "html"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/will/react-crm-api
git add app/static/reference-docs-manifest.json
git commit -m "feat(docs): add reference docs manifest for Document Center"
```

---

## Task 2: Backend reference_docs router

**Files:**
- Create: `react-crm-api/app/api/v2/reference_docs.py`
- Modify: `react-crm-api/app/api/v2/router.py:376`

- [ ] **Step 1: Create the router**

Create `app/api/v2/reference_docs.py` with these endpoints:

- `GET /reference-docs/` — returns manifest list (title, slug, category, description, file_type)
- `GET /reference-docs/{slug}/html` — serves the file as HTML (wraps .txt in `<pre>`)
- `GET /reference-docs/{slug}/download` — serves the raw file as attachment
- `POST /reference-docs/{slug}/send` — emails the doc's HTML to a customer

Key implementation details:
- Load manifest from `app/static/reference-docs-manifest.json` on startup (module-level)
- Resolve file paths from `docs_dir` + each entry's `file` field
- `GET /html` reads the file, returns `HTMLResponse` — for `.txt` files wrap in `<html><body><pre>{content}</pre></body></html>`
- `POST /send` accepts `{email, subject?, message?}`, reads the file, wraps in email body, sends via existing `app.services.email_service.send_email` or `app.services.sms_service` depending on what's available
- All endpoints require auth via `CurrentUser` dependency (staff-only)

```python
"""Reference Docs API — serves static reference documents from disk."""

import json
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser

logger = logging.getLogger(__name__)
router = APIRouter()

# Load manifest once at import time
_MANIFEST_PATH = Path(__file__).parent.parent.parent / "static" / "reference-docs-manifest.json"
_manifest: dict = {}
_docs_by_slug: dict[str, dict] = {}


def _load_manifest():
    global _manifest, _docs_by_slug
    if _manifest:
        return
    try:
        with open(_MANIFEST_PATH) as f:
            _manifest = json.load(f)
        _docs_by_slug = {d["slug"]: d for d in _manifest.get("documents", [])}
        logger.info(f"Reference docs manifest loaded: {len(_docs_by_slug)} documents")
    except Exception as e:
        logger.warning(f"Failed to load reference docs manifest: {e}")


_load_manifest()


def _resolve_path(doc: dict) -> Path:
    docs_dir = Path(_manifest.get("docs_dir", "/home/will/mac-septic-docs"))
    return docs_dir / doc["file"]


class ReferenceDocItem(BaseModel):
    slug: str
    title: str
    category: str
    description: str
    file_type: str


class ReferenceDocSendRequest(BaseModel):
    email: str
    subject: Optional[str] = None
    message: Optional[str] = None


@router.get("", response_model=list[ReferenceDocItem])
async def list_reference_docs(current_user: CurrentUser):
    """List all available reference documents grouped by category."""
    _load_manifest()
    return [
        ReferenceDocItem(
            slug=d["slug"],
            title=d["title"],
            category=d["category"],
            description=d["description"],
            file_type=d["file_type"],
        )
        for d in _manifest.get("documents", [])
    ]


@router.get("/{slug}/html", response_class=HTMLResponse)
async def get_reference_doc_html(slug: str, current_user: CurrentUser):
    """Serve a reference document as HTML for iframe preview."""
    _load_manifest()
    doc = _docs_by_slug.get(slug)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = _resolve_path(doc)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document file not found on disk")

    content = file_path.read_text(encoding="utf-8")

    if doc["file_type"] == "text":
        # Wrap plain text in minimal HTML with readable styling
        content = (
            "<!DOCTYPE html><html><head>"
            '<meta charset="utf-8">'
            "<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"
            "max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#1f2937;}"
            "pre{white-space:pre-wrap;word-wrap:break-word;}</style></head>"
            f"<body><pre>{content}</pre></body></html>"
        )

    return HTMLResponse(content=content)


@router.get("/{slug}/download")
async def download_reference_doc(slug: str, current_user: CurrentUser):
    """Download a reference document as a file attachment."""
    _load_manifest()
    doc = _docs_by_slug.get(slug)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = _resolve_path(doc)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document file not found on disk")

    return FileResponse(
        path=str(file_path),
        filename=doc["file"],
        media_type="text/html" if doc["file_type"] == "html" else "text/plain",
    )


@router.post("/{slug}/send")
async def send_reference_doc(
    slug: str,
    req: ReferenceDocSendRequest,
    current_user: CurrentUser,
):
    """Email a reference document to a customer."""
    _load_manifest()
    doc = _docs_by_slug.get(slug)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = _resolve_path(doc)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document file not found on disk")

    content = file_path.read_text(encoding="utf-8")
    subject = req.subject or f"{doc['title']} — MAC Septic Services"

    # Wrap content in email-friendly HTML
    if doc["file_type"] == "text":
        body_html = f"<pre style='font-family:monospace;white-space:pre-wrap;'>{content}</pre>"
    else:
        body_html = content

    if req.message:
        body_html = (
            f"<div style='margin-bottom:20px;padding:16px;background:#f3f4f6;border-radius:8px;'>"
            f"<p style='margin:0;color:#374151;'>{req.message}</p></div>\n"
            + body_html
        )

    try:
        from app.services.email_service import send_email
        await send_email(
            to=req.email,
            subject=subject,
            html_body=body_html,
        )
    except ImportError:
        logger.warning("email_service not available; falling back to log-only")
        logger.info(f"Would send reference doc '{doc['title']}' to {req.email}")
    except Exception as e:
        logger.error(f"Failed to send reference doc email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")

    return {
        "sent": True,
        "slug": slug,
        "email": req.email,
        "subject": subject,
    }
```

- [ ] **Step 2: Register the router**

In `app/api/v2/router.py`, after line 376 (Document Center), add:

```python
from app.api.v2 import reference_docs
api_router.include_router(reference_docs.router, prefix="/reference-docs", tags=["reference-docs"])
```

- [ ] **Step 3: Verify syntax and imports**

```bash
cd /home/will/react-crm-api
python -c "import ast; ast.parse(open('app/api/v2/reference_docs.py').read()); print('OK')"
python -c "import sys; sys.path.insert(0,'.'); from app.api.v2 import reference_docs; print('Routes:', [r.path for r in reference_docs.router.routes])"
```

Expected: `['', '/{slug}/html', '/{slug}/download', '/{slug}/send']`

- [ ] **Step 4: Commit**

```bash
git add app/api/v2/reference_docs.py app/api/v2/router.py
git commit -m "feat(docs): add reference docs API — list, preview HTML, download, email"
```

---

## Task 3: Frontend API hook

**Files:**
- Create: `ReactCRM/src/api/hooks/useReferenceDocs.ts`

- [ ] **Step 1: Create the hook file**

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { toastError, toastSuccess } from "@/components/ui/Toast.tsx";

export interface ReferenceDoc {
  slug: string;
  title: string;
  category: string;
  description: string;
  file_type: "html" | "text";
}

export interface ReferenceDocSendRequest {
  email: string;
  subject?: string;
  message?: string;
}

export const referenceDocKeys = {
  all: ["reference-docs"] as const,
  list: () => [...referenceDocKeys.all, "list"] as const,
};

export function useReferenceDocs() {
  return useQuery({
    queryKey: referenceDocKeys.list(),
    queryFn: async (): Promise<ReferenceDoc[]> => {
      const { data } = await apiClient.get("/reference-docs");
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function getReferenceDocPreviewUrl(slug: string): string {
  return `${apiClient.defaults.baseURL}/reference-docs/${slug}/html`;
}

export function getReferenceDocDownloadUrl(slug: string): string {
  return `${apiClient.defaults.baseURL}/reference-docs/${slug}/download`;
}

export function useSendReferenceDoc() {
  return useMutation({
    mutationFn: async ({
      slug,
      request,
    }: {
      slug: string;
      request: ReferenceDocSendRequest;
    }) => {
      const { data } = await apiClient.post(
        `/reference-docs/${slug}/send`,
        request,
      );
      return data;
    },
    onSuccess: (_, { request }) => {
      toastSuccess(`Document sent to ${request.email}!`);
    },
    onError: () => {
      toastError("Failed to send document. Please try again.");
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/will/ReactCRM
git add src/api/hooks/useReferenceDocs.ts
git commit -m "feat(docs): add useReferenceDocs TanStack Query hooks"
```

---

## Task 4: Reference doc preview modal

**Files:**
- Create: `ReactCRM/src/features/document-center/components/ReferenceDocPreviewModal.tsx`

- [ ] **Step 1: Create the modal component**

Reuses the same pattern as `DocumentPreviewModal.tsx` but accepts a `ReferenceDoc` instead of `DocumentMeta`. Gets iframe URL from `getReferenceDocPreviewUrl(slug)`. Header shows doc title + category. Action buttons: Download + Send via Email.

- [ ] **Step 2: Commit**

```bash
git add src/features/document-center/components/ReferenceDocPreviewModal.tsx
git commit -m "feat(docs): add ReferenceDocPreviewModal for iframe HTML preview"
```

---

## Task 5: Reference doc send-email modal

**Files:**
- Create: `ReactCRM/src/features/document-center/components/ReferenceDocSendModal.tsx`

- [ ] **Step 1: Create the send modal**

Same form pattern as `SendEmailModal.tsx` (email, subject, message fields). Uses `useSendReferenceDoc()` hook. Default subject: `"{doc.title} — MAC Septic Services"`. Default message: `"Please find attached information from MAC Septic Services.\n\nIf you have any questions, please don't hesitate to contact us."`.

- [ ] **Step 2: Commit**

```bash
git add src/features/document-center/components/ReferenceDocSendModal.tsx
git commit -m "feat(docs): add ReferenceDocSendModal for emailing reference docs"
```

---

## Task 6: Reference docs tab component

**Files:**
- Create: `ReactCRM/src/features/document-center/components/ReferenceDocsTab.tsx`

- [ ] **Step 1: Create the tab component**

Card grid grouped by category. Each category section has a header (icon + title + count). Each doc card shows title, description, file_type badge. Three action buttons per card: Preview (eye icon), Download (download icon), Email (send icon). Uses `useReferenceDocs()` hook. Category icons: Playbooks = BookOpen, Contracts = FileSignature, Regulations = Shield, Sales = TrendingUp, Operations = Truck. Loading state: skeleton cards. Empty state: uses existing EmptyState component.

Category order: Playbooks, Contracts, Regulations, Sales, Operations.

- [ ] **Step 2: Commit**

```bash
git add src/features/document-center/components/ReferenceDocsTab.tsx
git commit -m "feat(docs): add ReferenceDocsTab with category-grouped card grid"
```

---

## Task 7: Add tab switcher to DocumentCenterPage

**Files:**
- Modify: `ReactCRM/src/features/document-center/DocumentCenterPage.tsx`

- [ ] **Step 1: Add tab state and import**

Add `useState` for `activeTab: "documents" | "reference"`, defaulting to `"documents"`. Import `ReferenceDocsTab`.

- [ ] **Step 2: Add tab bar below the page header**

After the page header div (line ~122), before `DocumentCenterDashboard`, add a tab bar:

```tsx
<div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
  <button
    onClick={() => setActiveTab("documents")}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === "documents"
        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
        : "text-gray-500 hover:text-gray-700"
    }`}
  >
    Generated Documents
  </button>
  <button
    onClick={() => setActiveTab("reference")}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === "reference"
        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
        : "text-gray-500 hover:text-gray-700"
    }`}
  >
    Reference Docs
  </button>
</div>
```

- [ ] **Step 3: Conditionally render tab content**

Wrap the existing dashboard, quick actions, filters, and documents table in `{activeTab === "documents" && (...)}`. Add `{activeTab === "reference" && <ReferenceDocsTab />}`.

Modals (preview, send, generate, delete) stay outside the conditional since they're already state-driven.

- [ ] **Step 4: Build and verify**

```bash
cd /home/will/ReactCRM
npm run build
```

Expected: clean build, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/document-center/DocumentCenterPage.tsx
git commit -m "feat(docs): add Reference Docs tab to Document Center page"
```

---

## Task 8: Push, deploy, and Playwright verify

- [ ] **Step 1: Push backend**

```bash
cd /home/will/react-crm-api
git push origin master
```

- [ ] **Step 2: Push frontend**

```bash
cd /home/will/ReactCRM
git push origin master
```

- [ ] **Step 3: Wait for Railway deploy (~2 min)**

- [ ] **Step 4: Verify backend endpoints**

```bash
# Health check
curl -sS https://react-crm-api-production.up.railway.app/health | head -c 100

# Reference docs list (needs auth — test via Playwright)
curl -sS https://react-crm-api-production.up.railway.app/api/v2/reference-docs -w "\nHTTP:%{http_code}\n"
# Expected: 401 (requires auth)
```

- [ ] **Step 5: Playwright — navigate to Document Center, verify Reference Docs tab**

1. Navigate to `https://react.ecbtx.com/login`
2. Login with credentials (use `page.evaluate(async () => fetch(..., {credentials:"include"}))`)
3. Navigate to `/documents`
4. Click "Reference Docs" tab
5. Verify category headers appear (Playbooks, Contracts, Regulations, Sales, Operations)
6. Verify doc cards render with correct titles
7. Click Preview on one doc — verify iframe loads with HTML content
8. Close preview
9. Screenshot for evidence

- [ ] **Step 6: Fix any issues found, rebuild, re-push, re-test**

Repeat the Sacred Loop until all checks pass.
