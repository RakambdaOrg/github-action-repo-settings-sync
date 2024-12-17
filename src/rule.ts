import {RepositoryMetadata} from "./type/github";
import {AllElement} from "./type/configuration";

export interface Rule<T> {
    getName(): string;

    extractData(_: AllElement): T | undefined;

    canApply(_: RepositoryMetadata): Promise<string | undefined>;

    apply(_: RepositoryMetadata, __: T): Promise<void>;
}