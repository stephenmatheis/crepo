# crepo

Creates a pre-configured Next.js or Vite project in seconds with Git, ESLint, Prettier, and window snapping via Rectangle.

---

## Requirements

-   Node.js ≥ 18
-   macOS (for Rectangle integration)
-   [Rectangle](https://rectangleapp.com) installed (optional)

## Add Templates

Before using `crepo`, create a `~/dev-templates/` directory that holds your config files.

### Required structure:

```
~/dev-templates/
├── .prettierrc.json            # Shared between all projects
├── nextjs/                     # Next.js-specific configs
│   ├── eslint.config.mjs
│   └── tsconfig.json
└── vite/                       # Vite-specific configs
│   ├── eslint.config.mjs
│   └── tsconfig.json
```

## Usage

```bash
npx crepo
```

Follow the prompts to:

-   Choose a framework (Next.js or Vite)
-   Name your project

Then sit back while `crepo`:

-   Scaffolds the app
-   Installs dependencies
-   Copies your ESLint/TS/Prettier configs
-   Runs Prettier
-   Initializes Git and makes the first commit
-   Opens VS Code + Chrome
-   Uses [Rectangle](https://rectangleapp.com) (if installed) to snap your windows into place

---

## Author

[Stephen Matheis](https://github.com/stephenmatheis)
