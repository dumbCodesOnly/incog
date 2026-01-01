# GitHub Actions Workflows

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Pre-Development Blueprint

---

## Executive Summary

This directory contains production-ready GitHub Actions workflow templates for continuous integration, testing, building, and packaging the Incog browser application into APK format. All workflows are designed to be modular, reusable, and maintainable.

---

## 1. Workflow Overview

### 1.1 Available Workflows

| Workflow                | Trigger        | Purpose                        |
| ----------------------- | -------------- | ------------------------------ |
| `ci.yml`                | Push, PR       | Run tests and linting          |
| `build.yml`             | Push to main   | Build web app and Docker image |
| `deploy-staging.yml`    | Manual trigger | Deploy to staging environment  |
| `deploy-production.yml` | Release tag    | Deploy to production           |
| `build-apk.yml`         | Release tag    | Build and sign APK             |
| `publish-apk.yml`       | Manual trigger | Publish APK to Play Store      |

### 1.2 Workflow Directory

```
.github/workflows/
├── ci.yml                    # Continuous integration
├── build.yml                 # Build web app
├── deploy-staging.yml        # Deploy to staging
├── deploy-production.yml     # Deploy to production
├── build-apk.yml             # Build APK
├── publish-apk.yml           # Publish to Play Store
└── README.md                 # This file
```

---

## 2. Continuous Integration Workflow

### 2.1 Purpose

The CI workflow runs on every push and pull request to ensure code quality, security, and functionality.

### 2.2 Workflow File

**`.github/workflows/ci.yml`:**

```yaml
name: Continuous Integration

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [22.x]

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: incog_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        ports:
          - 3306:3306

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type checking
        run: pnpm check

      - name: Linting
        run: pnpm lint

      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: mysql://root:root@localhost:3306/incog_test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella

      - name: Build
        run: pnpm build

      - name: Security audit
        run: npm audit --audit-level=moderate
```

### 2.3 Triggers

- **Push:** Runs on every push to `main` or `develop` branches
- **Pull Request:** Runs on every pull request to `main` or `develop` branches

### 2.4 Jobs

**Test Job:**

- Checks out code
- Sets up Node.js
- Installs dependencies
- Runs type checking
- Runs linting
- Runs tests with coverage
- Uploads coverage to Codecov
- Builds application
- Runs security audit

---

## 3. Build Workflow

### 3.1 Purpose

The build workflow builds the web application and creates a Docker image for deployment.

### 3.2 Workflow File

**`.github/workflows/build.yml`:**

```yaml
name: Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/
          retention-days: 7

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/incog-browser:latest
            ${{ secrets.DOCKER_USERNAME }}/incog-browser:${{ github.sha }}
          cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/incog-browser:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/incog-browser:buildcache,mode=max
```

### 3.3 Triggers

- **Push to main:** Builds and pushes Docker image

### 3.4 Jobs

**Build Job:**

- Checks out code
- Sets up Node.js
- Installs dependencies
- Builds application
- Uploads build artifacts
- Builds and pushes Docker image

---

## 4. Deployment Workflows

### 4.1 Staging Deployment

**`.github/workflows/deploy-staging.yml`:**

```yaml
name: Deploy to Staging

on:
  workflow_dispatch:
    inputs:
      version:
        description: "Version to deploy"
        required: true
        default: "latest"

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging
        run: |
          curl -X POST ${{ secrets.STAGING_DEPLOY_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"version":"${{ github.event.inputs.version }}"}'

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Deployed to staging",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Deployed to staging: ${{ github.event.inputs.version }}"
                  }
                }
              ]
            }
```

### 4.2 Production Deployment

**`.github/workflows/deploy-production.yml`:**

```yaml
name: Deploy to Production

on:
  push:
    tags:
      - "v*"

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Get version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - name: Deploy to production
        run: |
          curl -X POST ${{ secrets.PRODUCTION_DEPLOY_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"version":"${{ steps.version.outputs.VERSION }}"}'

      - name: Create release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ steps.version.outputs.VERSION }}
          release_name: Release ${{ steps.version.outputs.VERSION }}
          body: Release notes for ${{ steps.version.outputs.VERSION }}
          draft: false
          prerelease: false

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Deployed to production",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Deployed to production: ${{ steps.version.outputs.VERSION }}"
                  }
                }
              ]
            }
```

---

## 5. APK Build Workflow

### 5.1 Purpose

The APK build workflow builds and signs the Android APK for distribution through the Play Store.

### 5.2 Workflow File

**`.github/workflows/build-apk.yml`:**

```yaml
name: Build APK

on:
  push:
    tags:
      - "v*"

jobs:
  build-apk:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: "pnpm"

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          java-version: "17"
          distribution: "temurin"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build web app
        run: pnpm build

      - name: Install Bubblewrap
        run: npm install -g @bubblewrap/cli

      - name: Get version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - name: Decode keystore
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE }}" | base64 -d > release.keystore

      - name: Build APK
        run: |
          bubblewrap build \
            --keystore=release.keystore \
            --keystore-alias=release_key \
            --keystore-password=${{ secrets.KEYSTORE_PASSWORD }} \
            --key-password=${{ secrets.KEY_PASSWORD }}

      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: apk
          path: app-release.apk
          retention-days: 30

      - name: Create release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ steps.version.outputs.VERSION }}
          release_name: Release ${{ steps.version.outputs.VERSION }}
          draft: false
          prerelease: false

      - name: Upload APK to release
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./app-release.apk
          asset_name: incog-${{ steps.version.outputs.VERSION }}.apk
          asset_content_type: application/vnd.android.package-archive
```

### 5.3 Triggers

- **Push tag:** Builds APK when tag is pushed (e.g., `v1.0.0`)

### 5.4 Jobs

**Build APK Job:**

- Checks out code
- Sets up Node.js and Java
- Installs dependencies
- Builds web app
- Installs Bubblewrap
- Decodes keystore from secrets
- Builds and signs APK
- Uploads APK artifact
- Creates GitHub release
- Uploads APK to release

---

## 6. Play Store Publishing Workflow

### 6.1 Purpose

The Play Store workflow publishes the APK to Google Play Store.

### 6.2 Workflow File

**`.github/workflows/publish-apk.yml`:**

```yaml
name: Publish APK to Play Store

on:
  workflow_dispatch:
    inputs:
      version:
        description: "Version to publish"
        required: true
      track:
        description: "Release track"
        required: true
        default: "internal"
        type: choice
        options:
          - internal
          - alpha
          - beta
          - production

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Download APK
        uses: actions/download-artifact@v3
        with:
          name: apk

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          java-version: "17"
          distribution: "temurin"

      - name: Decode Play Store credentials
        run: |
          echo "${{ secrets.PLAY_STORE_CREDENTIALS }}" | base64 -d > play-store-credentials.json

      - name: Publish to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJson: play-store-credentials.json
          packageName: com.incog.browser
          releaseFiles: "incog-${{ github.event.inputs.version }}.apk"
          track: ${{ github.event.inputs.track }}
          status: completed

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Published to Play Store",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Published ${{ github.event.inputs.version }} to ${{ github.event.inputs.track }}"
                  }
                }
              ]
            }
```

---

## 7. Secrets Configuration

### 7.1 Required Secrets

All workflows require the following secrets to be configured in GitHub:

| Secret                      | Description                           |
| --------------------------- | ------------------------------------- |
| `DOCKER_USERNAME`           | Docker Hub username                   |
| `DOCKER_PASSWORD`           | Docker Hub password                   |
| `STAGING_DEPLOY_WEBHOOK`    | Staging deployment webhook URL        |
| `PRODUCTION_DEPLOY_WEBHOOK` | Production deployment webhook URL     |
| `SLACK_WEBHOOK`             | Slack webhook for notifications       |
| `ANDROID_KEYSTORE`          | Base64-encoded Android keystore       |
| `KEYSTORE_PASSWORD`         | Keystore password                     |
| `KEY_PASSWORD`              | Key password                          |
| `PLAY_STORE_CREDENTIALS`    | Base64-encoded Play Store credentials |

### 7.2 Setting Secrets

**Via GitHub UI:**

1. Go to repository Settings
2. Click Secrets and variables → Actions
3. Click New repository secret
4. Enter secret name and value
5. Click Add secret

**Via GitHub CLI:**

```bash
gh secret set DOCKER_USERNAME --body "username"
gh secret set DOCKER_PASSWORD --body "password"
```

---

## 8. Monitoring & Debugging

### 8.1 Workflow Status

**Check workflow status:**

```bash
# List recent workflow runs
gh run list

# View specific workflow run
gh run view <run-id>

# View workflow logs
gh run view <run-id> --log
```

### 8.2 Debugging Failed Workflows

**Enable debug logging:**

```bash
# Set debug secret
gh secret set ACTIONS_STEP_DEBUG --body "true"
```

**View workflow logs:**

1. Go to repository Actions tab
2. Click failed workflow run
3. Click failed job
4. View logs

---

## 9. Best Practices

### 9.1 Workflow Design

- **Keep workflows simple:** Each workflow should have a single responsibility
- **Use reusable workflows:** Create shared workflows for common tasks
- **Cache dependencies:** Use caching to speed up builds
- **Limit job concurrency:** Prevent resource exhaustion
- **Use matrix builds:** Test multiple configurations

### 9.2 Security

- **Use secrets:** Never hardcode sensitive data
- **Limit permissions:** Use least privilege principle
- **Audit logs:** Monitor workflow execution
- **Rotate credentials:** Regularly update secrets
- **Sign commits:** Require signed commits for releases

### 9.3 Performance

- **Parallel jobs:** Run independent jobs in parallel
- **Cache artifacts:** Cache build outputs
- **Optimize dependencies:** Minimize dependency installation time
- **Use faster runners:** Consider using faster runner types
- **Monitor duration:** Track workflow execution time

---

## 10. Troubleshooting

### 10.1 Common Issues

**Issue: Workflow fails with "Node modules not found"**

Solution: Ensure `pnpm install --frozen-lockfile` is run before building.

**Issue: Docker push fails with "authentication failed"**

Solution: Verify Docker credentials are correct and set as secrets.

**Issue: APK build fails with "keystore not found"**

Solution: Ensure keystore is properly base64-encoded and decoded in workflow.

**Issue: Play Store publishing fails with "invalid credentials"**

Solution: Verify Play Store credentials JSON is valid and base64-encoded.

---

## References

[1] GitHub Actions Documentation: https://docs.github.com/en/actions
[2] Workflow Syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
[3] Secrets Management: https://docs.github.com/en/actions/security-guides/encrypted-secrets
[4] Bubblewrap CLI: https://github.com/GoogleChromeLabs/bubblewrap
[5] Google Play Console: https://play.google.com/console

---

**End of Workflows Documentation**
