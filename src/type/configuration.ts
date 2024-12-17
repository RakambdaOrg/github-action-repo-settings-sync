import {RepositoryActionsAccessPermissionsRequest, RepositoryActionsPermissionsRequest, RepositoryConfigurationRequest, RepositoryRulesetRequest} from "./github";

export type Configuration = {
    elements: AllElement[];
}

export type AllElement = ElementByProperty | ElementByAll;

export type ElementByProperty = Element & CustomProperty & {
    searchType: "property";
    org: true
}

export type ElementByAll = Element & {
    searchType: "all";
    org: boolean;
}

export type Element = {
    owner: string;
    exclude?: string[];
    features?: RepositoryConfigurationRequest;
    rulesets?: RepositoryRulesetRequest[];
    deleteRulesets?: string[];
    files?: FilesOperation<File>;
    mergeFiles?: FilesOperation<MergeFile>;
    actions?: {
        permissions?: RepositoryActionsPermissionsRequest;
        accessPermissions?: RepositoryActionsAccessPermissionsRequest;
        secrets?: {
            name: string;
            value?: string;
        }[];
    }
}

export type CustomProperty = {
    customPropertyName: string;
    /**
     * @nullable true
     */
    customPropertyValue?: string;
}

export type FilesOperation<T> = {
    branchName?: string;
    files: T[];
    committer?: { name?: string; email?: string; };
}

export type File = {
    /**
     * @nullable true
     */
    source?: string;
    destination: string;
}

export type MergeFile = {
    destination: string;
    type: "json" | "yml" | "yaml";
    conditions: MergeFileCondition[];
}

export type MergeFileCondition = CustomProperty & {
    source: string;
    type: "json" | "yml" | "yaml";
}