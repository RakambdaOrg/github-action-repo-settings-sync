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
    /**
     * @nullable true
     */
    features?: RepositoryConfigurationRequest;
    /**
     * @nullable true
     */
    rulesets?: RepositoryRulesetRequest[];
    /**
     * @nullable true
     */
    deleteRulesets?: string[];
    /**
     * @nullable true
     */
    files?: FilesOperation<File>;
    /**
     * @nullable true
     */
    mergeFiles?: FilesOperation<MergeFile>;
    /**
     * @nullable true
     */
    actions?: {
        /**
         * @nullable true
         */
        permissions?: RepositoryActionsPermissionsRequest;
        /**
         * @nullable true
         */
        accessPermissions?: RepositoryActionsAccessPermissionsRequest;
        /**
         * @nullable true
         */
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
    /**
     * @nullable true
     */
    branchName?: string;
    files: T[];
    /**
     * @nullable true
     */
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