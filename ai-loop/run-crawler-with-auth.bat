@echo off
set CRAWLER_AUTH_TOKEN=test_token_123
set CRAWLER_USER_ID=admin
npx playwright test crawl.spec.ts --reporter=list
