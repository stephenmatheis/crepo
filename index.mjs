#!/usr/bin/env node

import figlet from 'figlet';
import { cristal } from 'gradient-string';
import ora from 'ora'
import chalk from 'chalk';
import fs from 'fs'
import path from 'path'
import { homedir } from 'os'
import { select, input, confirm } from '@inquirer/prompts'
import 'zx/globals'

const banner = figlet.textSync('crepo', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default',
});

console.log(cristal(banner));


const args = process.argv.slice(2)
let projectType
let name

if (args.includes('--vite') && args.includes('--next')) {
    usageError('Please choose only one: --vite or --next');
}

if (args.includes('--vite')) {
    projectType = 'Vite (React + TS)'
    name = args[args.indexOf('--vite') + 1]

    if (!name) usageError('crepo --vite app-name');

} else if (args.includes('--next')) {
    projectType = 'Next.js'
    name = args[args.indexOf('--next') + 1]

    if (!name) usageError('crepo --next app-name');
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

    name = await input({ message: 'Project name:' })
}

if (/^--?[\w-]+$/.test(name)) {
    usageError(`Invalid project name: ${name}`)
}

name = sanitizeName(name)

const isNext = projectType === 'Next.js'
const scaffoldSpinner = ora(`Scaffolding ${projectType} ...`).start()

try {
    if (isNext) {
        await $({ stdio: 'pipe' })`npx create-next-app@latest ${name} --ts --eslint --use-npm --no-tailwind --app --no-src-dir --import-alias '@/*' --turbopack --no-interactive`
    } else {
        await $({ stdio: 'pipe' })`npm create vite@latest ${name} -- --template react-ts`
    }

    scaffoldSpinner.text = `${projectType} app created`
} catch (error) {
    scaffoldSpinner.fail(`Failed to create ${projectType} app`)
    console.error(chalk.red(error.stderr || error.message))
    process.exit(1)
}

const templateRoot = path.join(homedir(), 'dev-templates')
const templateDir = path.join(templateRoot, isNext ? 'nextjs' : 'vite')
const eslintFile = path.join(templateDir, isNext ? 'eslint.config.mjs' : 'eslint.config.js')
const tsconfigFile = path.join(templateDir, 'tsconfig.json')
const prettierFile = path.join(templateRoot, '.prettierrc.json')
const missingFiles = [prettierFile, eslintFile, tsconfigFile].filter(file => !fs.existsSync(file))

if (!fs.existsSync(templateDir) || missingFiles.length > 0) {
    console.error(chalk.red('Missing one or more required dev-templates files:'))

    if (!fs.existsSync(templateDir)) {
        console.error(chalk.red(`- Template directory not found: ${templateDir}`))
    }

    for (const file of missingFiles) {
        console.error(chalk.red(`- Missing file: ${file}`))
    }

    cleanExit('Fix the missing files and try again.')
}

cd(path.resolve(name))

try {
    scaffoldSpinner.text = 'Copying config files...'

    await Promise.all([
        $`cp ${prettierFile} .`,
        $`cp ${eslintFile} .`,
        $`cp ${tsconfigFile} .`,
    ])

    if (!isNext) {
        scaffoldSpinner.text = 'Installing dependencies...'
        await $({ stdio: 'pipe' })`npm install`
    }

    scaffoldSpinner.text = 'Formatting with Prettier...'

    await $`echo "# ${name}\n\nScaffolded with \`crepo\`." > README.md`
    await $`npx prettier --write .`

    scaffoldSpinner.text = 'Initializing Git...'

    await $`git init`
    await $`git add .`
    await $`git commit -m "init"`

    const isGHInstalled = await isInstalled('gh');
    const hasRemote = await $`git remote`.then(out => out.stdout.trim() !== '').catch(() => false)

    if (!hasRemote && isGHInstalled) {
        const createRemote = await confirm({ message: 'Create GitHub repo and push?' })

        if (createRemote) {
            await $`gh repo create ${name} --private --source=. --push`
            await $`gh repo view --web`
        }
    }

    const isCodeInstalled = await isInstalled('code');

    if (isCodeInstalled) {
        await $`code .`
        await snapWindow('left-half')
    } else {
        console.log(chalk.cyan('VS Code (code) CLI not found. Skipping editor launch.'))
    }

    const isChromeInstalled = await isInstalled('google-chrome') || await isInstalled('chrome');

    if (isChromeInstalled) {
        await $`open -a "Google Chrome" http://localhost:${isNext ? 3000 : 5173}`
        await snapWindow('right-half')
    } else {
        console.log(chalk.cyan('Chrome not found. Skipping browser launch.'))
    }

    scaffoldSpinner.succeed('Done.');

    console.log(chalk.greenBright(`\n✨ ${name} is ready ✌️\n`));
} catch (error) {
    scaffoldSpinner.fail('Something went wrong.');
    console.error(err);
    process.exit(1);
}

function cleanExit(message) {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
        process.stdin.pause()
    }

    console.log(`\n${message}`)
    process.exit(0)
}

async function isInstalled(cmd) {
    return $`which ${cmd}`.then(() => true).catch(() => false);
}

function sanitizeName(raw) {
    return raw
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/-+$/, '')
}

async function snapWindow(position) {
    const isRectangleInstalled = await $`ls /Applications/Rectangle.app`.then(() => true).catch(() => false)

    if (isRectangleInstalled) {
        await $`open -g rectangle://execute-action?name=${position}`.catch(() => { })
    }
}

function usageError(example) {
    console.error(chalk.red(`Missing repo name.\nUsage: ${example}`));
    process.exit(1);
}
