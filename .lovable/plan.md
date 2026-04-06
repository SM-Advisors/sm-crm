

## Fix Build Error in InvoiceDetail.tsx

The build is failing because `InvoiceDetail.tsx` references `qb_invoice_url` which doesn't exist on the `Invoice` type. The type only has `qb_invoice_id`.

### Change

**File: `src/pages/InvoiceDetail.tsx`** (lines ~226-233)

Replace the `qb_invoice_url` references. Since there's no URL field in the type, remove the QuickBooks link section entirely (there's no URL to link to, only an ID).

Remove this block:
```tsx
{invoice.qb_invoice_url && (
  <a href={invoice.qb_invoice_url} ...>
    View in QuickBooks
  </a>
)}
```

Replace with a conditional that shows the QB invoice ID if present:
```tsx
{invoice.qb_invoice_id && (
  <p className="flex items-center gap-2 text-sm text-muted-foreground">
    <ExternalLink className="h-3.5 w-3.5" />
    QuickBooks ID: {invoice.qb_invoice_id}
  </p>
)}
```

This fixes the TypeScript error and keeps the QB reference visible without a broken link.

