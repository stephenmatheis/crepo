#!/usr/bin/env node

import { homedir } from 'os'
import path from 'path'
import { select, input } from '@inquirer/prompts'
import 'zx/globals'

console.log(`\ncrepo - spin up your next repo in seconds\n`)

if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key) => {
        if (key === '\u001b') cleanExit('✌️')
        if (key === '\u0003') cleanExit('✌️')
    });
}

const projectType = await select({
    message: 'Choose a project type:',
    choices: ['Next.js', 'Vite (React + TS)'],
})

const name = (await input({ message: 'Project name:' })).trim().toLowerCase().replace(/\s+/g, '-')

if (projectType === 'Next.js') {
    await $({ stdio: 'inherit' })`npx create-next-app@latest ${name} --ts --eslint --use-npm --no-tailwind --app --no-src-dir --import-alias '@/*' --turbopack --no-interactive`
} else {
    await $`npm create vite@latest ${name} -- --template react-ts`
}

cd(name)

const templateDir = path.join(homedir(), 'dev-templates', projectType === 'Next.js' ? 'nextjs' : 'vite')

await $`cp ${path.join(homedir(), 'dev-templates', '.prettierrc.json')} .`
await Promise.all([
    $`cp ${path.join(templateDir, 'eslint.config.mjs')} .`,
    $`cp ${path.join(templateDir, 'tsconfig.json')} .`,
])
await $`npm install`
await $`git init`
await $`git add .`
await $`git commit -m "Initial commit via crepo"`
await $`npx prettier --write .`

await $`code .`
await snapWindow('left-half')

await $`open -a "Google Chrome" http://localhost:${projectType === 'Next.js' ? 3000 : 5173}`
await snapWindow('right-half')

async function snapWindow(position) {
    const isRectangleInstalled = await $`ls /Applications/Rectangle.app`.then(() => true).catch(() => false)

    if (isRectangleInstalled) {
        await $`open -g rectangle://execute-action?name=${position}`
    }
}

function cleanExit(message) {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
    }

    console.log(`\n${message}`);
    process.exit(0);
}