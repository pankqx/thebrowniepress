# UX flows
## Order (customer)
1. Menu/Product → choose variant → qty field defaults to the variant minimum; stepper moves by the step; invalid input shows an inline message and Add is refused (TC-003/004).
2. Cart → lines show unit price × qty; estimate total only. Changed price ⇒ banner + "Accept updated prices"; unavailable/invalid lines block "Review my order" (TC-008).
3. Review → name (required), pickup or delivery (delivery area + address when enabled by the owner), preferred date/time, notes → preview of the exact message.
4. "Open WhatsApp" link (new tab) + "Copy message". Copy after click: "WhatsApp should have opened. Your order is not placed until you send the message and the owner confirms." — never "order confirmed".
5. If the encoded URL is > 4000 chars, only Copy is offered with an explanation.
6. Settings missing/invalid WhatsApp number or ordering paused ⇒ checkout disabled with a clear reason (TC-012, TC-021).

## Bulk
Form with quantity ≥ bulk minimum (20 by default), occasion, date, notes ⇒ WhatsApp message.

## Owner
Login → Overview (counts, warnings) → Products (create/edit, variants, photos, status) → Gallery / Feedback (upload → review privacy → publish) → Settings → Launch readiness. Destructive actions use a confirm dialog; toasts report save results; publish is refused while `is_sample` or required fields are missing.

## Edge states
Loading skeleton; backend error ⇒ retry message; empty menu ⇒ friendly empty state; 404 page; `unconfigured` fallback.
