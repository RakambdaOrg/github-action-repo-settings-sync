import * as core from '@actions/core';
import { EnvironmentRequest, RepositoryMetadata } from 'src/type/github';
import GithubWrapper from '../githubWrapper';
import { EnvironmentsBase } from './environmentsBase';

export class EnvironmentsRule extends EnvironmentsBase {
    private readonly disallowedFreeProperties: (keyof EnvironmentRequest)[];

    constructor(github: GithubWrapper) {
        super(github);
        this.disallowedFreeProperties = [
            'wait_timer', // Keep format
            'prevent_self_review',
            'reviewers',
        ];
    }

    public getName(): string {
        return 'environments creation/update';
    }

    protected async applyEnvironment(repository: RepositoryMetadata, environment: { name: string; definition: EnvironmentRequest }): Promise<void> {
        core.debug(`Environment '${environment.name}' will be created/edited`);

        let actualDefinition = environment.definition;
        if (repository.private && repository.plan === 'free') {
            let degraded = false;
            for (const property of this.disallowedFreeProperties) {
                if (property in actualDefinition && actualDefinition[property] !== undefined) {
                    actualDefinition[property] = undefined;
                    degraded = true;
                }
            }
            if (degraded) {
                core.warning(`Degraded mode on repository ${repository.fullName} : Cannot set wait timer, prevent self review or reviewers on free plan`);
            }
        }

        const result = await this.github.createOrEditRepositoryEnvironment(repository.owner, repository.name, environment.name, environment.definition);
        core.debug(`Ruleset update response is ${JSON.stringify(result)}`);
    }
}
