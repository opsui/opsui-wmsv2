# Team Collaboration Guide

This guide explains how to work effectively as a team on this WMS project without causing merge conflicts or file corruption.

## Repository Information

- **Repository**: https://github.com/opsui/opsui-wmsv2
- **Organization**: opsui
- **Access**: All team members should have push access to this repository

## Auto-Push Behavior

Every commit is automatically pushed to the team repository with these safeguards:

1. **Pulls before pushing**: Always fetches latest changes from the team
2. **Rebases locally**: Applies your changes on top of latest team changes
3. **Checks for conflicts**: Stops if conflicts are detected
4. **Only pushes if safe**: Pushes only when there are no conflicts

## Team Workflow

### 1. Before Starting Work

Always pull the latest changes:

```bash
git pull origin main
```

Or use rebase for cleaner history:

```bash
git pull --rebase origin main
```

### 2. During Work

- **Work on separate features**: Use different files/modules when possible
- **Commit frequently**: Small, focused commits are easier to merge
- **Write clear commit messages**: Explain what you changed and why

### 3. After Finishing Work

When you complete a task:

1. **Review your changes**:
   ```bash
   git status
   git diff
   ```

2. **Commit your changes**:
   ```bash
   git add .
   git commit -m "clear description of changes"
   ```

3. **Auto-push happens automatically**: The post-commit hook will:
   - Pull latest changes from team
   - Rebase your changes on top
   - Push if safe, or stop if conflicts detected

### 4. If Conflicts Occur

If the auto-push detects conflicts:

```bash
# See which files have conflicts
git status

# Edit conflicted files and look for:
# <<<<<<< HEAD
# Your changes
# =======
# Team member's changes
# >>>>>>> origin/main

# Resolve conflicts by choosing the correct code
# Remove the conflict markers

# Mark conflicts as resolved
git add .

# Continue the rebase
git rebase --continue

# If rebase completes successfully, push manually
git push origin main
```

## Module Ownership

To minimize conflicts, team members should primarily work on their assigned modules:

| Module | Owner | Files/Folders |
|--------|-------|---------------|
| Picking | @friend1 | `packages/frontend/src/pages/PickingPage.tsx`, picker-related routes |
| Packing | @friend2 | `packages/frontend/src/pages/PackingPage.tsx`, packer-related routes |
| Admin/General | @Heinricht | Admin pages, shared components, infrastructure |

**Note**: This is a guideline - anyone can fix bugs anywhere, but feature work should respect ownership.

## Best Practices

### DO ✅

- Pull before starting work
- Commit frequently with clear messages
- Work on different files when possible
- Communicate in team chat when working on large features
- Test your changes before committing
- Review git diff before committing

### DON'T ❌

- Don't work on the same file as a teammate simultaneously
- Don't commit unrelated changes together
- Don't ignore merge conflicts
- Don't force push unless absolutely necessary
- Don't modify files you don't understand

## Using AI Assistants Together

When using Cline, GLM, or Claude Code:

### 1. Pull First

Always pull before starting an AI session:

```bash
git pull --rebase origin main
```

### 2. Let AI Commit

When the AI completes a task and asks to commit:

- **Say yes**: The auto-push hook will handle pushing
- **Review changes**: Check git diff first if you're unsure
- **Verify**: Test the changes after commit

### 3. After AI Session

After the AI finishes:

1. **Check the changes**: `git diff HEAD~1`
2. **Test the functionality**: Ensure it works
3. **Verify it pushed**: Check GitHub to confirm

### 4. If AI Causes Conflicts

If the auto-push fails during AI work:

1. **Stop the AI**: Tell it to pause
2. **Resolve manually**: Follow the conflict resolution steps above
3. **Resume AI**: Tell it the conflicts are resolved

## Checking Team Activity

See what teammates are working on:

```bash
# See recent commits from all team members
git log --oneline --graph --all -10

# See who changed a specific file
git log --follow --pretty=format:"%h - %an, %ar : %s" -- filename

# See what changed since you last pulled
git log origin/main..HEAD
```

## Emergency Procedures

### If Someone Force Pushed

If the repository history was rewritten:

```bash
# Fetch all remote changes
git fetch origin

# Reset to latest remote (WARNING: loses your local changes)
git reset --hard origin/main

# Or rebase your work on top
git rebase origin/main
```

### If Files Are Corrupted

If files seem broken after a merge:

```bash
# Find the good version
git log --oneline --all

# Reset to that commit
git reset --hard <commit-hash>

# Push the fix
git push --force origin main
```

## Communication

**Always communicate in your team chat when**:
- Starting work on a large feature
- Working on a file others might touch
- Encountering merge conflicts
- Needing help with conflicts
- Completing a significant feature

## GitHub Repository

**Team Repository**: https://github.com/opsui/opsui-wmsv2

All team members should:
- Have access to this repository
- Watch the repository for notifications
- Review pull requests if using PR workflow
- Check issues for bugs and feature requests

## Auto-Push Configuration

The auto-push hook is in `.husky/post-commit`. It:
- Runs after every commit
- Pulls latest changes first
- Pushes only if safe
- Prevents file corruption from conflicts

**To disable auto-push temporarily**:
```bash
chmod -x .husky/post-commit
```

**To re-enable**:
```bash
chmod +x .husky/post-commit
```

## Summary

1. **Pull before work**
2. **Commit often with clear messages**
3. **Let auto-push handle syncing**
4. **Resolve conflicts manually if they occur**
5. **Communicate with team**
6. **Work on separate modules when possible**

Following these guidelines ensures smooth collaboration without file corruption or merge conflicts.
