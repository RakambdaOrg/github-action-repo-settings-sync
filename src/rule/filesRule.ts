import { RepositoryMetadata } from 'src/type/github';
import GithubWrapper from '../githubWrapper';
import { AllElement, File, FilesOperation } from '../type/configuration';
import { AbstractFilesRule } from './abstractFilesRule';

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
