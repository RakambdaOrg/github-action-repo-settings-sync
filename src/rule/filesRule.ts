import {RepositoryMetadata} from "src/type/github";
import {Rule} from "../rule";
import {FilesOperation} from "../type/configuration";
import * as core from "@actions/core";
import GithubWrapper from "../githubWrapper";
import {AllElement} from "src/type/configuration";
import fs from "fs-extra";

export class FilesRule implements Rule<FilesOperation> {
    private readonly github: GithubWrapper;

    constructor(github: GithubWrapper) {
        this.github = github;
    }

    public getName(): string {
        return 'files sync';
    }

    public extractData(element: AllElement): FilesOperation | undefined {
        return element.file;
    }

    public async canApply(repository: RepositoryMetadata): Promise<string | undefined> {
        return repository.defaultBranch ? undefined : "Default branch unknown";
    }

    public async apply(repository: RepositoryMetadata, data: FilesOperation): Promise<void> {
        const branchName = data.branchName ?? repository.defaultBranch;
        const committerName = data.committer?.name ?? 'github-actions[bot]';
        const committerEmail = data.committer?.email ?? 'github-actions[bot]@users.noreply.github.com';
        const selfRepo = process.env['GITHUB_REPOSITORY'] ?? '<unknown>';
        const runId = process.env['GITHUB_RUN_ID'] ?? '<unknown>';
        const runNumber = process.env['GITHUB_RUN_NUMBER'] ?? '0';

        const currentBranches = await this.github.listRepositoryBranches(repository.owner, repository.name);

        const branchExists = currentBranches.find(b => b.name === branchName);
        if (!branchExists) {
            core.error(`Branch ${branchName} does not exist`);
            return;
        }
        for (const file of data.files) {
            core.info(`Handling file '${file.source} => '${file.destination}' on branch '${branchName}'`);

            core.debug(`Getting previous file SHA if exists on ${branchName}`);
            const previousFile = await this.getPreviousFileMeta(repository.owner, repository.name, file.destination, branchName && `refs/heads/${branchName}`);

            const content = await this.readFile(file.source);
            if (content === false) {
                core.debug(`Deleting file`);
                if (!previousFile) {
                    core.debug(`File does not exist on remote`);
                    continue;
                }
                const commitMessage = `Removing file ${file.destination} from ${selfRepo} (run ${runId} | #${runNumber})`;
                const result = await this.github.deleteFile(repository.owner, repository.name, file.destination, commitMessage, previousFile.sha, branchName, {name: committerName, email: committerEmail});
                core.info(`Deleted file in commit ${result.commit.sha}`);
            } else {
                core.debug(`Editing file`);
                if (content === previousFile?.content) {
                    core.debug(`File is the same`);
                    continue;
                }
                const commitMessage = `Synchronizing file ${file.destination} from ${selfRepo} (run ${runId} | #${runNumber})`;
                const result = await this.github.editFile(repository.owner, repository.name, file.destination, commitMessage, content, previousFile?.sha, branchName, {name: committerName, email: committerEmail});
                core.info(`Edited file in commit ${result.commit.sha}`);
            }
        }
    }

    private async readFile(path: string): Promise<string | false> {
        if (!await fs.pathExists(path)) {
            return false;
        }
        return await fs.promises.readFile(path, 'utf8');
    }

    private async getPreviousFileMeta(owner: string, repo: string, path: string, ref?: string): Promise<{ type: string; sha: string; content?: string; } | undefined> {
        let result;
        try {
            result = await this.github.getFileMeta(owner, repo, path, ref);
        } catch (e: any) {
            if (e && 'status' in e && e.status === 404) {
                return undefined;
            }
            throw e;
        }

        const resultObj = result as { type: "dir" | "file" | "submodule" | "symlink", sha: string };
        if (resultObj.type !== 'file') {
            throw new Error(`Found element of type ${resultObj.type}`);
        }

        return resultObj;
    }
}