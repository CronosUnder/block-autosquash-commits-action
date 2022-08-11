const { error, info } = require("@actions/core");
const { context, getOctokit } = require("@actions/github");

class PullRequestChecker{
    constructor(repoToken, mesajeBlock) {
        this.client = getOctokit(repoToken);
        this.mesajeBlock = mesajeBlock;
    }

    async process() {
        const commits = await this.client.paginate(
            "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits",
            {
                ...context.repo,
                pull_number: context.issue.number,
                per_page: 100
            }
        );
        const branch = process.env.GITHUB_REF.split("/").slice(2).join("/");
        info(`${commits.length} commit(s) in the pull request branch ${branch}`);
        const mensaje = this.mesajeBlock.replace("{actual-branch}", branch);
        let blockedCommits = 0;
        for (const {
            commit: { message },
            sha,
            url,
        } of commits) {
            const constainMessage = message.includes(mensaje);
            info(`${sha} ${message} ${constainMessage} ${mensaje}`);
            if (constainMessage) {
                error(`Commit ${sha} is an blocked commit: ${url}`);
                blockedCommits++;
                const pull_request_number = context.payload.pull_request.number;


                this.client.issues.createComment({
                    ...context.repo,
                    issue_number: pull_request_number,
                    body: `Commit ${sha} is an blocked commit: ${mensaje}`
                });
            }
        }
        if (blockedCommits) {
            throw Error(`${blockedCommits} commit(s) need to be squashed`);
        }
    }
}

module.exports = PullRequestChecker;
