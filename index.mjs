#!/usr/bin/env node

import figlet from 'figlet'
import { cristal } from 'gradient-string'
import ora from 'ora'
import chalk from 'chalk'
import { existsSync } from 'fs'
import { access, writeFile } from 'fs/promises';
import path from 'path'
import os, { homedir } from 'os'
import { select, input, confirm } from '@inquirer/prompts'
import { setTimeout as wait } from 'timers/promises'
import 'zx/globals'

const scaffoldSpinner = ora()
const banner = figlet.textSync('crepo', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default',
})

console.log(cristal(banner))
console.log('');

let projectType
let name

const args = process.argv.slice(2)

if (args.includes('--vite') && args.includes('--next')) {
    usageError('Please choose only one: --vite or --next')
}

if (args.includes('--vite')) {
    projectType = 'Vite (React + TS)'
    name = args[args.indexOf('--vite') + 1]

    if (!name) usageError('crepo --vite app-name')

} else if (args.includes('--next')) {
    projectType = 'Next.js'
    name = args[args.indexOf('--next') + 1]

    if (!name) usageError('crepo --next app-name')
}

if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (key) => {
        if (key === '\u001b' || key === '\u0003') {
            console.log('');

            cleanExit('✌️')
        }
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

if (existsSync(name)) {
    cleanExit(chalk.red(`Boo. '${name}' already exists.`), 1)
}

scaffoldSpinner.text = `Creating repo...`
scaffoldSpinner.start()

const isNext = projectType === 'Next.js'


try {
    if (isNext) {
        await $`npx create-next-app@latest ${name} --ts --eslint --no-tailwind --app --no-src-dir --empty --import-alias '@/*' --turbopack --no-interactive`
    } else {
        await $`npm create vite@latest ${name} -- --template react-ts`
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
const missingFiles = [prettierFile, eslintFile, tsconfigFile].filter(file => !existsSync(file))

if (!existsSync(templateDir) || missingFiles.length > 0) {
    console.error(chalk.red('Missing one or more required dev-templates files:'))

    if (!existsSync(templateDir)) {
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

    await wait(1000)

    if (!isNext) {
        scaffoldSpinner.text = 'Installing dependencies...'
        await $`npm install`
    }

    scaffoldSpinner.text = 'Creating README...'

    await writeFile('README.md', `# ${name}\n\nScaffolded with \`crepo\`.`);
    await wait(1000)

    scaffoldSpinner.text = 'Formatting with Prettier...'

    await $`npx prettier --write .`

    if (isNext && existsSync('.git')) {
        await $`rm -rf .git`
    }

    scaffoldSpinner.text = 'Initializing Git...'

    await $`git init`
    await $`git add .`
    await $`git commit -am "init"`

    // TODO: gh push
    // const isGHInstalled = await isInstalled('gh')
    // const hasRemote = await $`git remote`.then(out => out.stdout.trim() !== '').catch(() => false)

    // if (!hasRemote && isGHInstalled) {
    //     const createRemote = await confirm({ message: 'Create GitHub repo and push?' })

    //     if (createRemote) {
    //         await $`gh repo create ${name} --private --source=. --push`
    //         await $`gh repo view --web`
    //     }
    // }

    const isCodeInstalled = await isInstalled('code')

    if (isCodeInstalled) {
        scaffoldSpinner.text = 'Opening VS Code...'

        await $`code .`
        await snapWindow('left-half')
    } else {
        console.log(chalk.cyan('VS Code (code) CLI not found. Skipping editor launch.'))
    }

    const isChromeInstalled = await isInstalled('chrome')

    if (isChromeInstalled) {
        scaffoldSpinner.text = 'Opening Chrome...'

        await $`open -a "Google Chrome" http://localhost:${isNext ? 3000 : 5173}`
        await snapWindow('right-half')
    } else {
        console.log(chalk.cyan('Chrome not found. Skipping browser launch.'))
    }

    scaffoldSpinner.succeed(`${name} created.`)

    console.log('\n✌️\n');

    process.exit(0);

} catch (err) {
    scaffoldSpinner.fail(`Failed during: ${scaffoldSpinner.text}`)

    console.error(err)

    cleanExit('Exiting with error', 1)
}

function cleanExit(message, code = 0) {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
        process.stdin.pause()
    }

    if (scaffoldSpinner && scaffoldSpinner.isSpinning) {
        scaffoldSpinner.stop()
    }

    console.log(`\n${message}\n`)
    process.exit(code)
}

async function isInstalled(appName) {
    if (await isInPath(appName)) return true;

    if (appName === 'chrome') return await isChromeInstalled();
    if (appName === 'code') return await isInPath('code');
    if (appName === 'rectangle') {
        try {
            await access('/Applications/Rectangle.app');
            return true;
        } catch {
            return false;
        }
    }

    return false;
}

async function isChromeInstalled() {
    const platform = os.platform();

    const candidates = [];

    if (platform === 'darwin') {
        candidates.push(
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
        );
    } else if (platform === 'linux') {
        candidates.push('google-chrome', 'chromium-browser', 'chromium');
    }

    for (const cmd of candidates) {
        try {
            if (path.isAbsolute(cmd)) {
                await access(cmd);

                return true;
            } else if (await isInPath(cmd)) {
                return true;
            }
        } catch {
            continue;
        }
    }

    return false;
}

async function isInPath(binary) {
    try {
        const { stdout } = await $`command -v ${binary}`;

        return stdout.trim().length > 0;
    } catch {
        return false;
    }
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
    console.error(chalk.red(`Missing repo name.\nUsage: ${example}`))
    process.exit(1)
}
