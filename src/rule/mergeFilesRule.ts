import {RepositoryMetadata} from "src/type/github";
import {AllElement, FilesOperation, MergeFile} from "../type/configuration";
import GithubWrapper from "../githubWrapper";
import lodash from "lodash";
import {AbstractFilesRule} from "./abstractFilesRule";
import yaml from "yaml";

export class MergeFilesRule extends AbstractFilesRule<MergeFile> {
    constructor(github: GithubWrapper) {
        super(github);
    }

    public getName(): string {
        return 'merge files sync';
    }

    public extractData(element: AllElement): FilesOperation<MergeFile> | undefined {
        return element.mergeFiles;
    }

    protected async getContent(data: MergeFile, repository: RepositoryMetadata): Promise<string | undefined> {
        const objects = [];
        for (const file of data.conditions) {
            if (!this.github.hasProperty(repository.properties, file)) {
                continue;
            }

            const content = await this.readFile(file.source);
            if (!content) {
                continue;
            }

            const obj = this.transformContentToObject(content, file.type);
            if (obj !== undefined) {
                objects.push(obj);
            }
        }

        if (objects.length === 0) {
            return undefined;
        }
        if (objects.length === 1) {
            return this.transformObjectToContent(objects[0], data.type);
        }

        const merged = lodash.mergeWith(objects[0], ...objects.slice(1), (objValue: any, srcValue: any) => {
            if (objValue && objValue.constructor === Array) {
                return objValue.concat(srcValue);
            }
            return undefined;
        });
        return this.transformObjectToContent(merged, data.type);
    }

    private transformContentToObject(content: string, type: "json" | "yml" | "yaml"): any | undefined {
        switch (type) {
            case "json":
                return JSON.parse(content);
            case "yaml":
            case "yml":
                return yaml.parse(content);
            default:
                return undefined;
        }
    }

    private transformObjectToContent(data: any, type: "json" | "yml" | "yaml") {
        switch (type) {
            case "json":
                return JSON.stringify(data, null, 4);
            case "yaml":
            case "yml":
                return yaml.stringify(data, {version: '1.1', singleQuote: true});
            default:
                return undefined;
        }
    }
}