# Owner guide
Sign in at `/admin` with the email/password created in Supabase (see DEPLOYMENT).
## Daily tasks
- **Pause orders** (Overview or Settings): the site shows a notice and disables Add to order.
- **Mark an item unavailable**: Products → Edit → untick *Available* (whole product) or on a single option.
## Products
New product → name, description, category, options (e.g. Minis / Regular) each with price, **minimum quantity** and **step** (e.g. min 6, step 2 ⇒ 6, 8, 10 …). Add photos (JPG/PNG/WebP; they are resized and converted to WebP in your browser, which also removes location data). Alt text describes the photo for blind visitors; the product name is used as fallback.
Sample items are marked *Sample* and **cannot be published**. Edit the details, tick *I've confirmed these details are accurate*, then *Save & publish*.
## Gallery
Upload → add a caption and kind → Publish. Published files are copied to the public bucket; Unpublish moves them back to private.
## Customer feedback wall
Only add screenshots you have **permission** to show. Workflow: upload (stays private) → blur/crop names and numbers yourself before uploading → tick *Privacy reviewed* → Publish. Do not invent or edit testimonials.
## Settings
WhatsApp number (digits with country code, e.g. 919071983473), bulk minimum, pickup/delivery areas, announcement, contact and policy text. Missing/invalid number disables checkout.
## Launch readiness
Required checks: real database connected, valid WhatsApp number, no sample items left, at least one confirmed priced product published, and *menu confirmed* in Settings. Recommended: your own photos, website address configured, Instagram link, delivery areas/charges confirmed. Resolve the required ones before announcing the site.
## Safety
Use a long unique password; sign out on shared devices; the session ends when the tab closes. If you lose access, reset via Supabase Auth.
