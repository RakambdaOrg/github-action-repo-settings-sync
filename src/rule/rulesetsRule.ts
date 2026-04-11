import { AllElement } from '@/type/configuration.js';
import { RepositoryMetadata } from '@/type/github.js';
import * as core from '@actions/core';
import GithubWrapper from '../githubWrapper.js';
import { Rule } from '../rule.js';
import { RepositoryRulesetRequest } from '../type/github.js';

export class RulesetsRule implements Rule<RepositoryRulesetRequest[]> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'rulesets creation/update';
    }

    public extractData(element: AllElement): RepositoryRulesetRequest[] | undefined {
        return element.rulesets;
    }

    public async canApply(repository: RepositoryMetadata): Promise<string | undefined> {
        if (repository.archived ?? true) {
            return 'Repository is archived';
        }
        return repository.private && repository.plan === 'free' ? 'Your plan does not allow it' : undefined;
    }

    public async apply(repository: RepositoryMetadata, data: RepositoryRulesetRequest[]): Promise<void> {
        const currentRulesets = await this.github.listRepositoryRulesets(repository.owner, repository.name);
        for (const ruleset of data) {
            core.info(`Handling ruleset '${ruleset.name}'`);

            const rulesetExists = currentRulesets.find((r) => r.name === ruleset.name);
            if (rulesetExists) {
                core.debug(`Ruleset '${ruleset.name}' will be edited`);
                const result = await this.github.editRepositoryRuleset(repository.owner, repository.name, rulesetExists.id, ruleset);
                core.debug(`Ruleset update response is ${JSON.stringify(result)}`);
            } else {
                core.debug(`Ruleset '${ruleset.name}' will be created`);
                const result = await this.github.createRepositoryRuleset(repository.owner, repository.name, ruleset);
                core.debug(`Ruleset creation response is ${JSON.stringify(result)}`);
                currentRulesets.push(result);
            }
        }
    }
}
