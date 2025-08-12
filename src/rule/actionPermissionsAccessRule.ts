import { AllElement } from 'src/type/configuration';
import { RepositoryMetadata } from 'src/type/github';
import GithubWrapper from '../githubWrapper';
import { Rule } from '../rule';
import { RepositoryActionsAccessPermissionsRequest } from '../type/github';

export class ActionPermissionsAccessRule implements Rule<RepositoryActionsAccessPermissionsRequest> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'action permissions access';
    }

    public extractData(element: AllElement): RepositoryActionsAccessPermissionsRequest | undefined {
        return element.actions?.accessPermissions;
    }

    public async canApply(repository: RepositoryMetadata): Promise<string | undefined> {
        return repository.visibility === 'private' || repository.visibility === 'internal' ? undefined : 'Repository must be private or internal';
    }

    public async apply(repository: RepositoryMetadata, data: RepositoryActionsAccessPermissionsRequest): Promise<void> {
        await this.github.editActionsPermissionsAccess(repository.owner, repository.name, data);
    }
}
