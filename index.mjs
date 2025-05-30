#!/usr/bin/env node

import { homedir } from 'os'
import path from 'path'
import { select, input } from '@inquirer/prompts'
import 'zx/globals'

console.log(`\ncrepo - spin up your next repo in seconds\n`)

const args = process.argv.slice(2)
let projectType
let name

if (args.includes('--vite')) {
    projectType = 'Vite (React + TS)'
    name = args[args.indexOf('--vite') + 1]
} else if (args.includes('--next')) {
    projectType = 'Next.js'
    name = args[args.indexOf('--next') + 1]
}


if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    process.stdin.on('data', (key) => {
        if (key === '\u001b') cleanExit('✌️')
        if (key === '\u0003') cleanExit('✌️')
    })
}

if (!projectType || !name) {
    projectType = await select({
        message: 'Choose a project type:',
        choices: ['Next.js', 'Vite (React + TS)'],
    })

    name = (await input({ message: 'Project name:' })).trim().toLowerCase().replace(/\s+/g, '-')
}

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
await $`echo "# ${name}\n\nScaffolded using \`crepo\`." > README.md`
await $`git add .`
await $`git commit -m "Initial commit via crepo"`
await $`npx prettier --write .`

const isCodeInstalled = await $`which code`.then(() => true).catch(() => false)

if (isCodeInstalled) {
    await $`code .`
    await snapWindow('left-half')
} else {
    console.log('VS Code (code) CLI not found. Skipping editor launch.')

}

const isChromeInstalled = await $`ls /Applications/Google\\ Chrome.app`.then(() => true).catch(() => false)

if (isChromeInstalled) {
    await $`open -a "Google Chrome" http://localhost:${projectType === 'Next.js' ? 3000 : 5173}`
    await snapWindow('right-half')
} else {
    console.log('Chrome not found. Skipping browser launch.')
}


async function snapWindow(position) {
    const isRectangleInstalled = await $`ls /Applications/Rectangle.app`.then(() => true).catch(() => false)

    if (isRectangleInstalled) {
        await $`open -g rectangle://execute-action?name=${position}`
    }
}

function cleanExit(message) {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
        process.stdin.pause()
    }

    console.log(`\n${message}`)
    process.exit(0)
}