import { URL } from 'url';
import * as vscode from 'vscode';

let jenkins = require('jenkins')

//------------------------------------------------------------------------------
export default async function verifyEnvironment() {
    console.log("verifyEnvironment()")

    // Get user acount if supplied
    // FIXME: Handle multi-folder workspace
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
    if(user)
        url.username = user
    if(password)
        url.password = password

    try {
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
        vscode.window.showWarningMessage('Oops, the required job is not found');
    }

    console.log("OK")
}
