//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import { URL } from 'url';
import * as vscode from 'vscode';

let jenkins = require('jenkins')

// project
import * as workspace from './workspace'

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
export default async function verifyEnvironment() {
    console.log("verifyEnvironment()");

    // Get user acount if supplied
    // FIXME: Handle multi-folder workspace
    let folder = await workspace.selectFolder();
    if (folder == null) {
        vscode.window.showWarningMessage("No workspace folder selected");
        return;
    }

    let config = vscode.workspace.getConfiguration(
        "commit-test.jenkins",
        folder.folder
    );
    let user = config.get<string>("account.user");
    let password = config.get<string>("account.password");
    let host = config.get<string>("hostAddress");
    let job = config.get<string>("jobName");

    if (!host) {
        vscode.window.showErrorMessage('Missing host URL');
        return
    }

    if (!user || !password) {
        vscode.window.showErrorMessage('Missing username/password');
        return
    }

    let url = new URL(host);
    url.username = encodeURIComponent(user);
    url.password = encodeURIComponent(password);

    try {
        // FIXME: Move these to jenkins.ts
        let jenkinsInstance = jenkins({
            baseUrl: url.href,
            crumbIssuer: true,
            formData: require('form-data'),
            promisify: true
        })
        let response = await jenkinsInstance.job.get('mainline/commit_test')
        console.log(response)
        vscode.window.showInformationMessage('OK, we are good to go');
    } catch (error) {
        console.error(error)
        vscode.window.showWarningMessage('The environment is not ready');
    }
}
