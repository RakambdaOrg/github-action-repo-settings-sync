import {getInput} from "action-input-parser";
import {AllElement, Configuration} from "./type/configuration";
import fs from 'fs-extra';
import yaml from 'yaml';
import GithubWrapper from "./githubWrapper";
import * as core from "@actions/core";
import {Ajv} from "ajv";
import * as path from "node:path";
import {RepositoryMetadata} from "./type/github";
import {Rule} from "./rule";
import {FeatureRule} from "./rule/featureRule";
import {ActionPermissionsRule} from "./rule/actionPermissionsRule";
import {ActionPermissionsAccessRule} from "./rule/actionPermissionsAccessRule";
import {RulesetsRule} from "./rule/rulesetsRule";
import {RulesetsDeletionRule} from "./rule/rulesetsDeletionRule";
import {ActionSecrets} from "./rule/actionSecrets";
import {FilesRule} from "./rule/filesRule";
import {MergeFilesRule} from "./rule/mergeFilesRule";

export class Main {
    private readonly github: GithubWrapper;
    private readonly rules: Rule<any>[];

    constructor() {
        const token = getInput('github_token', {
            required: true
        }) as string;

        if (!token) {
            throw new Error("No GitHub token provided");
        }

        this.github = new GithubWrapper(token);
        this.rules = [
            new FeatureRule(this.github),
            new RulesetsRule(this.github),
            new RulesetsDeletionRule(this.github),
            new ActionPermissionsRule(this.github),
            new ActionPermissionsAccessRule(this.github),
            new ActionSecrets(this.github),
            new FilesRule(this.github),
            new MergeFilesRule(this.github),
        ];
    }

    public async run(): Promise<void> {
        const configPath = getInput('CONFIG_PATH', {
            default: '.github/settings-sync.yml',
            required: false,
        });

        const configuration = await this.parseConfig(configPath as string);
        if (!configuration) {
            throw new Error("Configuration not found");
        }
        const configurationSchema = await this.getConfigurationSchema();
        if (!this.isValidConfiguration(configuration, configurationSchema)) {
            throw new Error("Invalid configuration file");
        }
        core.info(`Configuration read successfully, got ${configuration.elements.length} elements`);

        for (let i = 0; i < configuration.elements.length; i++) {
            core.info(`Processing element ${i + 1}`);
            const element = configuration.elements[i];
            await this.processElement(element);
        }
    }

    private async processElement(element: AllElement): Promise<void> {
        core.info(`Listing repositories`);
        const repositories = await this.listRepositories(element);
        core.info(`Found ${repositories.length} repositories`);
        for (const repository of repositories) {
            await core.group(`Applying configurations on ${repository.fullName}`, async () => this.applyElement(element, repository));
        }
    }

    private async listRepositories(element: AllElement): Promise<RepositoryMetadata[]> {
        let data: RepositoryMetadata[] = await this.github.listRepositories(element.owner, element.org);
        if (element.searchType === "property") {
            data = data.filter((r) => this.github.hasProperty(r.properties, element));
        }
        if (element.exclude) {
            data = data.filter(repo => !(element.exclude?.includes(repo.fullName) ?? false));
        }
        return data.filter(repo => !(repo.archived ?? true));
    }

    private async applyElement(element: AllElement, repository: RepositoryMetadata) {
        core.info(`Repository url : ${repository.html_url}`);
        core.info(`Repository visibility : ${repository.visibility}`);
        for (const rule of this.rules) {
            await this.runStep(rule.getName(), repository, element, rule);
        }
    }

    private async runStep<T>(type: string, repository: RepositoryMetadata, element: AllElement, rule: Rule<T>): Promise<void> {
        try {
            core.info(`⚙️ Starting step '${type}'...`);
            const data = rule.extractData(element);
            if (!data) {
                core.info('Nothing to do');
                return;
            }

            const canApply = await rule.canApply(repository);
            if (canApply !== undefined) {
                core.warning(`Cannot apply ${type} on repository ${repository.fullName} : ${canApply}`);
                return;
            }

            await rule.apply(repository, data!);
            core.info(`✅ Step '${type}' finished successfully`);
        } catch (e: any) {
            core.error(`❌ Step '${type}' finished with an error`);
            core.error(e);
        }
    }

    private async parseConfig(configPath: string): Promise<any> {
        if (!await fs.pathExists(configPath)) {
            return null;
        }
        const configContent = await fs.promises.readFile(configPath, 'utf8');
        const evaluatedConfigContent = this.replaceEnvVars(configContent);
        return yaml.parse(evaluatedConfigContent);
    }

    private replaceEnvVars(content: string) {
        return content.replace(/\${\w+}/gi, (varHolder) => {
            const match = varHolder.match(/\${(?<variable>\w+)}/i)?.groups;
            if (!match) {
                return varHolder;
            }
            const envName = match.variable;
            const envValue = process.env[envName];
            if (envValue === undefined) {
                core.warning(`Environment Variable ${envName} not found`);
                return varHolder;
            }

            core.info(`Replacing Environment Variable ${envName}`);
            return envValue;
        });
    }

    private async getConfigurationSchema(): Promise<object> {
        if (typeof __dirname === 'undefined') {
            core.error("__dirname undefined, configuration won't be validated");
            return {};
        }
        const schemaPath = path.join(__dirname, "type", "configuration-schema.json");
        if (!await fs.pathExists(schemaPath)) {
            core.error("Failed to get configuration schema, configuration won't be validated");
            return {};
        }
        const schemaContent = await fs.promises.readFile(schemaPath, 'utf8');
        return JSON.parse(schemaContent);
    }

    private isValidConfiguration(data: any, schema: object): data is Configuration {
        const ajv = new Ajv();
        const validate = ajv.compile(schema);
        if (validate(data)) {
            return true;
        }
        core.error(`Failed to validate configuration : ${JSON.stringify(validate.errors)}`);
        return false;
    }
}
