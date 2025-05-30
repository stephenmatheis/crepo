import { execa } from 'execa'
import fs from 'fs-extra'
import path from 'path'
import 'zx/globals'

const npmPath = (await $`which npm`).stdout.trim()
const nodePath = (await $`which node`).stdout.trim()
const binDirs = new Set([
    path.dirname(npmPath),
    path.dirname(nodePath),
])
const PATH = [...binDirs, process.env.PATH].join(':')
const cliPath = path.resolve('index.mjs')
const testRoot = path.resolve('tests');
const outputDir = path.join(testRoot, 'output');
const ghUser = (await execa('gh', ['api', 'user', '--jq', '.login'])).stdout.trim()
const tests = [
    {
        label: 'Vite basic',
        args: ['--vite', 'test-vite'],
        projectName: 'test-vite',
    },
    {
        label: 'Next basic',
        args: ['--next', 'test-next'],
        projectName: 'test-next',
    },
    {
        label: 'Prompt fallback',
        env: { TEST_MODE: 'true' },
        args: [],
        projectName: 'test-prompt',
    },
    {
        label: 'Missing name',
        args: ['--vite'],
        shouldFail: true,
    },
    {
        label: 'Invalid mixed flags',
        args: ['--vite', '--next', 'conflict'],
        shouldFail: true,
    },
    {
        label: 'Looks like flag',
        args: ['--vite', '--prod'],
        shouldFail: true,
    },
    {
        label: 'Unsanitizable name',
        args: ['--vite', '///!!!'],
        shouldFail: true,
    },
]

async function cleanup() {
    console.log('\nCleaning up test directories and GitHub repos...')

    await fs.remove(testRoot)

    for (const test of tests) {
        const name = test.projectName

        if (!name) continue

        try {
            await execa('gh', ['repo', 'delete', `${ghUser}/${name}`, '--yes'])
            console.log(`Deleted repo: ${ghUser}/${name}`)
        } catch {
            console.log(`No repo found or already deleted: ${ghUser}/${name}`)
        }
    }

    await fs.ensureDir(outputDir)

}

async function runTest(test) {
    const testDir = path.join(testRoot, test.label.replace(/\s+/g, '-').toLowerCase())
    const projectPath = test.projectName ? path.join(testDir, test.projectName) : null
    const outFile = path.join(outputDir, `${test.label.replace(/\s+/g, '-').toLowerCase()}.log`)


    console.log(`\n=== ${test.label} ===`)

    await fs.remove(testDir)
    await fs.ensureDir(testDir)

    const opts = {
        cwd: testDir,
        env: {
            ...process.env,
            ...(test.env || {}),
            PATH,
            TEST_MODE: 'true',
        },
    }

    try {
        const { stdout, stderr } = await execa('node', [cliPath, ...test.args], opts)

        await fs.writeFile(outFile, stdout + '\n' + stderr)

        if (test.shouldFail) {
            console.error(`❌ Unexpected pass: ${test.label}`)
            return
        }

        if (!projectPath || !fs.existsSync(path.join(projectPath, 'README.md'))) {
            throw new Error('Missing README.md')
        }

        const packageExists = fs.existsSync(path.join(projectPath, 'package.json'))
        const gitFolderExists = fs.existsSync(path.join(projectPath, '.git'))

        if (packageExists && gitFolderExists) {
            console.log(`✅ Passed: ${test.label}`)
        } else {
            console.error(`❌ Failed: ${test.label} — Missing expected files`)
        }
    } catch (err) {
        await fs.writeFile(outFile, err.stdout + '\n' + err.stderr)

        if (test.shouldFail) {
            console.log(`✅ Expected fail: ${test.label}`)
        } else {
            console.error(`❌ Failed: ${test.label}`)
            console.error(err.shortMessage || err.message)
        }
    }
}

async function main() {
    console.log('\nRunning crepo test suite...')

    for (const test of tests) {
        await runTest(test)
    }

}

await cleanup()
await main()

console.log('\n✅ All tests complete.')
