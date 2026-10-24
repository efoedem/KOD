<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Seller ownership is stored on books and snapshotted on order items; this preserves seller sales after a book is removed.
- Admin reads and writes use the authenticated RLS client; private seller order projections use admin_sales to avoid revealing other sellers' items or whole-cart totals.
- Admin email grants are durable invitations bound to confirmed auth emails, never user-editable profile email or metadata.
- Student profile mapping and identifier normalization live in a shared tested module; shelf overrides are scoped to the authenticated user so account changes cannot retain another student's selections.
