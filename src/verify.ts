/*
let jenkins = require('jenkins')({
    baseUrl: "http://jy.hsu:maru27!$@172.26.6.130:8080",
    crumbIssuer: true,
    formData: require('form-data')
})

let callback = (err: Error, data: string) => {
    if (err) console.error(err);
    console.log(data)
}
*/

/*
jenkins.info((err: Error, data: string) => {
    if(err) console.error(err);
    console.log(data);
})
jenkins.job.get('sandbox', (err: Error, data: string) => {
    if (err) console.error(err);
    console.log(data);
})
jenkins.build.get('sandbox', 2083, (err: Error, data: string) => {
    if (err) console.error(err);
    console.log(data);
})
*/

/*
let fs = require('fs')
console.log(process.cwd())
//let p = new Map([['ss', 'aa']])
jenkins.job.build(
    {
        name: 'mainline/commit_test',
        //parameters: { file: fs.createReadStream('package.json') }
        parameters: {patch: fs.createReadStream('/home/zigman/Downloads/disable-cg.1.patch'), mail: 'jy.hsu@realtek.com'}
    },
    callback
)
*/

import { URL } from 'url';
import * as vscode from 'vscode';

let jenkins = require('jenkins')

//------------------------------------------------------------------------------
export default async function verifyEnvironment() {
    console.log("verifyEnvironment()")

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
