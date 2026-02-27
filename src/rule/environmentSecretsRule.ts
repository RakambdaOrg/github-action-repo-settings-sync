import * as core from '@actions/core';
import { ActionSecret } from 'src/type/configuration.js';
import { RepositoryMetadata } from 'src/type/github.js';
import GithubWrapper from '../githubWrapper.js';
import { EnvironmentsBase } from './environmentsBase.js';

export class EnvironmentSecretsRule extends EnvironmentsBase {
    constructor(github: GithubWrapper) {
        super(github);
    }

    public getName(): string {
        return 'environment secrets creation/update/delete';
    }

    protected async applyEnvironment(repository: RepositoryMetadata, environment: { name: string; secrets?: ActionSecret[] }): Promise<void> {
        if (!environment.secrets) {
            return;
        }

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
