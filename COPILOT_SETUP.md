# GitHub Copilot Setup

This repository is configured with custom instructions for GitHub Copilot to ensure consistent, high-quality code generation that follows project conventions.

## Files

### `.github/copilot-instructions.md`
Repository-wide custom instructions for GitHub Copilot's code completion and chat features.

**Purpose**: Provides Copilot with context about:
- Project architecture and structure
- Development workflows (dev, build, test)
- Environment configuration
- Code patterns and conventions
- Integration points (CORS, CSRF, API)
- Security best practices
- Examples to follow
- Things to avoid

**Audience**: GitHub Copilot (code completion in IDE, chat)

### `AGENTS.md`
Custom instructions specifically for autonomous AI coding agents.

**Purpose**: Provides coding agents with:
- Project overview
- Essential commands (build, dev, test, lint)
- Development guidelines (runtime, code style, error handling, security)
- Database and API conventions
- References to detailed documentation

**Audience**: GitHub Copilot Coding Agent (automated issue resolution)

## Best Practices Implemented

✅ **Project Overview**: Both files include clear project descriptions  
✅ **Tech Stack**: Detailed technology specifications (Bun, Hono, React, Vite, SQLite, Drizzle)  
✅ **Coding Guidelines**: Comprehensive style, formatting, and naming conventions  
✅ **Security Measures**: CORS, CSRF, authentication, and security headers documented  
✅ **Testing Requirements**: Test commands and patterns specified  
✅ **Documentation**: Clear structure with Markdown formatting  
✅ **File Organization**: Proper placement (`.github/` for Copilot, root for Agents)  

## How It Works

1. **Code Completion**: When you write code in your IDE, Copilot reads `.github/copilot-instructions.md` to understand project-specific patterns and conventions.

2. **Chat**: When you ask Copilot questions, it uses the instructions to provide context-aware answers specific to this project.

3. **Coding Agent**: When Copilot Coding Agent works on an issue, it reads both files (with `AGENTS.md` taking precedence if present) to understand how to build, test, and modify the codebase.

## Maintenance

- **Review Regularly**: Update instructions when project structure or conventions change
- **Keep It Concise**: Both files should be comprehensive but focused on essentials
- **Cross-Reference**: `AGENTS.md` references `.github/copilot-instructions.md` for detailed architecture
- **Version Control**: Instructions are tracked in git like any other code

## References

- [GitHub Copilot Custom Instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions)
- [Best Practices for Copilot Coding Agent](https://docs.github.com/en/copilot/tutorials/coding-agent/get-the-best-results)
- [AGENTS.md Support](https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions/)
