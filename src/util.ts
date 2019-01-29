// Dependencies ---------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';

// Exports --------------------------------------------------------------------
export interface Buffer {
    toString(): string;
}

export interface FileStat {
    isDirectory(): boolean;
}

export interface Console {
    log(...args: any[]): void;
    error(...args: any[]): void;
}

export interface FileSystem {
    readFileSync(path: string): Buffer;
    writeFileSync(path: string, data: string): void;
    existsSync(path: string): boolean;
    readdirSync(path: string): string[];
    lstatSync(path: string): FileStat;
    mkdirSync(path: string, options?: object): void;
    rmdirSync(path: string): void;
    unlinkSync(path: string): void;
}

export function rmDirSync(p: string, fs: FileSystem) {
    fs.readdirSync(p).forEach((file, index) => {
        const curPath = path.join(p, file);
        if (fs.lstatSync(curPath).isDirectory()) {
            rmDirSync(curPath, fs);

        } else {
            fs.unlinkSync(curPath);
        }
    });
    fs.rmdirSync(p);
}

