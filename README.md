# Check for Tests Action

[![CI](https://github.com/rapid-recovery-agency-inc/check-for-tests-action/actions/workflows/ci.yml/badge.svg)](https://github.com/rapid-recovery-agency-inc/check-for-tests-action/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A GitHub Action that automatically checks if a Pull Request includes test files. If no tests are detected, it:
- 🏷️ Adds a configurable label (default: "no-tests" with yellow color)
- 💬 Posts a comment reminding contributors to add tests
- ✅ Sets outputs that can be used in subsequent workflow steps

## Features

- 🔍 **Smart Test Detection**: Supports multiple test file patterns for various languages and frameworks
- 🎨 **Customizable**: Configure labels, colors, messages, and test patterns
- 🚀 **Easy to Use**: Simple setup with sensible defaults
- 📊 **Action Outputs**: Provides information about test files found
- 🔄 **Automatic Label Management**: Adds label when no tests found, removes when tests are added

## Usage

### Basic Usage

Add this to your workflow file (e.g., `.github/workflows/check-tests.yml`):

```yaml
name: Check for Tests

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Check for test files
        uses: rapid-recovery-agency-inc/check-for-tests-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Usage

Customize the behavior with additional inputs:

```yaml
name: Check for Tests

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Check for test files
        uses: rapid-recovery-agency-inc/check-for-tests-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          test-patterns: '**/*.test.ts,**/*.spec.ts,**/test_*.py,**/__tests__/**'
          label-name: 'needs-tests'
          label-color: 'ff0000'
          comment-message: |
            ⚠️ **No tests found in this PR**
            
            Please add tests to verify your changes. Our testing guidelines can be found [here](LINK_TO_GUIDELINES).
          skip-label: false
          skip-comment: false

      - name: Block PR if no tests
        if: steps.check-tests.outputs.has-tests == 'false'
        run: |
          echo "No tests found!"
          exit 1
```

### Use Outputs in Subsequent Steps

```yaml
- name: Check for test files
  id: check-tests
  uses: rapid-recovery-agency-inc/check-for-tests-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Comment on results
  if: steps.check-tests.outputs.has-tests == 'true'
  run: |
    echo "Great! Found ${{ steps.check-tests.outputs.test-files-count }} test file(s)"
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | `${{ github.token }}` |
| `test-patterns` | Comma-separated patterns to identify test files | No | See below* |
| `label-name` | Name of the label to add when no tests are found | No | `no-tests` |
| `label-color` | Color of the label (hex code without #) | No | `fbca04` (yellow) |
| `comment-message` | Custom message to add in the comment | No | Default warning message |
| `skip-label` | Skip adding/removing the label | No | `false` |
| `skip-comment` | Skip adding the comment | No | `false` |

*Default test patterns:
```
**/*.test.ts, **/*.test.js, **/*.test.tsx, **/*.test.jsx,
**/*.spec.ts, **/*.spec.js, **/*.spec.tsx, **/*.spec.jsx,
**/test_*.py, **/*_test.py, **/*.test.py,
**/tests/**, **/__tests__/**
```

## Outputs

| Output | Description |
|--------|-------------|
| `has-tests` | Boolean indicating whether tests were found (`true` or `false`) |
| `test-files-count` | Number of test files found in the PR |

## Supported Test Patterns

The action supports a wide range of test file patterns commonly used across different languages and frameworks:

### JavaScript/TypeScript
- Jest: `**/*.test.js`, `**/*.test.ts`, `**/__tests__/**`
- Mocha/Chai: `**/*.spec.js`, `**/*.spec.ts`
- React Testing Library: `**/*.test.tsx`, `**/*.test.jsx`

### Python
- pytest: `**/test_*.py`, `**/*_test.py`
- unittest: `**/*.test.py`, `**/tests/**`

### Custom Patterns
You can define your own patterns using glob syntax:
- `**` matches any number of directories
- `*` matches any characters within a directory name
- Use commas to separate multiple patterns

## Examples

### Example 1: TypeScript Project with Jest

```yaml
- uses: rapid-recovery-agency-inc/check-for-tests-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    test-patterns: '**/*.test.ts,**/*.spec.ts,**/__tests__/**/*.ts'
```

### Example 2: Python Project with pytest

```yaml
- uses: rapid-recovery-agency-inc/check-for-tests-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    test-patterns: '**/test_*.py,**/*_test.py,**/tests/**'
```

### Example 3: Skip Comment, Only Add Label

```yaml
- uses: rapid-recovery-agency-inc/check-for-tests-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    skip-comment: true
```

### Example 4: Custom Label and Message

```yaml
- uses: rapid-recovery-agency-inc/check-for-tests-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    label-name: '⚠️ missing-tests'
    label-color: 'ff6b6b'
    comment-message: |
      ### ⚠️ Tests Required
      
      This PR doesn't include test files. Please add tests covering:
      - New functionality
      - Edge cases
      - Error handling
      
      See our [testing guidelines](https://example.com/testing) for more info.
```

## Permissions

This action requires the following permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```

If you're using a custom `GITHUB_TOKEN`, ensure it has these permissions.

## How It Works

1. **Detects PR Context**: Verifies the action is running in a pull request event
2. **Fetches PR Files**: Retrieves all files changed in the pull request
3. **Pattern Matching**: Checks each file against the configured test patterns
4. **Label Management**: 
   - Creates the label if it doesn't exist
   - Adds label if no tests found
   - Removes label if tests are found
5. **Comment Management**: 
   - Posts a comment if no tests found (or updates existing comment)
   - Avoids duplicate comments
6. **Sets Outputs**: Provides information for downstream workflow steps

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:
- 🐛 [Report a bug](https://github.com/rapid-recovery-agency-inc/check-for-tests-action/issues/new?template=bug_report.md)
- 💡 [Request a feature](https://github.com/rapid-recovery-agency-inc/check-for-tests-action/issues/new?template=feature_request.md)
- 💬 [Start a discussion](https://github.com/rapid-recovery-agency-inc/check-for-tests-action/discussions)

## Related Actions

- [actions/checkout](https://github.com/actions/checkout) - Checkout your repository
- [actions/setup-node](https://github.com/actions/setup-node) - Setup Node.js environment

---

Made with ❤️ by [Rapid Recovery Agency Inc](https://github.com/rapid-recovery-agency-inc)