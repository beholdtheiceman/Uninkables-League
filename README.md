# Uninkables League Hub

Working repo for league hub docs and implementation notes.

## Branching
- **main**: production / stable
- **develop**: integration / testing

## Recommended workflow

- Create feature branches from `develop`: `feature/<name>`
- Open PRs into `develop` for testing/review
- When ready to release, open a PR from `develop` -> `main`

## Suggested GitHub settings (optional)

In GitHub -> Settings -> Branches:
- Protect `main`: require PR, block direct pushes, require status checks (if you add CI)
- Protect `develop` (optional): require PR
