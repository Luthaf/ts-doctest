// Dependencies ---------------------------------------------------------------
import * as fs from 'fs';
import * as ts from 'typescript';
import {Config} from './Config';
import {Generator} from './Generator';

// CLI ------------------------------------------------------------------------
export function main() {

    const cwd = process.cwd();
    const host: ts.ParseConfigFileHost = {
        useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
        fileExists: fs.existsSync,
        readFile: fileName => fs.readFileSync(fileName).toString(),
        getCurrentDirectory: () => cwd,
        readDirectory: ts.sys.readDirectory,
        onUnRecoverableConfigFileDiagnostic: diagnostic => {}
    };

    const config = Config.fromArguments(process.argv.slice(2), host);
    if (config instanceof Config) {
        const generator = new Generator(config);
        try {
            generator.run(fs, console);

        } catch (err) {
            console.error(`[Error] ${err.message}`);
        }

    } else {
        console.error(`[Error] ${config.message}`);
    }

}

