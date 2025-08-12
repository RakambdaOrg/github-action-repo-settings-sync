import { AllElement } from './type/configuration';
import { RepositoryMetadata } from './type/github';

export interface Rule<T> {
    getName(): string;

    extractData(_: AllElement): T | undefined;

    canApply(_: RepositoryMetadata): Promise<string | undefined>;

    apply(_: RepositoryMetadata, __: T): Promise<void>;
}
