// Dependencies ---------------------------------------------------------------
import * as path from 'path';
import * as ts from 'typescript';
import {Config} from './Config';
import {DocSource} from './DocTest';
import {MarkdownSource} from './MarkdownSource';
import {TypeScriptSource} from './TypeScriptSource';
import {rmDirSync, Console, FileSystem} from './util';

// Doc Test Generator ---------------------------------------------------------
export class Generator {

    private config: Config;

    constructor(config: Config) {
        this.config = config;
    }

    public run(fs: FileSystem, console: Console) {

        console.log(`Using configuration from: ${this.config.configFile}`);

        // Remove all existing doc tests
        if (fs.existsSync(this.config.testBase)) {
            console.log(`Removing previously generated doc tests in: ${this.config.testBase}`)
            rmDirSync(this.config.testBase, fs);
        }

        // Generate new doc tests from all sources picked up by the TS compiler
        if (this.config.includedFiles.length) {
            this.scanProject(fs, console);

        } else {
            console.log('No source files in project!');
        }

    }

    private scanProject(fs: FileSystem, console: Console) {

        console.log(`Scanning ${this.config.includedFiles.length} project file(s) for doc tests...`);
        const sources = this.loadSourceFiles(fs);
        const testCount = this.generateTestFiles(sources, fs, console);

        if (testCount === 0) {
            console.log('No doc tests found / generated.');

        } else {
            console.log(`Generated ${testCount} doc test(s) in total.`);
        }

    }

    private loadSourceFiles(fs: FileSystem): DocSource[] {
        return this.config.includedFiles.map((fileName) => {

            const raw = fs.readFileSync(fileName).toString();
            const ext = path.parse(fileName).ext.toLowerCase();

            // Markdown Sources
            if (ext === '.md') {
                return new MarkdownSource(fileName, raw, this.config.importResolver);

            // TypeScript Sources
            } else {
                return new TypeScriptSource(fileName, raw, this.config.importResolver);
            }

        }).filter(source => source.hasTests());
    }

    private generateTestFiles(sources: DocSource[], fs: FileSystem, console: Console): number {
        let generatedTests = 0;
        sources.map(source => {

            const testSourceFile = path.join(
                this.config.testBase,
                source.path.substring(this.config.projectDir.length)
            );

            fs.mkdirSync(path.dirname(testSourceFile), {
                recursive: true
            });

            const tests = source.generateTests();
            for(const test of tests) {
                const docTestFile = testSourceFile.replace(/\.*$/, `.${test.name}.test.ts`);
                console.log(`Generated doc test: ${docTestFile}`);
                fs.writeFileSync(docTestFile, test.source);
                generatedTests += 1;
            }

        });
        return generatedTests;
    }

}

