const { debug, error } = require("@actions/core");
const {
    context,
    getOctokit,
} = require("@actions/github");

class PullRequestChecker {
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
                per_page: 100,
            },
        );

        debug(`${commits.length} commit(s) in the pull request`);

        let blockedCommits = 0;
        for (const { commit: { message }, sha, url } of commits) {
            const isAutosquash = message == mesajeBlock;

            if (isAutosquash) {
                error(`Commit ${sha} is an blocked commit: ${url}`);
                blockedCommits++;
            }
        }
        if (blockedCommits) {
            throw Error(`${blockedCommits} commit(s) need to be squashed`);
        }
    }
}

module.exports = PullRequestChecker;
