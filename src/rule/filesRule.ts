import {RepositoryMetadata} from "src/type/github";
import {AllElement, File, FilesOperation} from "../type/configuration";
import GithubWrapper from "../githubWrapper";
import {AbstractFilesRule} from "./abstractFilesRule";

export class FilesRule extends AbstractFilesRule<File, FilesOperation<File>> {
    constructor(github: GithubWrapper) {
        super(github);
    }

    public getName(): string {
        return 'files sync';
    }

    public extractData(element: AllElement): FilesOperation<File> | undefined {
        return element.files;
    }

    protected async getContent(_: FilesOperation<File>, data: File, __: RepositoryMetadata): Promise<string | undefined> {
        return await this.readFile(data.source);
    }
}