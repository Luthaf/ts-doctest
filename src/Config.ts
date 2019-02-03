// Dependencies ---------------------------------------------------------------
import * as path from 'path';
import * as ts from 'typescript';
import {FileSystem} from './util';

// Constants ------------------------------------------------------------------
const USAGE_HELP = `USAGE:

    ts-doctest PROJECT_DIR TEST_DIR
`;

// Types ----------------------------------------------------------------------
export type ProjectImportResolver = (sourceFile: string) => SourceImportResolver;
export type SourceImportResolver = (importPath: string) => string;

// Configuration --------------------------------------------------------------
export class Config {

    public projectDir: string;
    public configFile: string;
    public testBase: string;
    public includedFiles: string[];
    public importResolver: ProjectImportResolver;

    constructor(projectDir: string, configFile: string, includedFiles: string[], testBase: string, importResolver: ProjectImportResolver) {
        this.projectDir = projectDir;
        this.configFile = configFile;
        this.includedFiles = includedFiles;
        this.testBase = testBase;
        this.importResolver = importResolver;
    }

    public static fromArguments(argv: string[], host: ts.ParseConfigFileHost): Config | Error {

        if (argv.length != 2 || argv[0] === '--help') {
            return new Error(USAGE_HELP);
        }

        const projectDir = resolveArgPath(host, argv[0]);
        const configFile = path.join(projectDir, 'tsconfig.json');
        if (!host.fileExists(configFile)) {
            return new Error(`No TypeScript configuration file found: ${configFile}`);
        }

        // Parse TS Config
        const options = ts.getParsedCommandLineOfConfigFile(configFile, {}, host)!;
        const testBase = path.join(resolveArgPath(host, argv[1]), 'doc');
        const importResolver = (sourceFile: string) => {
            return (importPath: string) => {

                // Resolve imports in tests using the TS compiler
                const result = ts.resolveModuleName(importPath, sourceFile, options.options, host);
                if (result.resolvedModule) {
                    // Make the imports relative to the generated test file
                    const testFile = path.join(testBase, sourceFile.substring(projectDir.length));

                    const moduleFile = result.resolvedModule.resolvedFileName;
                    return path.relative(path.dirname(testFile), moduleFile).replace(/\.ts$/, '');

                } else {
                    return importPath;
                }

            };
        };

        const includedFiles = options.fileNames.slice().filter((file) => {
            // Exclude any existing files in the target test directory even
            // if they match the typescript project includes
            return file.substring(0, testBase.length) !== testBase;
        });

        const readmeFile = path.join(projectDir, 'README.md');
        if (host.fileExists(readmeFile)) {
            includedFiles.push(readmeFile);
        }
        return new Config(projectDir, configFile, includedFiles, testBase, importResolver);

    }

}

// Helpers --------------------------------------------------------------------
function resolveArgPath(host: ts.ParseConfigFileHost, p: string): string {
    if (p[0] === path.sep) {
        return p;

    } else {
        return path.join(host.getCurrentDirectory(), p);
    }
}

