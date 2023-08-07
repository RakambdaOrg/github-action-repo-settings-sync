#!/bin/bash

STATUS=0

# remember last error code
trap 'STATUS=$?' ERR

# problem matcher must exist in workspace
cp /error-matcher.json ${HOME}/settings-sync-error-matcher.json
echo "::add-matcher::${HOME}/settings-sync-error-matcher.json"

function set_global_settings(){
  local repository="${1}"
  echo "Setting repository options"

  gh api "repos/${repository}" \
      -X PATCH \
      -H "Accept: application/vnd.github+json" \
      -H "Content-Type: application/json" \
      -F has_issues=${ALLOW_ISSUES} \
      -F has_projects=${ALLOW_PROJECTS} \
      -F has_wiki=${ALLOW_WIKI} \
      -F allow_squash_merge=${SQUASH_MERGE} \
      -F allow_merge_commit=${MERGE_COMMIT} \
      -F allow_rebase_merge=${REBASE_MERGE} \
      -F allow_auto_merge=${AUTO_MERGE} \
      -F delete_branch_on_merge=${DELETE_HEAD} \
      -F is_template=${IS_TEMPLATE} \
      -F squash_merge_commit_title=${SQUASH_PR_TITLE} \
      -F squash_merge_commit_message=${SQUASH_PR_MESSAGE}
}

function delete_branch_protection(){
  # Temporary to migrate to new rulesets
  local branches=($(gh api "/repos/${repository}/branches" | jq ".[] | select( .protection.enabled == true ) | .name"))
  for branch_name in "${branches[@]}"; do
    local branch_name=${branch_name//\"}
    echo "Deleting branch protection for ${branch_name}"
    gh api repos/${repository}/branches/${branch_name}/protection \
        -X DELETE \
        -H "Accept: application/vnd.github.luke-cage-preview+json" \
        -H "Content-Type: application/json"
  done
}

function set_rulesets(){
  local repository="${1}"
  echo "Setting rulesets"

  local existing_rulesets=$(gh ruleset list --repo ${repository})
  echo "Existing rulesets:"
  echo "${existing_rulesets}"

  for ruleset_definition in "${RULESET_DEFINITIONS[@]}"; do
    local ruleset_name=$(jq ".name" "${GITHUB_WORKSPACE}/${ruleset_definition}")
    local ruleset_name=${ruleset_name//\"}
    local ruleset_id=$(echo "${existing_rulesets}" | grep "${ruleset_name}" | head -n 1 | awk '{print $1;}')

    if [ -z "${ruleset_id}" ]; then
      echo "Setting ruleset ${ruleset_name} from ${ruleset_definition}"
      gh api "/repos/${repository}/rulesets" \
          -X POST \
          -H "Accept: application/vnd.github+json" \
          -H "Content-Type: application/json" \
          --input "${GITHUB_WORKSPACE}/${ruleset_definition}"
    else
      echo "Updating ruleset ${ruleset_name} (${ruleset_id}) from ${ruleset_definition}"
      gh api "/repos/${repository}/rulesets/${ruleset_id}" \
          -X PUT \
          -H "Accept: application/vnd.github+json" \
          -H "Content-Type: application/json" \
          --input "${GITHUB_WORKSPACE}/${ruleset_definition}"
    fi
  done
}

function set_secrets() {
  local repository="${1}"
  echo "Setting repository action secrets"

  for action_secret in "${ACTION_SECRETS[@]}"; do
      echo "${action_secret}" | while IFS='=' read secret_name secret_value; do
          if [ -z "${secret_value}" ]; then
              echo "Removing [${secret_name}] secret"
              gh secret delete "${secret_name}" --repo "${repository}"
          else
              echo "Setting [${secret_name}] secret"
              gh secret set "${secret_name}" --body "${secret_value}" --repo "${repository}"
          fi
      done
  done
}

function set_action_access() {
  local repository="${1}"
  echo "Setting action access level"

  gh api "repos/${repository}/actions/permissions/access" \
      -X PUT \
      -H "Accept: application/vnd.github+json" \
      -H "Content-Type: application/json" \
      -F access_level=${ACTION_ACCESS_LEVEL}
}

function handle_repository() {
    # trim the quotes
    local repository=${1//\"}
    echo "::group:: ${repository}"
    echo "Repository name: [${repository}]"
    echo " "

    set_global_settings "${repository}"
    echo " "

    delete_branch_protection "${repository}"
    echo " "

    set_rulesets "${repository}"
    echo " "

    set_action_access "${repository}"
    echo " "

    set_secrets "${repository}"
    echo " "

    echo "Completed [${repository}]"
    echo "::endgroup::"
}

function log_and_set_inputs() {
    # log inputs
    echo "::group:: _Inputs"
    echo "Repository: [${GITHUB_REPOSITORY}]"
    echo "---------------------------------------------"
    RAW_REPOSITORIES="${INPUT_REPOSITORIES}"
    REPOSITORIES=(${RAW_REPOSITORIES})
    echo "Repositories               : ${REPOSITORIES}"
    ALLOW_ISSUES=${INPUT_ALLOW_ISSUES}
    echo "Allow Issues               : ${ALLOW_ISSUES}"
    ALLOW_PROJECTS=${INPUT_ALLOW_PROJECTS}
    echo "Allow Projects             : ${ALLOW_PROJECTS}"
    ALLOW_WIKI=${INPUT_ALLOW_WIKI}
    echo "Allow Wiki                 : ${ALLOW_WIKI}"
    IS_TEMPLATE=$INPUT_IS_TEMPLATE
    echo "Is template                : $IS_TEMPLATE"
    SQUASH_MERGE=${INPUT_SQUASH_MERGE}
    echo "Squash Merge               : ${SQUASH_MERGE}"
    MERGE_COMMIT=${INPUT_MERGE_COMMIT}
    echo "Merge Commit               : ${MERGE_COMMIT}"
    REBASE_MERGE=${INPUT_REBASE_MERGE}
    echo "Rebase Merge               : ${REBASE_MERGE}"
    AUTO_MERGE=${INPUT_AUTO_MERGE}
    echo "Auto-Merge                 : ${AUTO_MERGE}"
    DELETE_HEAD=${INPUT_DELETE_HEAD}
    echo "Delete Head                : ${DELETE_HEAD}"
    ACTION_ACCESS_LEVEL=$INPUT_ACTION_ACCESS_LEVEL
    echo "Action access level        : $ACTION_ACCESS_LEVEL"
    RAW_RULESET_DEFINITIONS=${INPUT_RULESET_DEFINITIONS}
    RULESET_DEFINITIONS=(${RAW_RULESET_DEFINITIONS})
    echo "Ruleset definitions        : ${RULESET_DEFINITIONS}"
    RAW_ACTION_SECRETS=${INPUT_ACTION_SECRETS}
    ACTION_SECRETS=(${RAW_ACTION_SECRETS})
    echo "Action secrets count       : ${#ACTION_SECRETS[@]}"
    echo "---------------------------------------------"
    echo "::endgroup::"
    echo " "
}

function setup() {
  echo "::group:: _Setup"
  gh auth login --with-token
  echo "Logged in with provided token"

  # find username and repo name
  REPO_INFO=($(echo ${GITHUB_REPOSITORY} | tr "/" "\n"))
  USERNAME=${REPO_INFO[0]}
  echo "Username: [${USERNAME}]"
  echo " "

  # get all repos, if specified
  if [ "${REPOSITORIES}" == "ALL" ]; then
      echo "Getting all repositories for [${USERNAME}]"
      REPOSITORIES=$(gh repo list ${USERNAME} --no-archived --json owner,name | jq -r '(.[] | .owner.login + "/" + .name)')
  fi
  echo "::endgroup::"
}

log_and_set_inputs
setup
for repository in "${REPOSITORIES[@]}"; do
    handle_repository "${repository}"
done

exit $STATUS
