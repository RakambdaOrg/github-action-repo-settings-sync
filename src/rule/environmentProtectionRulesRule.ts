import {BranchPolicyRequest, RepositoryMetadata} from "src/type/github";
import {Rule} from "../rule";
import * as core from "@actions/core";
import GithubWrapper from "../githubWrapper";
import {AllElement} from "src/type/configuration";

export class EnvironmentProtectionRulesRule implements Rule<{ name: string; branchPolicies?: BranchPolicyRequest[]; }[]> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'environment protection rules creation/update/disable';
    }

    public extractData(element: AllElement): { name: string; branchPolicies?: BranchPolicyRequest[]; }[] | undefined {
        return element.environments;
    }

    public async canApply(_: RepositoryMetadata): Promise<string | undefined> {
        return undefined;
    }

    public async apply(repository: RepositoryMetadata, data: { name: string; branchPolicies?: BranchPolicyRequest[]; }[]): Promise<void> {
        for (const environment of data) {
            if (!environment.branchPolicies) {
                continue;
            }
            core.info(`Handling environment '${environment.name}'`);
            const currentPolicies = await this.github.listRepositoryEnvironmentBranchPolicies(repository.owner, repository.name, environment.name);

            await this.handleCreations(repository, environment.name, environment.branchPolicies, currentPolicies);
            await this.handleDeletions(repository, environment.name, environment.branchPolicies, currentPolicies);
        }
    }

    private async handleCreations(repository: RepositoryMetadata, environmentName: string, branchPolicies: BranchPolicyRequest[], currentPolicies: { name: string; }[]): Promise<void> {
        for (const policy of branchPolicies) {
            const policyExists = currentPolicies.find(r => r.name === policy.name);
            if (policyExists) {
                core.debug(`Branch policy '${policy.name}' already exists`);
            } else {
                core.debug(`Branch policy '${policy.name}' will be created`);
                const result = await this.github.createRepositoryEnvironmentBranchPolicy(repository.owner, repository.name, environmentName, policy);
                core.debug(`Branch policy creation response is ${JSON.stringify(result)}`);
            }
        }
    }

    private async handleDeletions(repository: RepositoryMetadata, environmentName: string, branchPolicies: BranchPolicyRequest[], currentPolicies: { id: number; name: string; }[]): Promise<void> {
        for (const policy of currentPolicies) {
            const policyDeleted = branchPolicies.find(r => r.name === policy.name);
            if (policyDeleted) {
                core.debug(`Branch policy '${policy.name}' will be disabled`);
                const result = await this.github.deleteRepositoryEnvironmentBranchPolicy(repository.owner, repository.name, environmentName, policy.id);
                core.debug(`Branch policy disable response is ${JSON.stringify(result)}`);
            }
        }
    }
}