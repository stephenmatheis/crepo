#!/usr/bin/env node

import 'zx/globals'

// Title screen
console.log(`\nmkrepo - spin up your next repo in seconds\n`)

// Ask project type
const projectType = await select({
    message: 'Choose a project type:',
    choices: ['Next.js', 'Vite (React + TS)'],
})

// Ask project name
const name = await input({ message: 'Project name:' })

// Create project
if (projectType === 'Next.js') {
    await $`npx create-next-app@latest ${name} --typescript --app --eslint --no-interactive`
} else {
    await $`npm create vite@latest ${name} -- --template react-ts`
}

// Change into project directory
cd(name)

const templateDir = `~/dev-templates/${projectType === 'Next.js' ? 'nextjs' : 'vite'}`

// Copy shared Prettier config
await $`cp ~/dev-templates/.prettierrc.json .`

// Copy project-specific ESLint and TS configs
await Promise.all([
    $`cp ${templateDir}/eslint.config.mjs .`,
    $`cp ${templateDir}/tsconfig.json .`,
])

// Install dependencies
await $`npm install`

// Init Git and make first commit
await $`git init`
await $`git add .`
await $`git commit -m "Initial commit via mkrepo"`

// Run Prettier format
await $`npx prettier --write .`

// Open in VS Code
await $`code .`

// Open in browser
await $`open -a "Google Chrome" http://localhost:${projectType === 'Next.js' ? 3000 : 5173}`

// Start dev server
await $`npm run dev`
