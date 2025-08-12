import * as core from '@actions/core';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit, OctokitOptions } from '@octokit/core';
import { PaginateInterface, paginateRest } from '@octokit/plugin-paginate-rest';
import { RestEndpointMethodTypes, restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods';
import type { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types';
import { throttling } from '@octokit/plugin-throttling';
import _sodium from 'libsodium-wrappers';
import { CustomProperty } from './type/configuration';
import { BranchPolicyRequest, EnvironmentProtectionRuleRequest, EnvironmentRequest, RepositoryActionsAccessPermissionsRequest, RepositoryActionsPermissionsRequest, RepositoryConfigurationRequest, RepositoryMetadata, RepositoryRulesetRequest } from './type/github';

type RepositoryResponse = {
    id: number;
    name: string;
    full_name: string;
    archived?: boolean;
    private: boolean;
    owner: {
        login: string;
        type: string;
    };
    visibility?: string;
    default_branch?: string;
    html_url: string;
};

type FileContent = {
    type: 'dir' | 'file' | 'submodule' | 'symlink';
    sha: string;
    content?: string;
};

export default class GithubWrapper {
    private readonly octokit: Octokit & { paginate: PaginateInterface } & { rest: RestEndpointMethods };

    constructor(token?: string, appId?: string, appPrivateKey?: string, appInstallationId?: string) {
        // noinspection JSUnusedGlobalSymbols
        let octokitOptions: OctokitOptions = {
            throttle: {
                onRateLimit: (retryAfter: number) => {
                    core.debug(`Hit GitHub API rate limit, retrying after ${retryAfter}s`);
                    return true;
                },
                onSecondaryRateLimit: (retryAfter: number) => {
                    core.debug(`Hit secondary GitHub API rate limit, retrying after ${retryAfter}s`);
                    return true;
                },
            },
        };

        if (token) {
            octokitOptions = {
                auth: token,
                ...octokitOptions,
            };
        } else if (appId && appPrivateKey) {
            octokitOptions = {
                authStrategy: createAppAuth,
                auth: {
                    appId: appId,
                    privateKey: appPrivateKey,
                    installationId: appInstallationId,
                },
                ...octokitOptions,
            };
        }

        const MyOctokit = Octokit.plugin(paginateRest, throttling, restEndpointMethods);
        this.octokit = new MyOctokit(octokitOptions);
    }

    public async listRepositories(owner: string, org: boolean): Promise<RepositoryMetadata[]> {
        const repositoriesMetadata: RepositoryMetadata[] = [];

        let plan: string;
        let repositories: RepositoryResponse[];
        if (org) {
            const organization = await this.getOrganization(owner);
            plan = organization.plan?.name ?? 'free';
            repositories = await this.listAllOrgRepositories(owner);
        } else {
            const user = await this.getUser(owner);
            plan = user.plan?.name ?? 'free';
            repositories = await this.listAllUserRepositories(owner);
        }

        for (const repository of repositories) {
            const properties = repository.owner.type === 'Organization' ? await this.listRepositoryProperties(repository.owner.login, repository.name) : [];
            repositoriesMetadata.push({
                fullName: repository.full_name,
                name: repository.name,
                owner: repository.owner.login,
                ownerType: repository.owner.type,
                plan: plan,
                private: repository.private,
                properties: properties,
                visibility: repository.visibility ?? 'public',
                archived: repository.archived ?? false,
                defaultBranch: repository.default_branch,
                html_url: repository.html_url,
            });
        }
        return repositoriesMetadata;
    }

    private async getOrganization(org: string): Promise<{ plan?: { name: string } }> {
        return (
            await this.octokit.rest.orgs.get({
                org: org,
            })
        ).data;
    }

    private async getUser(user: string): Promise<{ plan?: { name: string } }> {
        return (
            await this.octokit.rest.users.getByUsername({
                username: user,
            })
        ).data;
    }

    private async listAllOrgRepositories(orgName: string): Promise<RepositoryResponse[]> {
        return await this.octokit.paginate(this.octokit.rest.repos.listForOrg, {
            org: orgName,
            sort: 'full_name',
            per_page: 100,
        });
    }

    private async listAllUserRepositories(user: string): Promise<RepositoryResponse[]> {
        return await this.octokit.paginate(this.octokit.rest.repos.listForUser, {
            username: user,
            sort: 'full_name',
            per_page: 100,
        });
    }

    private async listRepositoryProperties(owner: string, repo: string): Promise<{ property_name: string; value: string | string[] | null }[]> {
        return await this.octokit.paginate(this.octokit.rest.repos.getCustomPropertiesValues, {
            owner: owner,
            repo: repo,
            per_page: 100,
        });
    }

    public async editRepositoryConfiguration(owner: string, repo: string, parameters: RepositoryConfigurationRequest): Promise<RepositoryResponse> {
        return (
            await this.octokit.rest.repos.update({
                ...parameters,
                owner: owner,
                repo: repo,
            })
        ).data;
    }

    public async listRepositoryRulesets(owner: string, repo: string): Promise<{ id: number; name: string }[]> {
        return await this.octokit.paginate(this.octokit.rest.repos.getRepoRulesets, {
            owner: owner,
            repo: repo,
            per_page: 100,
        });
    }

    public async createRepositoryRuleset(owner: string, repo: string, parameters: RepositoryRulesetRequest): Promise<{ id: number; name: string }> {
        return (
            await this.octokit.rest.repos.createRepoRuleset({
                ...parameters,
                owner: owner,
                repo: repo,
            })
        ).data;
    }

    public async editRepositoryRuleset(owner: string, repo: string, id: number, parameters: RepositoryRulesetRequest): Promise<{ id: number; name: string }> {
        return (
            await this.octokit.rest.repos.updateRepoRuleset({
                ...parameters,
                ruleset_id: id,
                owner: owner,
                repo: repo,
            })
        ).data;
    }

    public async deleteRepositoryRuleset(owner: string, repo: string, id: number): Promise<void> {
        await this.octokit.rest.repos.deleteRepoRuleset({
            ruleset_id: id,
            owner: owner,
            repo: repo,
        });
    }

    public async editActionsPermissions(owner: string, repo: string, parameters: RepositoryActionsPermissionsRequest): Promise<void> {
        await this.octokit.rest.actions.setGithubActionsPermissionsRepository({
            ...parameters,
            owner: owner,
            repo: repo,
        });
    }

    public async editActionsPermissionsAccess(owner: string, repo: string, parameters: RepositoryActionsAccessPermissionsRequest): Promise<void> {
        await this.octokit.rest.actions.setWorkflowAccessToRepository({
            ...parameters,
            owner: owner,
            repo: repo,
        });
    }

    public async listRepositoryActionSecret(owner: string, repo: string): Promise<{ name: string }[]> {
        return await this.octokit.paginate(this.octokit.rest.actions.listRepoSecrets, {
            owner: owner,
            repo: repo,
            per_page: 100,
        });
    }

    public async deleteActionSecret(owner: string, repo: string, name: string): Promise<void> {
        await this.octokit.rest.actions.deleteRepoSecret({
            secret_name: name,
            owner: owner,
            repo: repo,
        });
    }

    public async editActionSecret(owner: string, repo: string, keyId: string, key: string, name: string, value: string): Promise<void> {
        const encryptedValue = await this.encryptValue(key, value);

        await this.octokit.rest.actions.createOrUpdateRepoSecret({
            encrypted_value: encryptedValue,
            key_id: keyId,
            secret_name: name,
            owner: owner,
            repo: repo,
        });
    }

    public async getRepositoryPublicKey(owner: string, repo: string): Promise<{ key_id: string; key: string }> {
        return (
            await this.octokit.rest.actions.getRepoPublicKey({
                owner: owner,
                repo: repo,
            })
        ).data;
    }

    public async listRepositoryBranches(owner: string, repo: string): Promise<{ name: string; commit: { sha: string } }[]> {
        return await this.octokit.paginate(this.octokit.rest.repos.listBranches, {
            owner: owner,
            repo: repo,
            per_page: 100,
        });
    }

    public async getFileMeta(owner: string, repo: string, path: string, ref?: string): Promise<FileContent> {
        const result = (
            await this.octokit.rest.repos.getContent({
                owner: owner,
                repo: repo,
                path: path,
                ref: ref,
            })
        ).data;

        if (result.constructor !== Object) {
            throw new Error("This shouldn't happen");
        }

        const resultObj = result as FileContent;
        return {
            ...resultObj,
            content: resultObj.content && this.decodeBase64(resultObj.content),
        };
    }

    public async editFile(owner: string, repo: string, path: string, message: string, content: string, sha?: string, branch?: string, committer?: { name: string; email: string }): Promise<{ commit: { sha?: string; html_url?: string } }> {
        const encodedContent = this.encodeBase64(content);

        return (
            await this.octokit.rest.repos.createOrUpdateFileContents({
                owner: owner,
                repo: repo,
                path: path,
                message: message,
                content: encodedContent,
                sha: sha,
                branch: branch,
                committer: committer,
            })
        ).data;
    }

    public async deleteFile(owner: string, repo: string, path: string, message: string, sha: string, branch?: string, committer?: { name: string; email: string }): Promise<{ commit: { sha?: string; html_url?: string } }> {
        return (
            await this.octokit.rest.repos.deleteFile({
                owner: owner,
                repo: repo,
                path: path,
                message: message,
                sha: sha,
                branch: branch,
                committer: committer,
            })
        ).data;
    }

    public async listRepositoryEnvironments(owner: string, repo: string): Promise<{ id: number; name: string }[]> {
        return (
            (
                await this.octokit.rest.repos.getAllEnvironments({
                    owner: owner,
                    repo: repo,
                    per_page: 100,
                })
            ).data.environments ?? []
        );
    }

    public async deleteRepositoryEnvironment(owner: string, repo: string, name: string): Promise<void> {
        await this.octokit.rest.repos.deleteAnEnvironment({
            environment_name: name,
            owner: owner,
            repo: repo,
        });
    }

    public async createOrEditRepositoryEnvironment(owner: string, repo: string, name: string, parameters: EnvironmentRequest): Promise<{ id: number; name: string }> {
        return (
            await this.octokit.rest.repos.createOrUpdateEnvironment({
                ...parameters,
                environment_name: name,
                owner: owner,
                repo: repo,
            })
        ).data;
    }

    public async listRepositoryEnvironmentProtectionRules(owner: string, repo: string, environment: string): Promise<{ id: number; enabled: boolean; app: { slug: string } }[]> {
        return (
            (
                await this.octokit.rest.repos.getAllDeploymentProtectionRules({
                    environment_name: environment,
                    owner: owner,
                    repo: repo,
                    per_page: 100,
                })
            ).data.custom_deployment_protection_rules ?? []
        );
    }

    public async createRepositoryEnvironmentProtectionRule(owner: string, repo: string, environment: string, parameters: EnvironmentProtectionRuleRequest): Promise<RestEndpointMethodTypes['repos']['createDeploymentProtectionRule']['response']['data']> {
        return (
            await this.octokit.rest.repos.createDeploymentProtectionRule({
                ...parameters,
                environment_name: environment,
                owner: owner,
                repo: repo,
            })
        ).data;
    }

    public async deleteRepositoryEnvironmentProtectionRule(owner: string, repo: string, environment: string, id: number): Promise<void> {
        await this.octokit.rest.repos.disableDeploymentProtectionRule({
            environment_name: environment,
            protection_rule_id: id,
            owner: owner,
            repo: repo,
        });
    }

    public async listRepositoryEnvironmentBranchPolicies(owner: string, repo: string, environment: string): Promise<{ id?: number; name?: string }[]> {
        return (
            await this.octokit.rest.repos.listDeploymentBranchPolicies({
                environment_name: environment,
                owner: owner,
                repo: repo,
                per_page: 100,
            })
        ).data.branch_policies;
    }

    public async createRepositoryEnvironmentBranchPolicy(owner: string, repo: string, environment: string, parameters: BranchPolicyRequest): Promise<RestEndpointMethodTypes['repos']['createDeploymentBranchPolicy']['response']['data']> {
        return (
            await this.octokit.rest.repos.createDeploymentBranchPolicy({
                ...parameters,
                environment_name: environment,
                owner: owner,
                repo: repo,
            })
        ).data;
    }

    public async deleteRepositoryEnvironmentBranchPolicy(owner: string, repo: string, environment: string, id: number): Promise<void> {
        await this.octokit.rest.repos.deleteDeploymentBranchPolicy({
            environment_name: environment,
            branch_policy_id: id,
            owner: owner,
            repo: repo,
        });
    }

    public async getRepositoryEnvironmentPublicKey(owner: string, repo: string, environment: string): Promise<{ key_id: string; key: string }> {
        return (
            await this.octokit.rest.actions.getEnvironmentPublicKey({
                owner: owner,
                repo: repo,
                environment_name: environment,
            })
        ).data;
    }

    public async listRepositoryEnvironmentSecret(owner: string, repo: string, environment: string): Promise<{ name: string }[]> {
        return await this.octokit.paginate(this.octokit.rest.actions.listEnvironmentSecrets, {
            environment_name: environment,
            owner: owner,
            repo: repo,
            per_page: 100,
        });
    }

    public async deleteEnvironmentSecret(owner: string, repo: string, environment: string, name: string): Promise<void> {
        await this.octokit.rest.actions.deleteEnvironmentSecret({
            environment_name: environment,
            secret_name: name,
            owner: owner,
            repo: repo,
        });
    }

    public async editEnvironmentSecret(owner: string, repo: string, environment: string, keyId: string, key: string, name: string, value: string): Promise<void> {
        const encryptedValue = await this.encryptValue(key, value);

        await this.octokit.rest.actions.createOrUpdateEnvironmentSecret({
            encrypted_value: encryptedValue,
            key_id: keyId,
            environment_name: environment,
            secret_name: name,
            owner: owner,
            repo: repo,
        });
    }

    private async encryptValue(key: string, value: string): Promise<string> {
        await _sodium.ready;
        const sodium = _sodium;

        const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
        const binVal = sodium.from_string(value);
        const encBytes = sodium.crypto_box_seal(binVal, binKey);
        return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
    }

    private encodeBase64(content: string): string {
        return Buffer.from(content).toString('base64');
    }

    private decodeBase64(content: string): string {
        return Buffer.from(content, 'base64').toString();
    }

    public hasProperty(properties: { property_name: string; value: string | string[] | null }[], property: CustomProperty): boolean {
        if (property.customPropertyValue === undefined || property.customPropertyValue === null) {
            if (!properties.some((p) => p.property_name === property.customPropertyName)) {
                return true;
            }
        }

        return properties.some((prop) => {
            if (prop.property_name !== property.customPropertyName) {
                return false;
            }
            if (prop.value === null) {
                return property.customPropertyValue === null;
            }
            if (prop.value.constructor === Array) {
                const arrayValue = prop.value as string[];
                return arrayValue.some((v) => v === property.customPropertyValue);
            }
            return prop.value === property.customPropertyValue;
        });
    }
}
