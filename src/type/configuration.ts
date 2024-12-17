import {RepositoryActionsAccessPermissionsRequest, RepositoryActionsPermissionsRequest, RepositoryConfigurationRequest, RepositoryRulesetRequest} from "./github";

export interface Configuration {
    elements: AllElement[];
}

export type AllElement = ElementByAll | ElementByProperty;

export interface Element {
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

export interface ElementByProperty extends Element {
    searchType: "property";
    org: true
    customPropertyName: string;
    customPropertyValue?: string;
}

export interface ElementByAll extends Element {
    searchType: "all";
    org: boolean;
}

export interface FilesOperation<T> {
    branchName?: string;
    files: T[];
    committer?: { name?: string; email?: string; };
}

export interface File {
    source: string;
    destination: string;
}

export interface MergeFile {
    destination: string;
    conditions: MergeFileCondition[];
}

export interface MergeFileCondition {
    source: string;
    type: "json" | "yml" | "yaml";
    customPropertyName: string;
    customPropertyValue: string;
}