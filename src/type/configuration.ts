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
    file?: FilesOperation;
    actions?: {
        permissions?: RepositoryActionsPermissionsRequest;
        accessPermissions?: RepositoryActionsAccessPermissionsRequest;
        secrets?: {
            name: string;
            value?: string;
        }[];
    }
}

export interface ElementByProperty extends Element {
    searchType: "property";
    org: true
    customPropertyName: string;
    customPropertyValue: string;
}

export interface ElementByAll extends Element {
    searchType: "all";
    org: boolean;
}

export interface FilesOperation {
    branchName?: string;
    files: File[];
    committer?: { name?: string; email?: string; };
}

export interface File {
    source: string;
    destination: string;
}