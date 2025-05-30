#!/usr/bin/env node

import { homedir } from 'os'
import path from 'path'
import { select, input } from '@inquirer/prompts'
import { setTimeout as wait } from 'timers/promises'
import 'zx/globals'

// Title screen
console.log(`\n🚀 mkrepo - spin up your next repo in seconds\n`)

// Ask project type
const projectType = await select({
    message: 'Choose a project type:',
    choices: ['Next.js', 'Vite (React + TS)'],
})

// Ask project name
const name = await input({ message: 'Project name:' })

// Create project
if (projectType === 'Next.js') {
    await $({ stdio: 'inherit' })`npx create-next-app@latest ${name} --ts --eslint --use-npm --no-tailwind --app --no-src-dir --import-alias '@/*' --turbopack --no-interactive`
} else {
    await $`npm create vite@latest ${name} -- --template react-ts`
}

// Change into project directory
cd(name)

const templateDir = path.join(homedir(), 'dev-templates', projectType === 'Next.js' ? 'nextjs' : 'vite')

// Copy shared Prettier config
await $`cp ${path.join(homedir(), 'dev-templates', '.prettierrc.json')} .`

// Copy project-specific ESLint and TS configs
await Promise.all([
    $`cp ${path.join(templateDir, 'eslint.config.mjs')} .`,
    $`cp ${path.join(templateDir, 'tsconfig.json')} .`,
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
// await wait(700)
await $`open -g rectangle://execute-action?name=left-half`

// Open in browser
await $`open -a "Google Chrome" http://localhost:${projectType === 'Next.js' ? 3000 : 5173}`
// await wait(700)
await $`open -g rectangle://execute-action?name=right-half`
