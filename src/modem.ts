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
async function is_svn_workspace(wc: string): Promise<boolean> {
    let result = await new Promise<boolean>((resolve, reject) => {
        svn.info(
            wc,
            {},
            (error: Error, result: any) => {
                console.log("--", error, result)
                resolve(error == null)
            }
        )
    })
    console.log("wc:", wc, result);
    return result;
}

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
export default async function commitTest() {
    console.log("commitTest()")

    // FIXME: Rewrite with filter/map
    let folders: string[] = [];
    for (let folder of vscode.workspace.workspaceFolders || []) {
        let result = await is_svn_workspace(folder.uri.fsPath);
        console.log(folder.name, ":", result);
        if (result)
            folders.push(folder.name);
    }

    if (folders.length == 0) {
        vscode.window.showWarningMessage('No svn folder exists');
        return;
    }
    let folder = folders[0];
    if (folders.length > 1) {
        let pick = await vscode.window.showQuickPick(
            folders,
            { placeHolder: "Pick a folder" }
        );
        if (!pick)
            return
        folder = pick
    }

    console.log("Go for ${folder}!", folder);

    /*
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
                    name: 'mainline/commit_test',
                    parameters: { patch: fs.createReadStream('/home/zigman/Downloads/disable-cg.1.patch'), mail: 'jy.hsu@realtek.com' }
                },
                callback
            )
            console.log(response)
            vscode.window.showInformationMessage('OK, we are good to go');
        } catch (error) {
            console.error(error)
            vscode.window.showWarningMessage('Oops, the required job is not found');
        }
    
        console.log("OK")
    */
}
