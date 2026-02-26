#!/bin/bash
# Generate CHANGELOG.md from conventional commits
npx conventional-changelog-cli -p angular -i CHANGELOG.md -s -r 0
