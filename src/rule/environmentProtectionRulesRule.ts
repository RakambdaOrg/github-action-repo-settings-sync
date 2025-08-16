import * as core from '@actions/core';
import { BranchPolicyRequest, RepositoryMetadata } from 'src/type/github';
import GithubWrapper from '../githubWrapper';
import { EnvironmentsBase } from './environmentsBase';

export class EnvironmentProtectionRulesRule extends EnvironmentsBase {
    constructor(github: GithubWrapper) {
        super(github);
    }

    public getName(): string {
        return 'environment protection rules creation/update/disable';
    }

    protected async applyEnvironment(repository: RepositoryMetadata, environment: { name: string; branchPolicies?: BranchPolicyRequest[]; definition: { deployment_branch_policy?: { custom_branch_policies: boolean } | null } }): Promise<void> {
        if (!(environment.definition.deployment_branch_policy?.custom_branch_policies ?? false)) {
            core.info(`Skipped applying rules, custom branche policies are disabled in environment '${environment.name}'`);
            return;
        }
        if (!environment.branchPolicies) {
            core.info(`Skipped applying rules, no branch policies defined in environment '${environment.name}'`);
            return;
        }
        const currentPolicies = (await this.github.listRepositoryEnvironmentBranchPolicies(repository.owner, repository.name, environment.name)).filter((r) => r.name !== undefined && r.id !== undefined).map((r) => r as { id: number; name: string });

        await this.handleCreations(repository, environment.name, environment.branchPolicies, currentPolicies);
        await this.handleDeletions(repository, environment.name, environment.branchPolicies, currentPolicies);
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
            const policyRequested = branchPolicies.find((r) => r.name === policy.name);
            if (!policyRequested) {
                core.debug(`Branch policy '${policy.name}' will be disabled`);
                const result = await this.github.deleteRepositoryEnvironmentBranchPolicy(repository.owner, repository.name, environmentName, policy.id);
                core.debug(`Branch policy disable response is ${JSON.stringify(result)}`);
            }
        }
    }
}
