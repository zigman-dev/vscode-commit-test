//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import * as vscode from 'vscode';
import svn from './svn';

//------------------------------------------------------------------------------
//  functions
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
export default { selectFolder };

//------------------------------------------------------------------------------
async function selectFolder(
    requireSvnWorkspace: boolean = false
): Promise<vscode.WorkspaceFolder | null> {

    // FIXME: Rewrite with filter/map
    let folders: vscode.WorkspaceFolder[] = [];
    for (let folder of vscode.workspace.workspaceFolders || []) {
        let result = !requireSvnWorkspace || await svn.is_workspace(folder.uri.fsPath);
        console.log(folder.name, ":", result);
        if (result)
            folders.push(folder);
    }

    if (folders.length == 0)
        return null;

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
            return null
        folder = pick.folder
    }

    console.log(`folder: ${folder.name}`);
    return folder;
}
