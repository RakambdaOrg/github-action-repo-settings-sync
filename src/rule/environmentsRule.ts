import {EnvironmentRequest, RepositoryMetadata} from "src/type/github";
import {Rule} from "../rule";
import * as core from "@actions/core";
import GithubWrapper from "../githubWrapper";
import {AllElement} from "src/type/configuration";

export class EnvironmentsRule implements Rule<{ name: string; definition: EnvironmentRequest; }[]> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'environments creation/update';
    }

    public extractData(element: AllElement): { name: string; definition: EnvironmentRequest; }[] | undefined {
        return element.environments;
    }

    public async canApply(_: RepositoryMetadata): Promise<string | undefined> {
        return undefined;
    }

    public async apply(repository: RepositoryMetadata, data: { name: string; definition: EnvironmentRequest; }[]): Promise<void> {
        for (const environment of data) {
            core.info(`Handling environment '${environment.name}'`);

            core.debug(`Environment '${environment.name}' will be created/edited`);
            const result = await this.github.createOrEditRepositoryEnvironment(repository.owner, repository.name, environment.name, environment.definition);
            core.debug(`Ruleset update response is ${JSON.stringify(result)}`);
        }
    }
}