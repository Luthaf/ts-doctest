// Dependencies ---------------------------------------------------------------
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import {FileSystem} from '../src/util';

// Mocks ----------------------------------------------------------------------
export interface DirMap {
    [key: string]: FileMap;
}

export interface FileMap {
    [key: string]: string;
}

export interface MockConsole {
    logs: Array<any[]>;
    errors: Array<any[]>;
    log(...args: any[]): void;
    error(...args: any[]): void;
}

export interface MockFileSystem extends FileSystem {
    filesWritten: FileMap,
    filesUnlinked: string[],
    dirsCreated: string[],
    dirsRemoved: string[],
}

export function mockFileSystem(
    files: FileMap,
    dirs: DirMap

): MockFileSystem {
    const filesWritten: FileMap = {};
    const dirsRemoved: string[] = [];
    const dirsCreated: string[] = [];
    const filesUnlinked: string[] = [];
    return {

        filesWritten,
        filesUnlinked,
        dirsCreated,
        dirsRemoved,

        readFileSync: (path) => Buffer.from(files[path]!),
        writeFileSync: (path, data) => filesWritten[path] = data,
        readdirSync: (path) => Object.keys(dirs[path]),
        lstatSync: (path) => {
            return {
                isDirectory(): boolean {
                    return dirs.hasOwnProperty(path);
                }
            };
        },
        existsSync: (path) => files.hasOwnProperty(path) || dirs.hasOwnProperty(path),
        mkdirSync: (path) => dirsCreated.push(path),
        rmdirSync: (path) => dirsRemoved.push(path),
        unlinkSync: (path) => filesUnlinked.push(path),

    };
}

export function mockHost(cwd: string, files: FileMap): ts.ParseConfigFileHost {
    return {
        useCaseSensitiveFileNames: true,
        fileExists: (fileName) => {
            return files.hasOwnProperty(fileName);
        },
        readFile: (fileName) => {
            return files[fileName]!;
        },
        getCurrentDirectory: () => cwd,
        readDirectory: (rootDir: string, exts: ReadonlyArray<string>, excludes: ReadonlyArray<string>, includes: ReadonlyArray<string>, depth?: number): ReadonlyArray<string> => {
            const keys = Object.keys(files).filter((key) => {
                return exts.indexOf(path.parse(key).ext) !== -1;
            });

            // TODO filter by includes
            // TODO filter by excludes
            return keys;
        },
        onUnRecoverableConfigFileDiagnostic: diagnostic => {}

    };
}

export function mockConsole(): MockConsole {
    const logs: Array<any[]> = [];
    const errors: Array<any[]> = [];
    return {
        logs,
        errors,
        log: (...args: any[]) => {
            logs.push(args);
        },
        error: (...args: any[]) => {
            errors.push(args);
        }
    };
}

export function loadFile(fileName: string): string {
    const p = path.join(__dirname, fileName);
    return fs.readFileSync(p).toString();
}


export const TS_CONFIG_JSON = {
    compilerOptions: {
        target: "es6",
        lib: ["es2017"],
        module: "commonjs",
        strict: true,
        outDir: "lib"
    },
    include: [
        "src/**/*.ts",
        "tests/**/*.test.ts"
    ]
};

