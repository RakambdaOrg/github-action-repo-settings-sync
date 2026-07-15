import { AllElement } from '@/type/configuration.js';
import { RepositoryCodeQuality, RepositoryMetadata } from '@/type/github.js';
import * as core from '@actions/core';
import GithubWrapper from '../githubWrapper.js';
import { Rule } from '../rule.js';

type Data = { name: string; value?: string };

export class CodeQuality implements Rule<RepositoryCodeQuality> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'code quality';
    }

    public extractData(element: AllElement): RepositoryCodeQuality | undefined {
        return element.codeQuality;
    }

    public async canApply(_: RepositoryMetadata): Promise<string | undefined> {
        return undefined;
    }

    public async apply(repository: RepositoryMetadata, data: RepositoryCodeQuality): Promise<void> {
        core.debug('Setting code quality settings');
        const result = await this.github.setCodeQualityConfiguration(repository.owner, repository.name, data);
        core.debug(`Setting code quality response is ${JSON.stringify(result)}`);
    }
}
