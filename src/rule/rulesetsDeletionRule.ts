import {RepositoryMetadata} from "src/type/github";
import {Rule} from "../rule";
import * as core from "@actions/core";
import GithubWrapper from "../githubWrapper";
import {AllElement} from "src/type/configuration";

export class RulesetsDeletionRule implements Rule<string[]> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'rulesets deletion';
    }

    public extractData(element: AllElement): string[] | undefined {
        return element.deleteRulesets;
    }

    public async canApply(repository: RepositoryMetadata): Promise<string | undefined> {
        return repository.private && repository.plan === "free" ? "Your plan does not allow it" : undefined;
    }

    public async apply(repository: RepositoryMetadata, data: string[]): Promise<void> {
        const currentRulesets = await this.github.listRepositoryRulesets(repository.owner, repository.name);
        for (const rulesetName of data) {
            core.info(`Handling ruleset '${rulesetName}'`);
            const previousRuleset = currentRulesets.find(r => r.name === rulesetName);
            if (!previousRuleset) {
                core.warning(`Ruleset '${rulesetName}' does not exists on ${repository.fullName}`);
                continue;
            }

            await this.github.deleteRepositoryRuleset(repository.owner, repository.name, previousRuleset.id);
        }
    }
}