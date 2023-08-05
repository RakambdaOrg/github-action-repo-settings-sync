<h1 align="center">github-action-repo-settings-sync</h1>


<div align="center">

<b>Github Action to setup repositories settings and keep them in sync</b>

[![version](https://img.shields.io/github/v/release/rakambda/github-action-repo-settings-sync)](https://img.shields.io/github/v/release/rakambda/github-action-repo-settings-sync)

</div>

# Use Cases

Great for keeping repository settings in sync across all repos. I constantly forget when creating new repos to go tweak
all my repository settings how I like them, set up branch policys, etc. This allows me to add my new repo to the list (
or just take the default of all and have no steps) and automatically have my settings there.

# Setup

Create a new file called `/.github/workflows/repo-settings-sync.yml` that looks like so:

```yaml
name: Repo Setup

on:
  push:
    branches:
      - master
  schedule:
    - cron: 0 0 * * *

jobs:
  repo_setup:
    runs-on: ubuntu-latest
    steps:
      - name: Repo Setup
        uses: rakambda/github-action-repo-settings-sync@v1.0.0
        env:
          GH_TOKEN: ${{ github.token }}
        with:
          REPOSITORIES: |
            owner/repo1
            owner/repo2
          ALLOW_ISSUES: true
          ALLOW_PROJECTS: true
          ALLOW_WIKI: true
          SQUASH_MERGE: true
          MERGE_COMMIT: true
          REBASE_MERGE: true
          AUTO_MERGE: false
          DELETE_HEAD: false
          RULESET_DEFINITIONS: |
            ./example-ruleset.json
          ACTION_SECRETS:
            KEY1=VAL1
            KEY2=VAL2
```

## Parameters

| Parameter           | Required | Default | Description                                                                              |
|---------------------|----------|---------|------------------------------------------------------------------------------------------|
| REPOSITORIES        | false    | 'ALL'   | Github repositories to setup. Default will get all public repositories for your username |
| ALLOW_ISSUES        | false    | true    | Whether or not to allow issues on the repo                                               |
| ALLOW_PROJECTS      | false    | true    | Whether or not to allow projects on the repo                                             |
| ALLOW_WIKI          | false    | true    | Whether or not to allow wiki on the repo                                                 |
| SQUASH_MERGE        | false    | true    | Whether or not to allow squash merges on the repo                                        |
| MERGE_COMMIT        | false    | true    | Whether or not to allow merge commits on the repo                                        |
| REBASE_MERGE        | false    | true    | Whether or not to allow rebase merges on the repo                                        |
| AUTO_MERGE          | false    | false   | Whether or not to allow auto-merge on the repo                                           |
| DELETE_HEAD         | false    | false   | Whether or not to delete head branch after merges                                        |
| RULESET_DEFINITIONS | false    |         | Paths to a file containing ruleset to apply.                                             |
| ACTION_SECRETS      | false    |         | Action secrets to deploy on every repo. Set empty value to delete.                       |