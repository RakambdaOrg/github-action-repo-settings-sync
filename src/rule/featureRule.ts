import {RepositoryMetadata} from "src/type/github";
import {Rule} from "../rule";
import {RepositoryConfigurationRequest} from "../type/github";
import * as core from "@actions/core";
import GithubWrapper from "../githubWrapper";
import {AllElement} from "src/type/configuration";

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

    public async canApply(_: RepositoryMetadata): Promise<string | undefined> {
        return undefined;
    }

    public async apply(repository: RepositoryMetadata, data: RepositoryConfigurationRequest): Promise<void> {
        const result = await this.github.editRepositoryConfiguration(repository.owner, repository.name, data);
        core.debug(`Features response is ${JSON.stringify(result)}`);
    }
}