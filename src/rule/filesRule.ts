import { RepositoryMetadata } from 'src/type/github.js';
import GithubWrapper from '../githubWrapper.js';
import { AllElement, File, FilesOperation } from '../type/configuration.js';
import { AbstractFilesRule } from './abstractFilesRule.js';

export class FilesRule extends AbstractFilesRule<File> {
    constructor(github: GithubWrapper) {
        super(github);
    }

    public getName(): string {
        return 'files sync';
    }

    public extractData(element: AllElement): FilesOperation<File> | undefined {
        return element.files;
    }

    protected async getContent(data: File, __: RepositoryMetadata): Promise<string | undefined> {
        if (!data.source) {
            return undefined;
        }
        return await this.readFile(data.source);
    }
}
