import * as core from '@actions/core';
import { EnvironmentRequest, RepositoryMetadata } from 'src/type/github';
import GithubWrapper from '../githubWrapper';
import { EnvironmentsBase } from './environmentsBase';

export class EnvironmentsRule extends EnvironmentsBase {
    constructor(github: GithubWrapper) {
        super(github);
    }

    public getName(): string {
        return 'environments creation/update';
    }

    protected async applyEnvironment(repository: RepositoryMetadata, environment: { name: string; definition: EnvironmentRequest }): Promise<void> {
        core.debug(`Environment '${environment.name}' will be created/edited`);
        const result = await this.github.createOrEditRepositoryEnvironment(repository.owner, repository.name, environment.name, environment.definition);
        core.debug(`Ruleset update response is ${JSON.stringify(result)}`);
    }
}
