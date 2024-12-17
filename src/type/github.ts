export interface RepositoryMetadata {
    archived: boolean;
    fullName: string;
    name: string;
    owner: string;
    ownerType: string;
    plan: string;
    private: boolean;
    properties: { property_name: string, value: string | string[] | null }[]
    visibility: string
}

export interface RepositoryConfigurationRequest {
    has_issues?: boolean;
    has_projects?: boolean;
    has_wiki?: boolean;
    has_discussions?: boolean;
    is_template?: boolean;
    allow_squash_merge?: boolean;
    allow_merge_commit?: boolean;
    allow_rebase_merge?: boolean;
    allow_auto_merge?: boolean;
    delete_branch_on_merge?: boolean;
    allow_update_branch?: boolean;
    use_squash_pr_title_as_default?: boolean;
    squash_merge_commit_title?: "PR_TITLE" | "COMMIT_OR_PR_TITLE";
    squash_merge_commit_message?: "PR_BODY" | "COMMIT_MESSAGES" | "BLANK";
    merge_commit_title?: "PR_TITLE" | "MERGE_MESSAGE";
    merge_commit_message?: "PR_BODY" | "PR_TITLE" | "BLANK";
}

export type RepositoryRulesetRequest = {
    name: string;
    target?: "branch" | "tag" | "push";
    enforcement: "disabled" | "active" | "evaluate";
    bypass_actors?: RuleActor[] | undefined;
    conditions?: RuleConditions;
    rules?: AnyRuleRule[];
};

type AnyRuleRule = SimpleRuleRule | UpdateRuleRule | WorkflowsRuleRule | MaxFileSizeRuleRule | RequiredDeploymentsRuleRule | FileExtensionRestrictionRuleRule | PullRequestRuleRule | MaxFilePathLengthRuleRule | RequiredStatusChecksRuleRule | PatternRuleRule | FilePathRestrictionRuleRule;

export interface RuleActor {
    actor_id?: number | null | undefined;
    actor_type: "Integration" | "OrganizationAdmin" | "RepositoryRole" | "Team" | "DeployKey";
    bypass_mode: "always" | "pull_request";
}

export interface RuleConditions {
    ref_name?: {
        include?: string[];
        exclude?: string[];
    };
}

export interface SimpleRuleRule {
    type: "creation" | "deletion" | "required_linear_history" | "required_signatures" | "non_fast_forward";
}

export interface UpdateRuleRule {
    type: "update";
    parameters: {
        update_allows_fetch_and_merge: boolean;
    }
}

export interface MergeQueueRuleRule {
    type: "merge_queue";
    parameters: {
        check_response_timeout_minutes: number;
        grouping_strategy: "ALLGREEN" | "HEADGREEN";
        max_entries_to_build: number;
        max_entries_to_merge: number;
        merge_method: "MERGE" | "SQUASH" | "REBASE";
        min_entries_to_merge: number;
        min_entries_to_merge_wait_minutes: number;
    }
}

export interface RequiredDeploymentsRuleRule {
    type: "required_deployments";
    parameters: {
        required_deployment_environments: string[];
    }
}

export interface PullRequestRuleRule {
    type: "pull_request";
    parameters: {
        allowed_merge_methods?: string[];
        dismiss_stale_reviews_on_push: boolean;
        require_code_owner_review: boolean;
        require_last_push_approval: boolean;
        required_approving_review_count: number;
        required_review_thread_resolution: boolean;
    }
}

export interface RequiredStatusChecksRuleRule {
    type: "required_status_checks";
    parameters: {
        do_not_enforce_on_create?: boolean;
        required_status_checks: {
            context: string;
            integration_id?: number;
        }[];
        strict_required_status_checks_policy: boolean;
    }
}

export interface PatternRuleRule {
    type: "commit_message_pattern" | "commit_author_email_pattern" | "committer_email_pattern" | "branch_name_pattern" | "tag_name_pattern";
    parameters: {
        name?: string;
        negate?: boolean;
        operator: "starts_with" | "ends_with" | "contains" | "regex";
        pattern: string;
    };
}

export interface FilePathRestrictionRuleRule {
    type: "file_path_restriction";
    parameters: {
        restricted_file_paths: string[];
    };
}

export interface FileExtensionRestrictionRuleRule {
    type: "file_extension_restriction";
    parameters: {
        restricted_file_extensions: string[];
    };
}

export interface MaxFilePathLengthRuleRule {
    type: "max_file_path_length";
    parameters: {
        max_file_path_length: number;
    };
}

export interface MaxFileSizeRuleRule {
    type: "max_file_size";
    parameters: {
        max_file_size: number;
    };
}

export interface WorkflowsRuleRule {
    type: "workflows";
    parameters: {
        do_not_enforce_on_create?: boolean;
        workflows: {
            path: string;
            ref?: string;
            repository_id: number;
            sha?: string;
        }[];
    };
}


export interface CodeScanningRuleRule {
    type: "code_scanning";
    parameters: {
        code_scanning_tools: {
            alerts_threshold: "none" | "errors" | "errors_and_warnings" | "all";
            security_alerts_threshold: "none" | "critical" | "high_or_higher" | "medium_or_higher" | "all";
            tool: string;
        }[];
    };
}

export interface RepositoryActionsPermissionsRequest {
    enabled: boolean;
    allowed_actions?: "all" | "local_only" | "selected";
}

export interface RepositoryActionsAccessPermissionsRequest {
    access_level: "none" | "user" | "organization";
}
