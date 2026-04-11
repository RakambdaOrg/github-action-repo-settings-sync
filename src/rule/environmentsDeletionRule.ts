import { AllElement } from '@/type/configuration.js';
import { RepositoryMetadata } from '@/type/github.js';
import * as core from '@actions/core';
import GithubWrapper from '../githubWrapper.js';
import { Rule } from '../rule.js';

export class EnvironmentsDeletionRule implements Rule<string[]> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'environments deletion';
    }

    public extractData(element: AllElement): string[] | undefined {
        return element.deleteEnvironments;
    }

    public async canApply(_: RepositoryMetadata): Promise<string | undefined> {
        return undefined;
    }

    public async apply(repository: RepositoryMetadata, data: string[]): Promise<void> {
        const currentEnvironments = await this.github.listRepositoryEnvironments(repository.owner, repository.name);
        for (const environmentName of data) {
            core.info(`Handling environment '${environmentName}'`);
            const previousEnvironment = currentEnvironments.find((r) => r.name === environmentName);
            if (!previousEnvironment) {
                core.warning(`Environment '${environmentName}' does not exists on ${repository.fullName}`);
                continue;
            }

            await this.github.deleteRepositoryEnvironment(repository.owner, repository.name, previousEnvironment.name);
        }
    }
}
