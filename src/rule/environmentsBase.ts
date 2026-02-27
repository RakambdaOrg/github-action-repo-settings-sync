import * as core from '@actions/core';
import { AllElement, Environment } from 'src/type/configuration.js';
import { RepositoryMetadata } from 'src/type/github.js';
import GithubWrapper from '../githubWrapper.js';
import { Rule } from '../rule.js';

export abstract class EnvironmentsBase implements Rule<Environment[]> {
    protected readonly github: GithubWrapper;

    protected constructor(github: GithubWrapper) {
        this.github = github;
    }

    abstract getName(): string;

    public extractData(element: AllElement): Environment[] | undefined {
        return element.environments;
    }

    public async canApply(_: RepositoryMetadata): Promise<string | undefined> {
        return undefined;
    }

    public async apply(repository: RepositoryMetadata, data: Environment[]): Promise<void> {
        envLoop: for (const environment of data) {
            for (const file of environment.conditions ?? []) {
                if (!this.github.hasProperty(repository.properties, file)) {
                    continue envLoop;
                }
            }
            core.info(`Handling environment '${environment.name}'`);
            await this.applyEnvironment(repository, environment);
        }
    }

    protected abstract applyEnvironment(_repository: RepositoryMetadata, _environment: Environment): Promise<void>;
}
