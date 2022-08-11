const core = require("@actions/core");
const git = require("./git");

const { getContext } = require("./github/context");
const { getOctokit } = require("@actions/github");
const github = require("@actions/github");
const { info, error } = require("@actions/core");

async function runAction() {
	const context = getContext();
	const repoToken = core.getInput("repo-token", { required: true });
	const messaje = core.getInput("messaje", { required: true });
	const gitName = core.getInput("git_name", { required: true });
	const gitEmail = core.getInput("git_email", { required: true });

	core.startGroup("Run action : " + messaje);
	git.setUserInfo(gitName, gitEmail);
	git.checkOutRemoteBranch(context);
	const client = getOctokit(repoToken);
	const commits = await client.paginate(
		"GET /repos/{owner}/{repo}/pulls/{pull_number}/commits",
		{
			...context.repo,
			pull_number: context.issue.number,
			per_page: 100
		}
	);
	core.info(
		`${commits.length} commit(s) in the pull request branch ${branch}, check if constain: ${mensaje}`);
	const branch = process.env.GITHUB_REF.split("/").slice(2).join("/");
	const mensaje = messaje.replace("{actual-branch}", branch);
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
			blockedCommits += 1;
			const pull_request_number = context.payload.pull_request.number;

			this.client.issues.createComment({
				...context.repo,
				issue_number: pull_request_number,
				body: `Commit ${sha} is an blocked commit: ${mensaje}`
			});
		}
	}
	const pull_request_number = context.payload.pull_request.number;

	const octokit = new github.GitHub(repoToken);
	await octokit.issues.createComment({
		...context.repo,
		issue_number: pull_request_number,
		body: `found ${blockedCommits} message(s) in the pull request`
	});
	core.info(
		`found ${blockedCommits} message(s) in the pull request branch ${branch}`
	);
	core.endGroup();
}

runAction().catch((error) => {
	core.debug(error.stack || "No error stack trace");
	core.setFailed(error.message);
});