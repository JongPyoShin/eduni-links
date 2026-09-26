# EDUNI Production Deploy — Camera Picker 53B (Explicit Approval + Clean Worktree Recovery)

## Authority

The user has explicitly approved production deployment.

Treat the following as an explicit production change authorization:

**DEPLOY APPROVED — production EDUNI on host 8081 may be updated according to Prompt 53.**

This authorization applies only to the EDUNI production deployment described in:

`.agent/PROMPT_EDUNI_READING_CAMERA_PICKER_PRODUCTION_DEPLOY_53.md`

Do not ask again whether production 8081 deployment is approved.

Host 8080 remains strictly out of scope and must not be queried, connected to, bound,
stopped, killed, or otherwise touched.

## Remote source of truth

Repository:

`JongPyoShin/eduni-links`

Remote target branch:

`origin/feature/eduni-space-mvp`

Current expected remote branch HEAD when this instruction was created:

`5e5f74c57108874d3edfd94ec6ae837773735087`

That commit is documentation-only and contains Prompt 53.

Approved product merge SHA contained in that branch:

`7e8155ea137a5490cc87966ca96fc1bcb329acec`

PR #73 is already merged.

The local checkout being on `prototype/jungle-web-canvas-poc`, having uncommitted
work, or having a stale local `feature/eduni-space-mvp` branch is **not** a reason
to modify, reset, stash, clean, or switch that working tree.

Preserve it exactly.

## 1. Preserve the current dirty checkout

Before doing anything else, record read-only:

- current working-tree path
- current branch
- current HEAD
- concise `git status --short`

Do not:

- checkout another branch in that working tree
- reset
- clean
- stash
- commit its changes
- delete files
- alter its index

The unrelated prototype worktree must remain untouched.

## 2. Refresh remote refs safely

From the repository, fetch only the required remote refs safely.

For example, an equivalent operation is acceptable:

~~~powershell
git fetch origin feature/eduni-space-mvp
~~~

Do not merge into the current dirty branch.

After fetch, verify:

`origin/feature/eduni-space-mvp`

resolves to:

`5e5f74c57108874d3edfd94ec6ae837773735087`

or a later commit whose changes are proven documentation-only.

Also verify the remote target contains:

`7e8155ea137a5490cc87966ca96fc1bcb329acec`

If the remote branch contains any later unreviewed product/runtime/test change,
stop with BLOCKED.

Do not use a stale local branch as the deployment source.

## 3. Create a separate clean deployment worktree

Create a new temporary clean Git worktree from the remote branch, without touching
the dirty prototype checkout.

Preferred concept:

~~~powershell
git worktree add --detach <NEW_SAFE_TEMP_PATH> origin/feature/eduni-space-mvp
~~~

Choose a new path that does not overlap existing worktrees or production data.

Do not force-remove another worktree.

Inside the new deployment worktree verify:

- HEAD is exactly the expected remote HEAD
- Prompt 53 exists
- approved product merge `7e8155e...` is an ancestor
- working tree is clean
- `git diff --check` passes

Run the deployment from this clean worktree only.

## 4. Existing production secret

The previous successful production deployment created the production PostgreSQL
secret in an ignored local repo-root `.env`.

Because a new Git worktree does not automatically contain that ignored file:

- locate the existing production `.env` from the original repository/worktree
- verify only that `EDUNI_POSTGRES_PASSWORD` exists and is non-empty
- do not print the value
- do not regenerate it
- do not overwrite it
- do not commit it

Prefer using the existing secret file explicitly with Docker Compose, e.g. via an
equivalent `--env-file <existing-production-.env>` argument, so the secret does
not need to be duplicated into the temporary worktree.

If Compose tooling or the environment requires a local copy, copying the existing
secret into the clean worktree's ignored `.env` is permitted only if:

- the value is copied unchanged
- permissions remain restricted
- the value is never printed
- the file remains ignored/untracked
- it is removed from the temporary worktree during cleanup

Never generate a replacement production password.

If the existing production password cannot be found or verified non-empty, stop
with BLOCKED.

## 5. Execute Prompt 53

Read and execute:

`.agent/PROMPT_EDUNI_READING_CAMERA_PICKER_PRODUCTION_DEPLOY_53.md`

from the clean deployment worktree.

All Prompt 53 safety gates remain mandatory.

In particular:

- production Compose project = `eduni-space-mvp`
- deploy only EDUNI scoped services
- preserve `eduni-space-mvp_eduni_data`
- preserve `eduni-space-mvp_eduni_postgres_data`
- preserve existing production PostgreSQL password
- host 8080 is forbidden
- production host 8081 is explicitly approved for this deployment
- no destructive Docker cleanup
- no legacy startup/watch scripts
- no unrelated Docker resource changes
- backup/rollback readiness before app replacement
- production HTTP acceptance on 8081
- production camera/gallery markup acceptance
- no fake production reading record/image

## 6. Deployment source

The deployed product source must be the code from approved merge:

`7e8155ea137a5490cc87966ca96fc1bcb329acec`

A later branch HEAD is acceptable only when every later commit is documentation-only.

Current expected deployment worktree HEAD:

`5e5f74c57108874d3edfd94ec6ae837773735087`

Do not deploy product changes from:

`prototype/jungle-web-canvas-poc`

or from any stale local branch.

## 7. Report commit handling

Prompt 53 requires:

`EDUNI_READING_CAMERA_PICKER_PRODUCTION_DEPLOY_REPORT_53.md`

After all required non-physical production acceptance gates pass:

- create/update that report in the clean deployment worktree
- ensure no secret or backup is staged
- commit only the report
- push the report commit to `feature/eduni-space-mvp`

Because the deployment worktree is detached, explicitly push the report commit to
the target branch only after confirming the remote branch has not unexpectedly
moved.

Equivalent safe pattern:

1. fetch `origin/feature/eduni-space-mvp`
2. ensure remote is still the expected documentation-only deployment source
3. commit report locally
4. push `HEAD:feature/eduni-space-mvp`

If remote moved with an unreviewed product change, do not force-push; stop with
BLOCKED.

Never force-push.

## 8. Cleanup

After a successful report push:

- remove only the temporary clean deployment worktree
- do not remove or alter the original dirty prototype worktree
- do not remove production volumes
- do not delete the original production `.env`

If a temporary copied `.env` was created inside the deployment worktree, ensure it
is removed with that temporary worktree and was never committed.

## 9. Final verdict

Use Prompt 53 verdicts exactly:

`EDUNI CAMERA PICKER DEPLOY PASS — MOBILE ACCEPTANCE PENDING`

`EDUNI CAMERA PICKER DEPLOY FAIL — ROLLBACK REQUIRED`

`BLOCKED`

For a PASS, explicitly state:

- production 8081 deployment was performed under explicit user approval
- source was the remote approved merge plus documentation-only commits
- dirty prototype checkout remained untouched
- host 8080 remained untouched
- physical mobile camera acceptance remains for the user

Stop after report push and cleanup.
