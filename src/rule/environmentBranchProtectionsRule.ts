import {EnvironmentRequest, RepositoryMetadata} from "src/type/github";
import {Rule} from "../rule";
import * as core from "@actions/core";
import GithubWrapper from "../githubWrapper";
import {AllElement, ProtectionRule} from "src/type/configuration";

export class EnvironmentBranchProtectionsRule implements Rule<{ name: string; definition: EnvironmentRequest; }[]> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'environment branch protection creation/update/deletion';
    }

    public extractData(element: AllElement): { name: string; definition: EnvironmentRequest; }[] | undefined {
        return element.environments;
    }

    public async canApply(_: RepositoryMetadata): Promise<string | undefined> {
        return undefined;
    }

    public async apply(repository: RepositoryMetadata, data: { name: string; protectionRules?: ProtectionRule[]; }[]): Promise<void> {
        for (const environment of data) {
            if (!environment.protectionRules) {
                continue;
            }
            core.info(`Handling environment '${environment.name}'`);
            const currentRules = await this.github.listRepositoryEnvironmentProtectionRules(repository.owner, repository.name, environment.name);

            await this.handleCreations(repository, environment.name, environment.protectionRules, currentRules);
            await this.handleDeletions(repository, environment.name, environment.protectionRules, currentRules);
        }
    }

    private async handleCreations(repository: RepositoryMetadata, environmentName: string, protectionRules: ProtectionRule[], currentRules: { enabled: boolean; app: { slug: string; }; }[]): Promise<void> {
        for (const rule of protectionRules) {
            const ruleExists = currentRules.find(r => r.enabled && r.app.slug === rule.slug);
            if (ruleExists) {
                core.debug(`Protection rule '${rule.slug}' already exists`);
            } else {
                core.debug(`Protection rule '${rule.slug}' will be created`);
                const result = await this.github.createRepositoryEnvironmentProtectionRule(repository.owner, repository.name, environmentName, rule);
                core.debug(`Protection rule creation response is ${JSON.stringify(result)}`);
            }
        }
    }

    private async handleDeletions(repository: RepositoryMetadata, environmentName: string, protectionRules: ProtectionRule[], currentRules: { id: number, enabled: boolean; app: { slug: string; }; }[]): Promise<void> {
        for (const rule of currentRules) {
            if (!rule.enabled) {
                continue;
            }
            const ruleDeleted = protectionRules.find(r => r.slug === rule.app.slug);
            if (ruleDeleted) {
                core.debug(`Protection rule '${rule.app.slug}' will be disabled`);
                const result = await this.github.deleteRepositoryEnvironmentProtectionRule(repository.owner, repository.name, environmentName, rule.id);
                core.debug(`Protection rule disable response is ${JSON.stringify(result)}`);
            }
        }
    }
}