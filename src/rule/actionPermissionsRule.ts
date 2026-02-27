import { AllElement } from 'src/type/configuration.js';
import { RepositoryMetadata } from 'src/type/github.js';
import GithubWrapper from '../githubWrapper.js';
import { Rule } from '../rule.js';
import { RepositoryActionsPermissionsRequest } from '../type/github.js';

export class ActionPermissionsRule implements Rule<RepositoryActionsPermissionsRequest> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'action permissions';
    }

    public extractData(element: AllElement): RepositoryActionsPermissionsRequest | undefined {
        return element.actions?.permissions;
    }

    public async canApply(_: RepositoryMetadata): Promise<string | undefined> {
        return undefined;
    }

    public async apply(repository: RepositoryMetadata, data: RepositoryActionsPermissionsRequest): Promise<void> {
        await this.github.editActionsPermissions(repository.owner, repository.name, data);
    }
}
