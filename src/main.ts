import * as core from '@actions/core';
import * as github from '@actions/github';
import { isTestFile } from './utils';

interface ActionInputs {
  githubToken: string;
  testPatterns: string[];
  labelName: string;
  labelColor: string;
  commentMessage: string;
  skipLabel: boolean;
  skipComment: boolean;
}

/**
 * Get and validate action inputs
 */
function getInputs(): ActionInputs {
  const testPatternsInput = core.getInput('test-patterns', { required: false });
  const testPatterns = testPatternsInput
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return {
    githubToken: core.getInput('github-token', { required: true }),
    testPatterns,
    labelName: core.getInput('label-name', { required: false }) || 'no-tests',
    labelColor: core.getInput('label-color', { required: false }) || 'fbca04',
    commentMessage:
      core.getInput('comment-message', { required: false }) ||
      '⚠️ **No tests detected** in this Pull Request. Please consider adding tests to ensure code quality and maintainability.',
    skipLabel: core.getInput('skip-label', { required: false }) === 'true',
    skipComment: core.getInput('skip-comment', { required: false }) === 'true'
  };
}

/**
 * Check if the label exists and create it if it doesn't
 */
async function ensureLabelExists(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  labelName: string,
  labelColor: string
): Promise<void> {
  try {
    await octokit.rest.issues.getLabel({
      owner,
      repo,
      name: labelName
    });
    core.info(`Label "${labelName}" already exists`);
  } catch (error: any) {
    if (error.status === 404) {
      // Label doesn't exist, create it
      core.info(`Creating label "${labelName}"...`);
      await octokit.rest.issues.createLabel({
        owner,
        repo,
        name: labelName,
        color: labelColor,
        description: 'Pull Request does not include test files'
      });
      core.info(`Label "${labelName}" created successfully`);
    } else {
      throw error;
    }
  }
}

/**
 * Add or remove label from the PR
 */
async function updateLabel(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number,
  labelName: string,
  shouldAdd: boolean
): Promise<void> {
  try {
    if (shouldAdd) {
      core.info(`Adding label "${labelName}" to PR #${prNumber}...`);
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels: [labelName]
      });
      core.info(`Label "${labelName}" added successfully`);
    } else {
      core.info(`Removing label "${labelName}" from PR #${prNumber}...`);
      await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: prNumber,
        name: labelName
      });
      core.info(`Label "${labelName}" removed successfully`);
    }
  } catch (error: any) {
    if (error.status === 404) {
      core.info(`Label "${labelName}" not found on PR, skipping removal`);
    } else {
      throw error;
    }
  }
}

/**
 * Add a comment to the PR
 */
async function addComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number,
  message: string
): Promise<void> {
  core.info(`Adding comment to PR #${prNumber}...`);

  // Check if we've already commented
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber
  });

  const botComment = comments.data.find(
    comment =>
      comment.user?.type === 'Bot' &&
      comment.body?.includes('No tests detected')
  );

  if (botComment) {
    core.info('Comment already exists, updating it...');
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: botComment.id,
      body: message
    });
    core.info('Comment updated successfully');
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: message
    });
    core.info('Comment added successfully');
  }
}

/**
 * Get list of files changed in the PR
 */
async function getPRFiles(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number
): Promise<string[]> {
  core.info(`Fetching files for PR #${prNumber}...`);

  const files: string[] = [];
  let page = 1;
  const perPage = 100;

  // Paginate through all files in the PR
  while (true) {
    const response = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: perPage,
      page
    });

    files.push(...response.data.map(file => file.filename));

    if (response.data.length < perPage) {
      break;
    }
    page++;
  }

  core.info(`Found ${files.length} files in PR`);
  return files;
}

/**
 * Main action entry point
 */
async function run(): Promise<void> {
  try {
    // Get inputs
    const inputs = getInputs();

    // Verify we're running in a PR context
    const context = github.context;
    if (!context.payload.pull_request) {
      core.setFailed('This action can only be run on pull_request events');
      return;
    }

    const prNumber = context.payload.pull_request.number;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    core.info(`Checking for tests in PR #${prNumber}...`);
    core.info(`Test patterns: ${inputs.testPatterns.join(', ')}`);

    // Create GitHub API client
    const octokit = github.getOctokit(inputs.githubToken);

    // Get PR files
    const files = await getPRFiles(octokit, owner, repo, prNumber);

    // Check for test files
    const testFiles = files.filter(file =>
      isTestFile(file, inputs.testPatterns)
    );

    const hasTests = testFiles.length > 0;

    // Log results
    core.info(`Test files found: ${testFiles.length}`);
    if (testFiles.length > 0) {
      core.info('Test files:');
      testFiles.forEach(file => core.info(`  - ${file}`));
    }

    // Set outputs
    core.setOutput('has-tests', hasTests);
    core.setOutput('test-files-count', testFiles.length);

    // Handle label
    if (!inputs.skipLabel) {
      await ensureLabelExists(
        octokit,
        owner,
        repo,
        inputs.labelName,
        inputs.labelColor
      );

      if (!hasTests) {
        // No tests found - add label
        await updateLabel(
          octokit,
          owner,
          repo,
          prNumber,
          inputs.labelName,
          true
        );
      } else {
        // Tests found - remove label if present
        await updateLabel(
          octokit,
          owner,
          repo,
          prNumber,
          inputs.labelName,
          false
        );
      }
    }

    // Handle comment
    if (!inputs.skipComment && !hasTests) {
      await addComment(octokit, owner, repo, prNumber, inputs.commentMessage);
    }

    // Summary
    if (hasTests) {
      core.info(`✅ Tests detected! Found ${testFiles.length} test file(s)`);
    } else {
      core.warning('⚠️ No tests detected in this Pull Request');
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}

run();
