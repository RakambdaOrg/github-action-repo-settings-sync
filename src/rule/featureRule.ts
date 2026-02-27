import * as core from '@actions/core';
import { AllElement } from 'src/type/configuration.js';
import { RepositoryMetadata } from 'src/type/github.js';
import GithubWrapper from '../githubWrapper.js';
import { Rule } from '../rule.js';
import { RepositoryConfigurationRequest } from '../type/github.js';

export class FeatureRule implements Rule<RepositoryConfigurationRequest> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'feature';
    }

    public extractData(element: AllElement): RepositoryConfigurationRequest | undefined {
        return element.features;
    }

    public async canApply(repository: RepositoryMetadata): Promise<string | undefined> {
        return (repository.archived ?? true) ? 'Repository is archived' : undefined;
    }

    public async apply(repository: RepositoryMetadata, data: RepositoryConfigurationRequest): Promise<void> {
        const result = await this.github.editRepositoryConfiguration(repository.owner, repository.name, data);
        core.debug(`Features response is ${JSON.stringify(result)}`);
    }
}
