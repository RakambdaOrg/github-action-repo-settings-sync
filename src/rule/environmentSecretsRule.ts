import * as core from '@actions/core';
import { ActionSecret, AllElement } from 'src/type/configuration';
import { RepositoryMetadata } from 'src/type/github';
import GithubWrapper from '../githubWrapper';
import { Rule } from '../rule';

export class EnvironmentSecretsRule implements Rule<{ name: string; secrets?: ActionSecret[] }[]> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'environment secrets creation/update/delete';
    }

    public extractData(element: AllElement): { name: string; secrets?: ActionSecret[] }[] | undefined {
        return element.environments;
    }

    public async canApply(_: RepositoryMetadata): Promise<string | undefined> {
        return undefined;
    }

    public async apply(repository: RepositoryMetadata, data: { name: string; secrets?: ActionSecret[] }[]): Promise<void> {
        for (const environment of data) {
            if (!environment.secrets) {
                continue;
            }
            core.info(`Handling environment '${environment.name}'`);

            core.debug('Getting repository environment public key');
            const key = await this.github.getRepositoryEnvironmentPublicKey(repository.owner, repository.name, environment.name);
            const currentSecrets = await this.github.listRepositoryEnvironmentSecret(repository.owner, repository.name, environment.name);

            for (const secret of environment.secrets) {
                core.info(`Handling environment secret '${secret.name}'`);
                const previousSecret = currentSecrets.find((s) => s.name === secret.name);

                if (secret.value === undefined || secret.value === null) {
                    if (previousSecret) {
                        core.debug(`Environment secret '${secret.name}' will be deleted`);
                        const result = await this.github.deleteEnvironmentSecret(repository.owner, repository.name, environment.name, secret.name);
                        core.debug(`Environment secret deletion response is ${JSON.stringify(result)}`);
                    } else {
                        core.debug('Environment secret does not exists');
                    }
                } else {
                    core.debug(`Environment secret '${secret.name}' will be created/edited`);
                    const result = await this.github.editEnvironmentSecret(repository.owner, repository.name, environment.name, key.key_id, key.key, secret.name, secret.value);
                    core.debug(`Environment secret edition response is ${JSON.stringify(result)}`);
                }
            }
        }
    }
}
