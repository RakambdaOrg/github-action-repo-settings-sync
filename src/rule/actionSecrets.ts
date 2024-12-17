import {RepositoryMetadata} from "src/type/github";
import {Rule} from "../rule";
import * as core from "@actions/core";
import GithubWrapper from "../githubWrapper";
import {AllElement} from "src/type/configuration";

type Data = { name: string; value?: string };

export class ActionSecrets implements Rule<Data[]> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'action secrets';
    }

    public extractData(element: AllElement): Data[] | undefined {
        return element.actions?.secrets;
    }

    public async canApply(_: RepositoryMetadata): Promise<string | undefined> {
        return undefined;
    }

    public async apply(repository: RepositoryMetadata, data: Data[]): Promise<void> {
        core.debug("Getting repository public key");
        const key = await this.github.getRepositoryPublicKey(repository.owner, repository.name);
        const currentSecrets = await this.github.listRepositoryActionSecret(repository.owner, repository.name);

        for (const secret of data) {
            core.info(`Handling secret '${secret.name}'`);
            const previousSecret = currentSecrets.find(s => s.name === secret.name);

            if (secret.value === undefined || secret.value === null) {
                if (previousSecret) {
                    core.debug(`Secret '${secret.name}' will be deleted`);
                    const result = await this.github.deleteActionSecret(repository.owner, repository.name, secret.name);
                    core.debug(`Secret deletion response is ${JSON.stringify(result)}`);
                } else {
                    core.debug("Secret does not exists");
                }
            } else {
                core.debug(`Secret '${secret.name}' will be created/edited`);
                const result = await this.github.editActionSecret(repository.owner, repository.name, key.key_id, key.key, secret.name, secret.value);
                core.debug(`Secret edition response is ${JSON.stringify(result)}`);
            }
        }
    }
}