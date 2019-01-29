// Dependencies ---------------------------------------------------------------
import * as ts from 'typescript';
import {Config} from './Config';
import {Generator} from './Generator';
import {Console, FileSystem} from './util';

// CLI ------------------------------------------------------------------------
export function run(process: {
    cwd: () => string,
    argv: string[]

}, fs: FileSystem, console: Console) {

    const cwd = process.cwd();
    const host: ts.ParseConfigFileHost = {
        useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
        fileExists: fs.existsSync,
        readFile: fileName => fs.readFileSync(fileName).toString(),
        getCurrentDirectory: () => cwd,
        readDirectory: ts.sys.readDirectory,
        onUnRecoverableConfigFileDiagnostic: /*istanbul ignore next*/ diagnostic => {}
    };

    const config = Config.fromArguments(process.argv.slice(2), host);
    if (config instanceof Config) {
        const generator = new Generator(config);
        generator.run(fs, console);

    } else {
        console.error(config.message);
    }

}

