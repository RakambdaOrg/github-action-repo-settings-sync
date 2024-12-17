import {RepositoryMetadata} from "src/type/github";
import {Rule} from "../rule";
import {RepositoryActionsPermissionsRequest} from "../type/github";
import GithubWrapper from "../githubWrapper";
import {AllElement} from "src/type/configuration";

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