#!/usr/bin/env bash
set -e

echo "Pre-commit validation starting..."
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "Step 1/5: Updating root lockfile..."
bun install
echo -e "${GREEN}Done${NC}"
echo ""

echo "Step 2/5: Updating client lockfile..."
cd client && bun install && cd ..
echo -e "${GREEN}Done${NC}"
echo ""

echo "Step 3/5: Running TypeScript type check..."
bun run typecheck
echo -e "${GREEN}Done${NC}"
echo ""

echo "Step 4/5: Running tests..."
TEST_FILES=$(find . -path ./node_modules -prune -o -path ./client/node_modules -prune -o \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.tsx" -o -name "*.spec.tsx" \) -type f -print 2>/dev/null)
if [ -n "$TEST_FILES" ]; then
  bun test
else
  echo -e "${YELLOW}No test files found, skipping${NC}"
fi
echo -e "${GREEN}Done${NC}"
echo ""

echo "Step 5/5: Validating Docker build (production image)..."
echo -e "${YELLOW}This may take 1-2 minutes...${NC}"

export DOCKER_BUILDKIT=1

docker build \
  --tag nourish-buddy:precommit-test \
  .

echo -e "${GREEN}Done${NC}"
echo ""

echo -e "${GREEN}All pre-commit checks passed!${NC}"
echo ""
echo "You can now safely commit and push to GitHub."
