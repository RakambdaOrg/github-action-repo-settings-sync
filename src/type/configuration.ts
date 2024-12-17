import {RepositoryActionsAccessPermissionsRequest, RepositoryActionsPermissionsRequest, RepositoryConfigurationRequest, RepositoryRulesetRequest} from "./github";

export type Configuration = {
    elements: AllElement[];
}

export type AllElement = ElementByAll | ElementByProperty;

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
    features?: RepositoryConfigurationRequest;
    rulesets?: RepositoryRulesetRequest[];
    deleteRulesets?: string[];
    files?: FilesOperation<File>;
    mergeFiles: MergeFilesOperation<MergeFile>;
    actions?: {
        permissions?: RepositoryActionsPermissionsRequest;
        accessPermissions?: RepositoryActionsAccessPermissionsRequest;
        secrets?: {
            name: string;
            value?: string;
        }[];
    }
}

export type  MergeFilesOperation<T> = FilesOperation<T> & { type: "json" | "yml" | "yaml" };

export type CustomProperty = {
    customPropertyName: string;
    customPropertyValue?: string;
}

export type FilesOperation<T> = {
    branchName?: string;
    files: T[];
    committer?: { name?: string; email?: string; };
}

export type File = {
    source: string;
    destination: string;
}

export type MergeFile = {
    destination: string;
    conditions: MergeFileCondition[];
}

export type MergeFileCondition = CustomProperty & {
    source: string;
    type: "json" | "yml" | "yaml";
}