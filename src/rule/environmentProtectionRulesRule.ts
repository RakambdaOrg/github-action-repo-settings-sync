import * as core from '@actions/core';
import { AllElement } from 'src/type/configuration';
import { BranchPolicyRequest, RepositoryMetadata } from 'src/type/github';
import GithubWrapper from '../githubWrapper';
import { Rule } from '../rule';

export class EnvironmentProtectionRulesRule implements Rule<{ name: string; branchPolicies?: BranchPolicyRequest[] }[]> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'environment protection rules creation/update/disable';
    }

    public extractData(element: AllElement): { name: string; branchPolicies?: BranchPolicyRequest[] }[] | undefined {
        return element.environments;
    }

    public async canApply(_: RepositoryMetadata): Promise<string | undefined> {
        return undefined;
    }

    public async apply(repository: RepositoryMetadata, data: { name: string; branchPolicies?: BranchPolicyRequest[]; definition: { deployment_branch_policy?: { custom_branch_policies?: boolean } } }[]): Promise<void> {
        for (const environment of data) {
            if (!(environment.definition.deployment_branch_policy?.custom_branch_policies ?? false)) {
                core.info(`Skipped applying rules, custom branche policies are disabled in environment '${environment.name}'`);
                continue;
            }
            if (!environment.branchPolicies) {
                core.info(`Skipped applying rules, no branch policies defined in environment '${environment.name}'`);
                continue;
            }
            core.info(`Handling environment '${environment.name}'`);
            const currentPolicies = (await this.github.listRepositoryEnvironmentBranchPolicies(repository.owner, repository.name, environment.name)).filter((r) => r.name !== undefined && r.id !== undefined).map((r) => r as { id: number; name: string });

            await this.handleCreations(repository, environment.name, environment.branchPolicies, currentPolicies);
            await this.handleDeletions(repository, environment.name, environment.branchPolicies, currentPolicies);
        }
    }

    private async handleCreations(repository: RepositoryMetadata, environmentName: string, branchPolicies: BranchPolicyRequest[], currentPolicies: { name: string }[]): Promise<void> {
        for (const policy of branchPolicies) {
            const policyExists = currentPolicies.find((r) => r.name === policy.name);
            if (policyExists) {
                core.debug(`Branch policy '${policy.name}' already exists`);
            } else {
                core.debug(`Branch policy '${policy.name}' will be created`);
                const result = await this.github.createRepositoryEnvironmentBranchPolicy(repository.owner, repository.name, environmentName, policy);
                core.debug(`Branch policy creation response is ${JSON.stringify(result)}`);
            }
        }
    }

    private async handleDeletions(repository: RepositoryMetadata, environmentName: string, branchPolicies: BranchPolicyRequest[], currentPolicies: { id: number; name: string }[]): Promise<void> {
        for (const policy of currentPolicies) {
            const policyDeleted = branchPolicies.find((r) => r.name === policy.name);
            if (policyDeleted) {
                core.debug(`Branch policy '${policy.name}' will be disabled`);
                const result = await this.github.deleteRepositoryEnvironmentBranchPolicy(repository.owner, repository.name, environmentName, policy.id);
                core.debug(`Branch policy disable response is ${JSON.stringify(result)}`);
            }
        }
    }
}
