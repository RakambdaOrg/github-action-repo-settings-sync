<h1 align="center">github-action-repo-settings-sync</h1>
<div align="center">
<b>GithubWrapper Action to setup repositories settings and keep them in sync</b>
[![version](https://img.shields.io/github/v/release/RakambdaOrg/github-action-repo-settings-sync)](https://img.shields.io/github/v/release/RakambdaOrg/github-action-repo-settings-sync)
</div>

Synchronizes your repository settings across several repositories.
They can either be selected through different methods :

* All the repositories of a user/organization
* Repositories with specific custom properties in an organization

NOTE: Archived repositories are skipped.

# Setup

Create a new workflow that looks like so:

```yaml
name: Settings Sync

on:
  workflow_dispatch:
  push:
    branches:
      - main
  schedule:
    - cron: 0 0 * * *

jobs:
  repo_setup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@main
      - name: Repo Setup
        uses: RakambdaOrg/github-action-repo-settings-sync@main
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          config_path: .github/sync-settings.yml
```

## Parameters

| Parameter                  | Required | Default                     | Description                                      |
|----------------------------|----------|-----------------------------|--------------------------------------------------|
| github_token               | false    |                             | Github token to use to access APIs               |
| github_app_id              | false    |                             | Github App ID to use to access APIs              |
| github_app_private_key     | false    |                             | Github App private key to use to access APIs     |
| github_app_installation_id | false    |                             | Github App installation ID to use to access APIs |
| config_path                | false    | ./.github/settings-sync.yml | Path to the config file to use                   |

NOTE: Use `github_token` or `github_app_id` + `github_app_private_key` + `github_app_installation_id`

## Config file

TODO