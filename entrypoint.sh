#!/bin/bash

STATUS=0

# remember last error code
trap 'STATUS=$?' ERR

# problem matcher must exist in workspace
cp /error-matcher.json $HOME/settings-sync-error-matcher.json
echo "::add-matcher::$HOME/settings-sync-error-matcher.json"

echo "Repository: [$GITHUB_REPOSITORY]"

# log inputs
echo "Inputs"
echo "---------------------------------------------"
RAW_REPOSITORIES="$INPUT_REPOSITORIES"
REPOSITORIES=($RAW_REPOSITORIES)
echo "Repositories           : $REPOSITORIES"
ALLOW_ISSUES=$INPUT_ALLOW_ISSUES
echo "Allow Issues           : $ALLOW_ISSUES"
ALLOW_PROJECTS=$INPUT_ALLOW_PROJECTS
echo "Allow Projects         : $ALLOW_PROJECTS"
ALLOW_WIKI=$INPUT_ALLOW_WIKI
echo "Allow Wiki             : $ALLOW_WIKI"
SQUASH_MERGE=$INPUT_SQUASH_MERGE
echo "Squash Merge           : $SQUASH_MERGE"
MERGE_COMMIT=$INPUT_MERGE_COMMIT
echo "Merge Commit           : $MERGE_COMMIT"
REBASE_MERGE=$INPUT_REBASE_MERGE
echo "Rebase Merge           : $REBASE_MERGE"
AUTO_MERGE=$INPUT_AUTO_MERGE
echo "Auto-Merge             : $AUTO_MERGE"
DELETE_HEAD=$INPUT_DELETE_HEAD
echo "Delete Head            : $DELETE_HEAD"
BRANCH_PROTECTION_ENABLED=$INPUT_BRANCH_PROTECTION_ENABLED
echo "Branch Protection (BP) : $BRANCH_PROTECTION_ENABLED"
BRANCH_PROTECTION_NAME=$INPUT_BRANCH_PROTECTION_NAME
echo "BP: Name               : $BRANCH_PROTECTION_NAME"
BRANCH_PROTECTION_REQUIRED_REVIEWERS=$INPUT_BRANCH_PROTECTION_REQUIRED_REVIEWERS
echo "BP: Required Reviewers : $BRANCH_PROTECTION_REQUIRED_REVIEWERS"
BRANCH_PROTECTION_DISMISS=$INPUT_BRANCH_PROTECTION_DISMISS
echo "BP: Dismiss Stale      : $BRANCH_PROTECTION_DISMISS"
BRANCH_PROTECTION_CODE_OWNERS=$INPUT_BRANCH_PROTECTION_CODE_OWNERS
echo "BP: Code Owners        : $BRANCH_PROTECTION_CODE_OWNERS"
BRANCH_PROTECTION_ENFORCE_ADMINS=$INPUT_BRANCH_PROTECTION_ENFORCE_ADMINS
echo "BP: Enforce Admins     : $BRANCH_PROTECTION_ENFORCE_ADMINS"
RAW_ACTION_SECRETS=$INPUT_ACTION_SECRETS
ACTION_SECRETS=($RAW_ACTION_SECRETS)
echo "Action secrets count   : ${#ACTION_SECRETS[@]}"
echo "---------------------------------------------"
echo " "

gh auth login --with-token
echo "Logged in with provided token"

# find username and repo name
REPO_INFO=($(echo $GITHUB_REPOSITORY | tr "/" "\n"))
USERNAME=${REPO_INFO[0]}
echo "Username: [$USERNAME]"

echo " "

# get all repos, if specified
if [ "$REPOSITORIES" == "ALL" ]; then
    echo "Getting all repositories for [${USERNAME}]"
    REPOSITORIES=$(gh repo list ${USERNAME} --no-archived --json owner,name | jq -r '(.[] | .owner.login + "/" + .name)')
fi

# loop through all the repos
for repository in "${REPOSITORIES[@]}"; do
    echo "::group:: $repository"

    # trim the quotes
    repository="${repository//\"}"

    echo "Repository name: [$repository]"
    echo " "

    echo "Setting repository options"
    gh repo edit $repository \
        --enable-issues=$ALLOW_ISSUES \
        --enable-projects=$ALLOW_PROJECTS \
        --enable-wiki=$ALLOW_WIKI \
        --enable-squash-merge=$SQUASH_MERGE \
        --enable-merge-commit=$MERGE_COMMIT \
        --enable-rebase-merge=$REBASE_MERGE \
        --enable-auto-merge=$AUTO_MERGE \
        --delete-branch-on-merge=$DELETE_HEAD
    echo " "

    if [ "$BRANCH_PROTECTION_ENABLED" == "true" ]; then
        echo "Activating [${BRANCH_PROTECTION_NAME}] branch protection rules"
        gh api repos/${repository}/branches/${BRANCH_PROTECTION_NAME}/protection \
            -X PUT \
            -H "Accept: application/vnd.github.luke-cage-preview+json" \
            -H "Content-Type: application/json" \
            -f required_status_checks=null \
            -f enforce_admins=$BRANCH_PROTECTION_ENFORCE_ADMINS \
            -f required_pull_request_reviews[dismiss_stale_reviews]=$BRANCH_PROTECTION_DISMISS \
            -f required_pull_request_reviews[require_code_owner_reviews]=$BRANCH_PROTECTION_CODE_OWNERS \
            -f required_pull_request_reviews[required_approving_review_count]=$BRANCH_PROTECTION_REQUIRED_REVIEWERS \
            -f restrictions=null

    elif [ "$BRANCH_PROTECTION_ENABLED" == "false" ]; then
        echo "Disabling [${BRANCH_PROTECTION_NAME}] branch protection rules"
        gh api repos/${repository}/branches/${BRANCH_PROTECTION_NAME}/protection \
            -X DELETE \
            -H "Accept: application/vnd.github.luke-cage-preview+json" \
            -H "Content-Type: application/json"
    fi
    echo " "

    echo "Setting repository action secrets"
    # loop through all the secrets name
    for action_secret in "${ACTION_SECRETS[@]}"; do
        echo ${action_secret} | while IFS='=' read secret_name secret_value; do
            if [ -z "${secret_value}" ]; then
                echo "Removing [${secret_name}] secret"
                gh secret delete ${secret_name} \
                    --repo ${repository}
            else
                echo "Setting [${secret_name}] secret"
                gh secret set ${secret_name} \
                    --body "${secret_value}" \
                    --repo ${repository}
            fi
        done
    done
    echo " "

    echo "Completed [${repository}]"
    echo "::endgroup::"
done

exit $STATUS
