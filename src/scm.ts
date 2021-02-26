//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import vscode from 'vscode';
import svn from 'svn-interface';
import simpleGit, { SimpleGit } from 'simple-git';
import { getVSCodeDownloadUrl } from 'vscode-test/out/util';

let cp = require('child_process');

export default { getScmWorkspace };

//------------------------------------------------------------------------------
//  types
//------------------------------------------------------------------------------
export enum Type {
    None,
    Svn,
    Git
}

//------------------------------------------------------------------------------
export interface Scm {
    type: Type;
    folder: vscode.WorkspaceFolder;
    getPatch(changelist: string | null): Promise<string>;
    getChangelists(): Promise<string[]>;
}

//------------------------------------------------------------------------------
class None implements Scm {
    type: Type = Type.None;
    folder: vscode.WorkspaceFolder;

    //--------------------------------------------------------------------------
    constructor(folder: vscode.WorkspaceFolder) {
        this.folder = folder;
    }

    //--------------------------------------------------------------------------
    async getPatch(changelist: string | null): Promise<string> {
        return Promise.reject(Error("Invalid SCM"));
    }

    //--------------------------------------------------------------------------
    async getChangelists(): Promise<string[]> {
        return Promise.reject(Error("Invalid SCM"));
    }
};

//------------------------------------------------------------------------------
class Svn implements Scm {
    type: Type = Type.Svn;
    folder: vscode.WorkspaceFolder;

    //--------------------------------------------------------------------------
    static async isWorkspace(path: string): Promise<boolean> {
        let result = await new Promise<boolean>((resolve, reject) => {
            svn.info(
                path,
                {},
                (error: Error, result: any) => {
                    resolve(error == null);
                }
            )
        })
        return result;
    }

    //--------------------------------------------------------------------------
    constructor(folder: vscode.WorkspaceFolder) {
        this.folder = folder;
    }

    //--------------------------------------------------------------------------
    async getChangelists(): Promise<string[]> {
        let changelists = await new Promise<string[]>((resolve, reject) => {
            svn.status(
                this.folder.uri.fsPath,
                {},
                (error: Error, result: any) => {
                    let cls = Array.isArray(result.status.changelist) ?
                        result.status.changelist : [result.status.changelist];
                    console.log(cls);
                    resolve(cls.map(
                        (changelist: any) => changelist._attribute.name
                    ))
                }
            )
        });
        changelists.push("<default>");
        console.log(changelists)
        return changelists;
    }

    //--------------------------------------------------------------------------
    async getPatch(changelist: string | null): Promise<string> {
        let cwd = process.cwd();
        process.chdir(this.folder.uri.fsPath);
        let options: Record<string, string | true> = {
            "patch-compatible": true
        };
        if (changelist != "<default>" && changelist != null)
            options["changelist"] = changelist;
        let patch = await new Promise<string>((resolve, reject) => {
            svn._execSVN(
                "diff",
                ".",
                options,
                (error: Error, result: any) => {
                    resolve(result);
                }
            )
        })
        process.chdir(cwd);
        return patch;
    }
};

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
class Git implements Scm {
    type: Type = Type.Git;
    folder: vscode.WorkspaceFolder;
    private git: SimpleGit;

    //--------------------------------------------------------------------------
    static async isWorkspace(path: string): Promise<boolean> {
        let git = simpleGit(path);
        let result = false;
        try {
            await git.status();
            result = true;
        } catch (error) {
            console.log(error);
        }
        return result;
    }

    //--------------------------------------------------------------------------
    constructor(folder: vscode.WorkspaceFolder) {
        this.folder = folder;
        this.git = simpleGit(folder.uri.fsPath);
    }

    //--------------------------------------------------------------------------
    async getChangelists(): Promise<string[]> {
        return ['<staged>', '<unstaged>'];
    }

    //--------------------------------------------------------------------------
    async getPatch(changelist: string | null): Promise<string> {
        let options = [];
        if (changelist == "<staged>")
            options.push("--cached");
        return await this.git.diff(options);
    }
};

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
export async function getScmWorkspace(folder: vscode.WorkspaceFolder): Promise<Scm> {

    if (await Svn.isWorkspace(folder.uri.fsPath))
        return new Svn(folder);
    else if (await Git.isWorkspace(folder.uri.fsPath))
        return new Git(folder);
    return new None(folder);
}
