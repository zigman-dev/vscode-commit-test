//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import { URL } from 'url';
import * as vscode from 'vscode';

let svn = require('svn-interface')
let jenkins = require('jenkins')
let fs = require('fs')

//------------------------------------------------------------------------------
//  functions
//------------------------------------------------------------------------------
let callback = (err: Error, data: string) => {
    if (err) console.error(err);
    console.log(data)
}

//------------------------------------------------------------------------------
// FIXME: Create a class for svn operations
async function svn_is_workspace(wc: string): Promise<boolean> {
    let result = await new Promise<boolean>((resolve, reject) => {
        svn.info(
            wc,
            {},
            (error: Error, result: any) => {
                resolve(error == null);
            }
        )
    })
    return result;
}

//------------------------------------------------------------------------------
async function svn_get_patch(wc: string): Promise<string> {
    let diff = await new Promise<string>((resolve, reject) => {
        svn._execSVN(
            "diff",
            wc,
            {"patch-compatible": true},
            (error: Error, result: any) => {
                resolve(result);
            }
        )
    })
    return diff;
}


//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
export default async function commitTest() {
    console.log("commitTest()")

    //------------------------
    //  select svn workspace
    //------------------------
    // FIXME: Rewrite with filter/map
    let folders: vscode.WorkspaceFolder[] = [];
    for (let folder of vscode.workspace.workspaceFolders || []) {
        let result = await svn_is_workspace(folder.uri.fsPath);
        console.log(folder.name, ":", result);
        if (result)
            folders.push(folder);
    }

    if (folders.length == 0) {
        vscode.window.showWarningMessage('No svn folder exists');
        return;
    }
    let folder = folders[0];
    if (folders.length > 1) {
        let pick = await vscode.window.showQuickPick(
            folders.map(folder => {
                return {
                    label: folder.name,
                    folder: folder
                }
            }),
            { placeHolder: "Pick a folder" }
        );
        if (!pick)
            return
        folder = pick.folder
    }

    console.log(`Go for ${folder.name}`);

    //---------------------
    //   generate patch
    //---------------------
    let cwd = process.cwd()
    process.chdir(folder.uri.fsPath);
    let diff = await svn_get_patch(".");
    process.chdir(cwd);
    console.log(diff);

    //---------------------
    //  submit to Jenkins
    //---------------------
    // Get user acount if supplied
    let config = vscode.workspace.getConfiguration("commit-test.jenkins")
    let user = config.get<string>("account.user")
    let password = config.get<string>("account.password")
    let host = config.get<string>("hostAddress")
    let job = config.get<string>("jobName")
    
    if (!host) {
        vscode.window.showErrorMessage('Host name is undefined');
        return
    }
    
    let url = new URL(host)
    if (user)
        url.username = user
    if (password)
        url.password = password
    
    try {
        let jenkinsInstance = jenkins({
            baseUrl: url.href,
            crumbIssuer: true,
            formData: require('form-data'),
            promisify: true
        })
        let response = await jenkinsInstance.job.build(
            {
                name: job,
                parameters: { 
                    patch: Buffer.from(diff),
                    mail: 'jy.hsu@realtek.com'
                }
            },
            callback
        )
        console.log(response)
        vscode.window.showInformationMessage('Submitted');
    } catch (error) {
        console.error(error)
        vscode.window.showWarningMessage('Oops, the required job is not found');
    }
}
