# Authorization

Authorization answers a different question from authentication. Authentication says who the caller is. Authorization says whether that person may do this action on this organization's data.

## Tenant isolation

`organizationId` on the user context comes from `memberships` for `auth.uid()`. Tool arguments cannot select another tenant. Domain queries also filter by that organization id, and Postgres row-level security applies to the user-scoped Supabase client.

If a caller asks for another organization's project or task, the row is hidden. The domain layer reports that as not found. `authorize()` also throws when a resource's `organizationId` does not match the caller's organization.

## Roles

| Action                               | Viewer | Member | Admin |
| ------------------------------------ | ------ | ------ | ----- |
| View projects and tasks              | yes    | yes    | yes   |
| Create, update, or assign tasks      | no     | yes    | yes   |
| Delete a task (`task:delete`)        | no     | no     | yes   |
| Approve or reject a protected action | no     | no     | yes   |

`authorize(user, action, resource)` in `packages/authorization` throws `AuthorizationError` on denial. It does not return false. Domain services call it before they touch the database. MCP handlers do not reimplement the matrix.

A viewer who calls `create_task` is denied before an insert. A member who calls `delete_task` is denied before a pending row is created. Only an admin can request that delete, and even then the task stays until another admin approves it in the web app.
