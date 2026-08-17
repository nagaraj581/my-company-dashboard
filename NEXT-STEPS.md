# My Company Dashboard Handoff

Project path: `c:\MY-APPS\my-company-dashboard`

## Current Status

- Firestore data model was refactored from shared top-level collections to user-scoped paths under `users/{uid}/...`
- New app data should now save under:
  - `users/{uid}/companies`
  - `users/{uid}/items`
  - `users/{uid}/materialReceipts`
  - `users/{uid}/materialRequests`
  - `users/{uid}/projectConsumptions`
  - `users/{uid}/projects`
  - `users/{uid}/quotations`
  - `users/{uid}/settings`
  - `users/{uid}/stockMovements`
  - `users/{uid}/units`
- Old top-level collections still exist in Firestore and are being kept as backup for now
- Company modal clipping issue on `/company` was fixed by rendering the modal through a portal in `src/pages/company/CompanyList.jsx`

## Important Notes

- Do not delete the old top-level Firestore collections yet
- The app should be tested first with real create/read/update flows
- Firestore rules still need to be deployed before real usage
- A Firestore parent user document may appear as "document does not exist" even when its subcollections exist; that is okay

## Next Steps

1. Run the app locally and test the main flows with one account
2. Test with a second Google account and confirm data isolation
3. Deploy `firestore.rules`
4. Decide whether to migrate old data into `users/{uid}` or delete old collections later
5. Continue cleanup of remaining lint/code-quality issues if needed

## Resume Prompt

If starting a new chat later, paste:

```text
We were refactoring my-company-dashboard to use Firestore users/{uid}/... paths. Old top-level collections still exist as backup. We fixed the company modal clipping issue and need to continue testing, deploy firestore.rules, and then decide whether to migrate or delete the old collections.
```
