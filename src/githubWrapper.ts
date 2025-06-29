import {Octokit, OctokitOptions} from "@octokit/core";
import {createAppAuth} from "@octokit/auth-app";
import {PaginateInterface, paginateRest} from "@octokit/plugin-paginate-rest";
import {throttling} from "@octokit/plugin-throttling";
import {BranchPolicyRequest, EnvironmentProtectionRuleRequest, EnvironmentRequest, RepositoryActionsAccessPermissionsRequest, RepositoryActionsPermissionsRequest, RepositoryConfigurationRequest, RepositoryMetadata, RepositoryRulesetRequest} from "./type/github";
import * as core from '@actions/core';
import _sodium from 'libsodium-wrappers';
import {CustomProperty} from "./type/configuration";

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
    type: "dir" | "file" | "submodule" | "symlink";
    sha: string;
    content?: string;
};

export default class GithubWrapper {
    private readonly octokit: Octokit & { paginate: PaginateInterface };

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
                }
            }
        };

        if (token) {
            octokitOptions = {
                auth: token,
                ...octokitOptions
            };
        } else if (appId && appPrivateKey) {
            octokitOptions = {
                authStrategy: createAppAuth,
                auth: {
                    appId: appId,
                    privateKey: appPrivateKey,
                    installationId: appInstallationId,
                },
                ...octokitOptions
            };
        }

        const MyOctokit = Octokit.plugin(paginateRest, throttling);
        this.octokit = new MyOctokit(octokitOptions);
    }

    public async listRepositories(owner: string, org: boolean): Promise<RepositoryMetadata[]> {
        const repositoriesMetadata: RepositoryMetadata[] = [];

        let plan: string;
        let repositories: RepositoryResponse[];
        if (org) {
            const organization = await this.getOrganization(owner);
            plan = organization.plan?.name ?? "free";
            repositories = await this.listAllOrgRepositories(owner);
        } else {
            const user = await this.getUser(owner);
            plan = user.plan?.name ?? "free";
            repositories = await this.listAllUserRepositories(owner);
        }

        for (const repository of repositories) {
            const properties = repository.owner.type === "Organization" ? await this.listRepositoryProperties(repository.owner.login, repository.name) : [];
            repositoriesMetadata.push({
                fullName: repository.full_name,
                name: repository.name,
                owner: repository.owner.login,
                ownerType: repository.owner.type,
                plan: plan,
                private: repository.private,
                properties: properties,
                visibility: repository.visibility ?? "public",
                archived: repository.archived ?? false,
                defaultBranch: repository.default_branch,
                html_url: repository.html_url
            });
        }
        return repositoriesMetadata;
    }

    private async getOrganization(org: string): Promise<{ plan?: { name: string } }> {
        return (await this.octokit.request("GET /orgs/{org}", {
            org: org,
        })).data;
    }

    private async getUser(user: string): Promise<{ plan?: { name: string } }> {
        return (await this.octokit.request("GET /users/{user}", {
            user: user,
        })).data;
    }

    private async listAllOrgRepositories(orgName: string): Promise<RepositoryResponse[]> {
        return await this.octokit.paginate("GET /orgs/{org}/repos", {
            org: orgName,
            sort: 'full_name',
            per_page: 100
        });
    }

    private async listAllUserRepositories(user: string): Promise<RepositoryResponse[]> {
        return await this.octokit.paginate("GET /users/{user}/repos", {
            user: user,
            sort: 'full_name',
            per_page: 100
        });
    }

    private async listRepositoryProperties(owner: string, repo: string): Promise<{ property_name: string, value: string | string[] | null }[]> {
        return await this.octokit.paginate("GET /repos/{owner}/{repo}/properties/values", {
            owner: owner,
            repo: repo,
            per_page: 100
        });
    }

    public async editRepositoryConfiguration(owner: string, repo: string, parameters: RepositoryConfigurationRequest): Promise<RepositoryResponse> {
        return (await this.octokit.request("PATCH /repos/{owner}/{repo}", {
            ...parameters,
            owner: owner,
            repo: repo,
        })).data;
    }

    public async listRepositoryRulesets(owner: string, repo: string): Promise<{ id: number; name: string; }[]> {
        return await this.octokit.paginate("GET /repos/{owner}/{repo}/rulesets", {
            owner: owner,
            repo: repo,
            per_page: 100
        });
    }

    public async createRepositoryRuleset(owner: string, repo: string, parameters: RepositoryRulesetRequest): Promise<{ id: number; name: string; }> {
        return (await this.octokit.request("POST /repos/{owner}/{repo}/rulesets", {
            ...parameters,
            owner: owner,
            repo: repo,
        })).data;
    }

    public async editRepositoryRuleset(owner: string, repo: string, id: number, parameters: RepositoryRulesetRequest): Promise<{ id: number; name: string; }> {
        return (await this.octokit.request("PUT /repos/{owner}/{repo}/rulesets/{id}", {
            ...parameters,
            id: id,
            owner: owner,
            repo: repo,
        })).data;
    }

    public async deleteRepositoryRuleset(owner: string, repo: string, id: number): Promise<void> {
        await this.octokit.request("DELETE /repos/{owner}/{repo}/rulesets/{id}", {
            id: id,
            owner: owner,
            repo: repo,
        });
    }

    public async editActionsPermissions(owner: string, repo: string, parameters: RepositoryActionsPermissionsRequest): Promise<void> {
        await this.octokit.request("PUT /repos/{owner}/{repo}/actions/permissions", {
            ...parameters,
            owner: owner,
            repo: repo,
        });
    }

    public async editActionsPermissionsAccess(owner: string, repo: string, parameters: RepositoryActionsAccessPermissionsRequest): Promise<void> {
        await this.octokit.request("PUT /repos/{owner}/{repo}/actions/permissions/access", {
            ...parameters,
            owner: owner,
            repo: repo,
        });
    }

    public async listRepositoryActionSecret(owner: string, repo: string): Promise<{ name: string }[]> {
        return await this.octokit.paginate("GET /repos/{owner}/{repo}/actions/secrets", {
            owner: owner,
            repo: repo,
            per_page: 100
        });
    }

    public async deleteActionSecret(owner: string, repo: string, name: string): Promise<void> {
        await this.octokit.request("DELETE /repos/{owner}/{repo}/actions/secrets/{name}", {
            name: name,
            owner: owner,
            repo: repo,
        });
    }

    public async editActionSecret(owner: string, repo: string, keyId: string, key: string, name: string, value: string): Promise<void> {
        const encryptedValue = await this.encryptValue(key, value);

        await this.octokit.request("PUT /repos/{owner}/{repo}/actions/secrets/{name}", {
            encrypted_value: encryptedValue,
            key_id: keyId,
            name: name,
            owner: owner,
            repo: repo,
        });
    }

    public async getRepositoryPublicKey(owner: string, repo: string): Promise<{ key_id: string; key: string; }> {
        return (await this.octokit.request("GET /repos/{owner}/{repo}/actions/secrets/public-key", {
            owner: owner,
            repo: repo,
        })).data;
    }

    public async listRepositoryBranches(owner: string, repo: string): Promise<{ name: string; commit: { sha: string }; }[]> {
        return await this.octokit.paginate("GET /repos/{owner}/{repo}/branches", {
            owner: owner,
            repo: repo,
            per_page: 100
        });
    }

    public async getFileMeta(owner: string, repo: string, path: string, ref?: string): Promise<FileContent> {
        const result = (await this.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
            owner: owner,
            repo: repo,
            path: path,
            ref: ref
        })).data;

        if (result.constructor !== Object) {
            throw new Error("This shouldn't happen");
        }

        const resultObj = result as FileContent;
        return {
            ...resultObj,
            content: resultObj.content && this.decodeBase64(resultObj.content),
        };
    }

    public async editFile(owner: string, repo: string, path: string, message: string, content: string, sha?: string, branch?: string, committer?: { name: string, email: string }): Promise<{ commit: { sha?: string; html_url?: string; } }> {
        const encodedContent = this.encodeBase64(content);

        return (await this.octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
            owner: owner,
            repo: repo,
            path: path,
            message: message,
            content: encodedContent,
            sha: sha,
            branch: branch,
            committer: committer,
        })).data;
    }

    public async deleteFile(owner: string, repo: string, path: string, message: string, sha: string, branch?: string, committer?: { name: string, email: string }): Promise<{ commit: { sha?: string; html_url?: string; } }> {
        return (await this.octokit.request("DELETE /repos/{owner}/{repo}/contents/{path}", {
            owner: owner,
            repo: repo,
            path: path,
            message: message,
            sha: sha,
            branch: branch,
            committer: committer,
        })).data;
    }

    public async listRepositoryEnvironments(owner: string, repo: string): Promise<{ id: number; name: string; }[]> {
        return await this.octokit.paginate("GET /repos/{owner}/{repo}/environments", {
            owner: owner,
            repo: repo,
            per_page: 100
        });
    }

    public async deleteRepositoryEnvironment(owner: string, repo: string, name: string): Promise<void> {
        await this.octokit.request("DELETE /repos/{owner}/{repo}/environments/{name}", {
            name: name,
            owner: owner,
            repo: repo,
        });
    }

    public async createOrEditRepositoryEnvironment(owner: string, repo: string, name: string, parameters: EnvironmentRequest): Promise<{ id: number; name: string; }> {
        return (await this.octokit.request("PUT /repos/{owner}/{repo}/environments/{name}", {
            ...parameters,
            name: name,
            owner: owner,
            repo: repo,
        })).data;
    }

    public async listRepositoryEnvironmentProtectionRules(owner: string, repo: string, environment: string): Promise<{ id: number; enabled: boolean; app: { slug: string; }; }[]> {
        return await this.octokit.paginate("GET /repos/{owner}/{repo}/environments/{environment}/deployment_protection_rules", {
            environment: environment,
            owner: owner,
            repo: repo,
            per_page: 100
        });
    }

    public async createRepositoryEnvironmentProtectionRule(owner: string, repo: string, environment: string, parameters: EnvironmentProtectionRuleRequest): Promise<{ id: number; name: string; }> {
        return (await this.octokit.request("POST /repos/{owner}/{repo}/environments/{environment}/deployment_protection_rules", {
            ...parameters,
            environment: environment,
            owner: owner,
            repo: repo,
        })).data;
    }

    public async deleteRepositoryEnvironmentProtectionRule(owner: string, repo: string, environment: string, id: number): Promise<void> {
        await this.octokit.request("DELETE /repos/{owner}/{repo}/environments/{environment}/deployment_protection_rules/{id}", {
            environment: environment,
            id: id,
            owner: owner,
            repo: repo,
        });
    }

    public async listRepositoryEnvironmentBranchPolicies(owner: string, repo: string, environment: string): Promise<{ id: number; name: string; }[]> {
        return await this.octokit.paginate("GET /repos/{owner}/{repo}/environments/{environment}/deployment-branch-policies", {
            environment: environment,
            owner: owner,
            repo: repo,
            per_page: 100
        });
    }

    public async createRepositoryEnvironmentBranchPolicy(owner: string, repo: string, environment: string, parameters: BranchPolicyRequest): Promise<{ id: number; name: string; }> {
        return (await this.octokit.request("POST /repos/{owner}/{repo}/environments/{environment}/deployment-branch-policies", {
            ...parameters,
            environment: environment,
            owner: owner,
            repo: repo,
        })).data;
    }

    public async deleteRepositoryEnvironmentBranchPolicy(owner: string, repo: string, environment: string, id: number): Promise<void> {
        await this.octokit.request("DELETE /repos/{owner}/{repo}/environments/{environment}/deployment-branch-policies/{id}", {
            environment: environment,
            id: id,
            owner: owner,
            repo: repo,
        });
    }

    public async listRepositoryEnvironmentSecret(owner: string, repo: string, environment: string): Promise<{ name: string }[]> {
        return await this.octokit.paginate("GET /repos/{owner}/{repo}/environments/{environment}/secrets", {
            environment: environment,
            owner: owner,
            repo: repo,
            per_page: 100
        });
    }

    public async deleteEnvironmentSecret(owner: string, repo: string, environment: string, name: string): Promise<void> {
        await this.octokit.request("DELETE /repos/{owner}/{repo}/environments/{environment}/secrets/{name}", {
            environment: environment,
            name: name,
            owner: owner,
            repo: repo,
        });
    }

    public async editEnvironmentSecret(owner: string, repo: string, environment: string, keyId: string, key: string, name: string, value: string): Promise<void> {
        const encryptedValue = await this.encryptValue(key, value);

        await this.octokit.request("PUT /repos/{owner}/{repo}/environments/{environment}/secrets/{name}", {
            encrypted_value: encryptedValue,
            key_id: keyId,
            environment: environment,
            name: name,
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

    public hasProperty(properties: { property_name: string, value: string | string[] | null }[], property: CustomProperty): boolean {
        if (property.customPropertyValue === undefined || property.customPropertyValue === null) {
            if (!properties.some(p => p.property_name === property.customPropertyName)) {
                return true;
            }
        }

        return properties.some(prop => {
            if (prop.property_name !== property.customPropertyName) {
                return false;
            }
            if (prop.value === null) {
                return property.customPropertyValue === null;
            }
            if (prop.value.constructor === Array) {
                const arrayValue = prop.value as string[];
                return arrayValue.some(v => v === property.customPropertyValue);
            }
            return prop.value === property.customPropertyValue;
        });
    }
}