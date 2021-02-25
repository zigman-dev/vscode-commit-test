//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import vscode from 'vscode';
import svn from 'svn-interface';
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
        console.log('Svn.getChangelist()')
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
        })
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
        if (changelist != null)
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
// FIXME: Implement Git


//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
export async function getScmWorkspace(folder: vscode.WorkspaceFolder): Promise<Scm> {

    if (await Svn.isWorkspace(folder.uri.fsPath))
        return new Svn(folder);
    return new None(folder);
}
