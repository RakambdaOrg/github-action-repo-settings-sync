import {RepositoryMetadata} from "./type/github";
import {AllElement} from "./type/configuration";

export interface Rule<T> {
    getName(): string;

    extractData(element: AllElement): T | undefined;

    canApply(repository: RepositoryMetadata): Promise<string | undefined>;

    apply(repository: RepositoryMetadata, data: T): Promise<void>;
}